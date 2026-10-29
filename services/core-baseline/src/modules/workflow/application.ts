import { page } from '../operations/paging.js';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { workflowActor,workflowIdentityOptions } from '../identity/workflow-port.js';
import { RoutingIdentityPort } from '../identity/routing-port.js';
import { permits,type Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { object,validKey } from '../crm/properties.js';
import { withFieldPolicies } from '../crm/access.js';
import { ChannelReferences } from '../channels/ports.js';
import { WorkflowEngine,json } from './engine.js';
import { validateGraph } from './graph.js';
import type { WorkflowChildren } from './ports.js';
import type { WorkflowChatPort } from './chat-port.js';
export type Operation='create'|'version'|'publish'|'enable'|'cancel';
export class Workflows {
  readonly engine:WorkflowEngine;readonly auth:IdentityAuthorization;private readonly commands=new DurableCommands();
  constructor(source:DataSource,children?:WorkflowChildren,chat?:WorkflowChatPort){this.engine=new WorkflowEngine(source,children,chat);this.auth=new IdentityAuthorization(this.engine.uow);}
  private permission(a:Access,action:string){if(!permits(a,'automation',action))throw new CommandError(403,'FORBIDDEN');}
  private async definition(s:TransactionScope,id:string){const [d]=await s.query('SELECT * FROM workflow_definition WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);if(!d)throw new CommandError(404,'NOT_FOUND');return d;}
  private async readableRun(s:TransactionScope,a:Access,id:string){const [r]=await s.query('SELECT * FROM workflow_run WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);if(!r)throw new CommandError(404,'NOT_FOUND');const record=await this.engine.chat.readable(a,json(r.context).trigger.aggregate_id);if(!permits(a,'automation','read',record))throw new CommandError(404,'NOT_FOUND');return r;}
  validate(account:string,tenant:string,body:unknown){return this.auth.runHuman(account,tenant,async(_s,a)=>{this.permission(a,'design');const b=object(body,['graph']),graph=validateGraph(b.graph);return {data:{valid:true,node_count:graph.nodes.length}};});}
  authoring(account:string,tenant:string){return this.auth.runHuman(account,tenant,async(s,a)=>{
    this.permission(a,'design');const identity=await workflowIdentityOptions(s),connections=await new ChannelReferences().workflowOptions(s);
    if([identity.actors,identity.teams,connections].some(rows=>rows.length>200))throw new CommandError(422,'CATALOG_LIMIT_EXCEEDED');
    return {data:{...identity,connections}};
  });}
  read(account:string,tenant:string,kind:'definitions'|'definition'|'versions'|'run',id?:string,limit=50,after=''){return this.auth.runHuman(account,tenant,async(s,raw)=>{
    const a=await withFieldPolicies(s,raw);if(!Number.isInteger(limit)||limit<1||limit>100)throw new CommandError(400,'INVALID_REQUEST');
    if(kind==='run'){const r=await this.readableRun(s,a,id!);return {data:{id:r.id,definition_id:r.definition_id,version_id:r.version_id,status:r.status,current_node:r.current_node,error_code:r.error_code,attention:!!r.attention,cancel_pending:!!r.cancel_pending,steps:await s.query('SELECT node_key,status,attempt,error_code FROM workflow_step_run WHERE tenant_id=? AND run_id=? ORDER BY node_key',[tenant,id]),waits:await s.query('SELECT node_key,kind,status,resume_at FROM workflow_wait WHERE tenant_id=? AND run_id=? ORDER BY node_key',[tenant,id])}};}
    this.permission(a,'design');if(kind==='versions'){await this.definition(s,id!);return {data:(await s.query('SELECT id,number,state,graph,execution_role_id FROM workflow_version WHERE tenant_id=? AND definition_id=? ORDER BY number DESC LIMIT ?',[tenant,id,limit])).map((v:any)=>({...v,graph:json(v.graph)}))};}
    if(kind==='definition'){const d=await this.definition(s,id!);return {data:{id:d.id,key:d.key,name:d.name,service_actor_id:d.service_actor_id,active_version_id:d.active_version_id,enabled:!!d.enabled,version:String(d.version)}};}
    if(after&&!uuid(after))throw new CommandError(400,'INVALID_REQUEST');
    const rows=await s.query('SELECT id,`key`,name,service_actor_id,active_version_id,enabled,version FROM workflow_definition WHERE tenant_id=? AND id>? ORDER BY id LIMIT ?',[tenant,after,limit+1]);
    return {data:rows.slice(0,limit).map((d:any)=>({...d,enabled:!!d.enabled,version:String(d.version)})),next_cursor:rows.length>limit?rows[limit-1].id:null};
  });}
  listRuns(account:string,tenant:string,query:Record<string,unknown>){return this.auth.runHuman(account,tenant,async(s,raw)=>{
    const a=await withFieldPolicies(s,raw),{limit,cursor}=page(query);if(!a.grants.some(g=>g.resource==='automation'&&g.action==='read')||!a.capabilities.includes('read'))throw new CommandError(403,'FORBIDDEN');const rows=await s.query('SELECT id,status,current_node,attention,started_at,context FROM workflow_run WHERE tenant_id=? AND id>? ORDER BY id LIMIT 201',[tenant,cursor]),data=[];let scanned=cursor;
    for(const r of rows.slice(0,200)){scanned=r.id;const cid=json(r.context).trigger.aggregate_id;try{const record=await this.engine.chat.readable(a,cid);if(!permits(a,'automation','read',record))continue;data.push({id:r.id,status:r.status,current_node:r.current_node,attention:!!r.attention,started_at:new Date(r.started_at).toISOString(),conversation_id:cid});}catch(e){if(!(e instanceof CommandError&&[403,404].includes(e.status)))throw e;}if(data.length===limit)break;}
    return {data,next_cursor:rows.some((r:any)=>r.id>scanned)?scanned:null};
  });}
  mutate(account:string,tenant:string,op:Operation,body:unknown,key:string,correlation:string,id?:string,number?:number,version?:string){return this.engine.uow.run({tenantId:tenant},async s=>{const a=await this.auth.loadHuman(s,account,undefined,true);
    this.permission(a,op==='publish'?'publish':op==='cancel'?'operate':'design');
    if(typeof key!=='string'||!key.trim()||key.length>128||id!==undefined&&!uuid(id))throw new CommandError(400,'INVALID_REQUEST');
    const b=object(body,op==='create'?['key','name','service_actor_id']:op==='version'?['graph','execution_role_id']:op==='enable'?['enabled']:op==='cancel'?['reason']:[]);
    if(op==='cancel'){if(b.reason!=='operator_cancelled')throw new CommandError(400,'INVALID_REQUEST');await this.readableRun(s,await withFieldPolicies(s,a),id!);}
    const command={actorId:a.principalId,correlationId:correlation,route:`workflow:${op}:${id??''}:${number??''}`,key,body,version};
    const replay=await this.commands.replay(s,command,async()=>{});if(replay)return replay;
    let data:Record<string,unknown>;
    if(op==='create'){
      if(!validKey(b.key)||typeof b.name!=='string'||!b.name.trim()||b.name.length>255||!uuid(b.service_actor_id))throw new CommandError(422,'VALIDATION_FAILED');await workflowActor(s,b.service_actor_id);
      if((await s.query('SELECT id FROM workflow_definition WHERE tenant_id=? AND `key`=?',[tenant,b.key])).length)throw new CommandError(409,'WORKFLOW_KEY_EXISTS');
      const created=randomUUID();await s.query('INSERT INTO workflow_definition(id,tenant_id,`key`,name,service_actor_id) VALUES (?,?,?,?,?)',[created,tenant,b.key,b.name,b.service_actor_id]);data={id:created,version:'1'};
    }else if(op==='cancel'){const status=await this.engine.cancel(s,id!);data={id,status};}
    else{
      const d=await this.definition(s,id!);
      if(['publish','enable'].includes(op)){if(!version)throw new CommandError(428,'VERSION_REQUIRED');if(String(d.version)!==version)throw new CommandError(409,'VERSION_CONFLICT');}
      if(op==='version'){
        const graph=validateGraph(b.graph);if(!uuid(b.execution_role_id))throw new CommandError(422,'VALIDATION_FAILED');await workflowActor(s,d.service_actor_id,b.execution_role_id);
        const [last]=await s.query('SELECT COALESCE(MAX(number),0)+1 n FROM workflow_version WHERE tenant_id=? AND definition_id=?',[tenant,id]);const vid=randomUUID();await s.query("INSERT INTO workflow_version(id,tenant_id,definition_id,number,graph,execution_role_id,state) VALUES (?,?,?,?,?,?,'draft')",[vid,tenant,id,last.n,JSON.stringify(graph),b.execution_role_id]);data={id:vid,number:Number(last.n),state:'draft',definition_version:String(d.version)};
      }else{
        if(op==='enable'){if(typeof b.enabled!=='boolean'||b.enabled&&!d.active_version_id)throw new CommandError(422,'VALIDATION_FAILED');await s.query('UPDATE workflow_definition SET enabled=?,version=version+1 WHERE tenant_id=? AND id=?',[b.enabled,tenant,id]);}
        else{
          const [v]=await s.query('SELECT * FROM workflow_version WHERE tenant_id=? AND definition_id=? AND number=? FOR UPDATE',[tenant,id,number]);if(!v)throw new CommandError(404,'NOT_FOUND');if(v.state!=='draft')throw new CommandError(409,'VERSION_IMMUTABLE');
          const graph=validateGraph(json(v.graph)),actor=await workflowActor(s,d.service_actor_id,v.execution_role_id);await new ChannelReferences().connection(s,graph.trigger.connection_id);
          for(const node of graph.nodes)if(node.type==='assign_owner'||node.type==='recover_need'){await new RoutingIdentityPort().team(s,node.config.team_id);if(!permits(actor,'conversation','assign')||node.type==='recover_need'&&(!permits(actor,'conversation','update')||!permits(actor,'conversation','read')))throw new CommandError(403,'FORBIDDEN');}
          if(graph.nodes.some(n=>n.type==='read_need')&&!permits(actor,'conversation','read'))throw new CommandError(403,'FORBIDDEN');
          await this.engine.children.validate(s,graph,actor);await s.query("UPDATE workflow_version SET state='published',published_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[tenant,v.id]);await s.query('UPDATE workflow_definition SET active_version_id=?,version=version+1 WHERE tenant_id=? AND id=?',[v.id,tenant,id]);
        }data={id,version:String(BigInt(d.version)+1n)};
      }
    }
    await this.commands.audit(s,a.principalId,correlation,'workflow',String(data.id),`workflow.${op}`,Object.keys(b));const response={status:op==='create'||op==='version'?201:200,body:{data,meta:{correlation_id:correlation}}};await this.commands.complete(s,command,response);return response;
  });}
}
