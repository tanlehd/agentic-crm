import { stopSessions } from '../chatflow/lifecycle.js';
import { cancelAgentExecutions } from './cancellation.js';
import { ownershipHistory,ownedRecords } from '../crm/ownership-port.js';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization,requireActiveTenant } from '../identity/authorization.js';
import { RoutingIdentityPort } from '../identity/routing-port.js';
import { permits,fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { RecordRegistry,type RegistryRecord } from '../crm/registry.js';
import { CrmRecords } from '../crm/records.js';
import { coreDomains,contactReferences } from '../crm/core.js';
import { leadDomain,leadRoutingAction } from '../sales/leads.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import { object } from '../crm/properties.js';
import { conversationOwnership,type OwnershipChanged } from '../conversation/ownership-port.js';
import { AgentCapacity } from './capacity.js';
export function assignmentInput(input:unknown,takeover=false){
  const b=object(input,takeover?['reason']:['owner_principal_id','team_id','reason']);
  if(!(takeover?['human_takeover']:['manual','handoff']).includes(b.reason)||!takeover&&(!Object.hasOwn(b,'owner_principal_id')||b.owner_principal_id!==null&&!uuid(b.owner_principal_id))||Object.hasOwn(b,'team_id')&&b.team_id!==null&&!uuid(b.team_id))throw new CommandError(400,'INVALID_REQUEST');return b;
}
const wire=(r:RegistryRecord)=>({id:r.id,tenant_id:r.tenantId,object_key:r.objectKey,version:r.version,owner_revision:r.ownerRevision,owner_principal_id:r.ownerPrincipalId,team_id:r.teamId});
export class Routing {
  readonly uow:UnitOfWork;readonly auth:IdentityAuthorization;readonly capacity=new AgentCapacity();
  private readonly identity=new RoutingIdentityPort();private readonly commands=new DurableCommands();private readonly records:CrmRecords;private readonly registry=new RecordRegistry();
  constructor(source:DataSource,private readonly changed:OwnershipChanged=async()=>{}){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));this.records=new CrmRecords(source,'internal-routing-no-pagination',domains);}
  private authorize(a:Access,r:RegistryRecord,takeover=false){this.registry.read(a,r);if(!(r.objectKey==='conversation'?permits(a,'conversation',takeover?'takeover':'assign',r):!takeover&&allows(a,r.objectKey,'assign',r)))throw new CommandError(403,'FORBIDDEN');}
  async eligibility(s:TransactionScope,r:RegistryRecord,owner:string,team:string|null,checkCapacity=true):Promise<string|null>{
    const p=await this.identity.principal(s,owner,true);if(!p||!p.available)return 'unavailable';
    if(team&&!p.access.teamIds.includes(team))return 'team';
    const a=await withFieldPolicies(s,p.access),target={...r,ownerPrincipalId:owner,teamId:team},action=r.objectKey==='conversation'?'reply':r.objectKey==='lead'?await leadRoutingAction(s,r.id):'update';
    const capability=r.objectKey==='conversation'?'chat':r.objectKey==='lead'?'sales':null;
    if(capability?!a.capabilities.includes(capability):!a.capabilities.some(c=>['chat','sales','service'].includes(c)))return 'capability';
    if(!allows(a,r.objectKey,'read',target)||!(r.objectKey==='conversation'?permits(a,r.objectKey,action,target):allows(a,r.objectKey,action,target)))return 'role';
    const field=r.objectKey==='conversation'?'text':r.objectKey==='lead'&&action==='qualify'?'qualification':null;
    if(field&&(!fieldAllowed(a,r.objectKey,field,'read')||!fieldAllowed(a,r.objectKey,field,'write')))return 'field';
    if(p.kind==='ai'){
      const tool=r.objectKey==='conversation'?'conversation.propose_reply':r.objectKey==='lead'?'qualification.save':null;
      if(!tool||!p.tools.includes(tool)||!p.actions.includes(`${r.objectKey}.${action}`)||!p.actions.includes(`${r.objectKey}.read`))return 'policy';
      if(checkCapacity&&await this.capacity.running(s,owner)>=p.maxConcurrency)return 'capacity';
    }return null;
  }
  private async assign(s:TransactionScope,a:Access,r:RegistryRecord,version:string,owner:string|null,team:string|null,correlation:string,reason:string,takeover=false,actorKind:'human'|'service'='human'){
    await this.identity.team(s,team);if(owner&&await this.eligibility(s,r,owner,team))throw new CommandError(422,'TARGET_INELIGIBLE');
    const registry=r.objectKey==='conversation'?new RecordRegistry(new Map([['conversation',conversationOwnership(async(s,r)=>{await cancelAgentExecutions(s,r.id);await stopSessions(s,r.id);await this.changed(s,r);})]])):this.records.registry(r.objectKey,r.kind==='custom');
    const updated=await registry.assign(s,a,r.id,version,owner,team,correlation,{reason,takeover,actorKind});
    if(owner)await s.query('UPDATE routing_attention SET active=0,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=?',[s.context.tenantId,r.id]);return updated;
  }
  async mutate(account:string,tenant:string,id:string,takeover:boolean,input:unknown,key:string,version:string|undefined,correlation:string){
    if(!uuid(tenant)||!uuid(id)||typeof key!=='string'||! /^[\x21-\x7e]{1,128}$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
    if(!version)throw new CommandError(428,'PRECONDITION_REQUIRED');if(!/^[1-9][0-9]{0,19}$/.test(version))throw new CommandError(400,'INVALID_REQUEST');const b=assignmentInput(input,takeover);
    return this.uow.run({tenantId:tenant},async s=>{
      const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true)),r=await this.registry.get(s,id,true);this.authorize(a,r,takeover);
      const command={actorId:a.principalId,correlationId:correlation,route:`POST /api/v1/${takeover?'conversations':'records'}/${id}/${takeover?'takeover':'assignment'}`,key,body:b,version};
      const replay=await this.commands.replay(s,command,async()=>{this.authorize(a,r,takeover);});if(replay)return replay;
      const data=wire(await this.assign(s,a,r,version,takeover?a.principalId:b.owner_principal_id,Object.hasOwn(b,'team_id')?b.team_id:r.teamId,correlation,b.reason,takeover));
      const response={status:200,body:{data,meta:{correlation_id:correlation}}};await this.commands.complete(s,command,response);return response;
    });
  }
  async read(account:string,tenant:string,id:string,kind:'targets'|'history'){
    if(!uuid(id)||!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');
    return this.uow.run({tenantId:tenant},async s=>{
      const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true)),r=await this.registry.get(s,id);this.registry.read(a,r);
      if(!(r.objectKey==='conversation'?(permits(a,'conversation','takeover',r)||permits(a,'conversation','assign',r)):allows(a,r.objectKey,'assign',r)))throw new CommandError(403,'FORBIDDEN');
      if(kind==='history')return {data:await this.history(s,r)};
      const data=[];for(const owner of await this.identity.candidates(s,r.teamId)){const p=await this.identity.principal(s,owner),reason=await this.eligibility(s,r,owner,r.teamId);data.push({id:owner,kind:p!.kind,eligible:reason===null,reason});}return {data};
    });
  }
  private async history(s:TransactionScope,r:RegistryRecord){return ownershipHistory(s,r.id);}
  // Authenticated application port, no caller-provided SQL or public routing endpoint.
  async route(s:TransactionScope,a:Access,id:string,version:string,team:string,capability:'chat'|'sales',preference:'human'|'ai'|'any',correlation:string,actorKind:'human'|'service'='human'){
    if(a.tenantId!==s.context.tenantId||!uuid(team)||!['chat','sales'].includes(capability)||!['human','ai','any'].includes(preference))throw new CommandError(400,'INVALID_REQUEST');
    const r=await this.registry.get(s,id,true);this.authorize(a,r);if(r.objectKey!==(capability==='chat'?'conversation':'lead'))throw new CommandError(422,'CAPABILITY_MISMATCH');await this.identity.team(s,team);
    await s.query('INSERT INTO routing_cursor(tenant_id,team_id,capability_key) VALUES (?,?,?) ON DUPLICATE KEY UPDATE capability_key=VALUES(capability_key)',[s.context.tenantId,team,capability]);
    const [cursor]=await s.query('SELECT last_principal_id FROM routing_cursor WHERE tenant_id=? AND team_id=? AND capability_key=? FOR UPDATE',[s.context.tenantId,team,capability]);
    const ids=await this.identity.candidates(s,team),ordered=[...ids.filter(x=>x>(cursor.last_principal_id??'')),...ids.filter(x=>x<=(cursor.last_principal_id??''))];let owner:string|null=null;
    for(const id of ordered){const p=await this.identity.principal(s,id);if((preference==='any'||p?.kind===preference)&&!await this.eligibility(s,r,id,team)){owner=id;break;}}
    const result=await this.assign(s,a,r,version,owner,team,correlation,owner?'routed':'no_eligible_principal',false,actorKind);
    if(owner)await s.query('UPDATE routing_cursor SET last_principal_id=? WHERE tenant_id=? AND team_id=? AND capability_key=?',[owner,s.context.tenantId,team,capability]);
    else await s.query("INSERT INTO routing_attention(tenant_id,record_id,reason,active,updated_at) VALUES (?,?,'no_eligible_principal',1,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE reason='no_eligible_principal',active=1,updated_at=UTC_TIMESTAMP(6)",[s.context.tenantId,id]);return wire(result);
  }
  async refreshPrincipal(s:TransactionScope,principal:string){
    await requireActiveTenant(s,true);
    for(const id of await ownedRecords(s,principal)){
      const r=await this.registry.get(s,id),reason=await this.eligibility(s,r,principal,r.teamId,false);
      if(reason)await s.query("INSERT INTO routing_attention(tenant_id,record_id,reason,active,updated_at) VALUES (?,?,'owner_ineligible',1,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE reason='owner_ineligible',active=1,updated_at=UTC_TIMESTAMP(6)",[s.context.tenantId,id]);
      else await s.query("UPDATE routing_attention SET active=0,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=? AND reason='owner_ineligible'",[s.context.tenantId,id]);
    }
  }
  async routeService(s:TransactionScope,actor:string,id:string,version:string,team:string,capability:'chat'|'sales',preference:'human'|'ai'|'any',correlation:string){await requireActiveTenant(s,true);const a=await withFieldPolicies(s,await this.identity.service(s,actor));return this.route(s,a,id,version,team,capability,preference,correlation,'service');}
}

