import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { requireActiveTenant,AccessError } from '../identity/authorization.js';
import { RoutingIdentityPort,type RoutingPrincipal } from '../identity/routing-port.js';
import { uuid } from '../identity/admin.js';
import { permits,fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import { AgentConversationPort } from '../conversation/agent-port.js';
import { conversation } from '../conversation/domain.js';
import { Routing } from './routing.js';
import { AgentCapacity } from './capacity.js';
import { releaseExecution } from './cancellation.js';
import { unavailableSessions,type ChatflowSessionPort,type SessionSnapshot } from './session-port.js';
import { DeterministicMock,hash,result,draft,tools,validateRequest,type ToolCall,type RuntimeRequest,type RuntimeAdapter } from './protocol.js';
const json=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const terminal=(status:string)=>!['queued','running'].includes(status);
function policyHash(p:RoutingPrincipal){return hash({id:p.policyId,version:p.policyVersion,actions:p.actions,tools:p.tools,timeout:p.timeoutMs,max:p.maxToolCalls,adapter:p.runtimeAdapter});}
export class AgentExecutions {
  private readonly inflight=new Map<string,Promise<void>>();
  readonly uow:UnitOfWork;private readonly identity=new RoutingIdentityPort();private readonly conversations=new AgentConversationPort();private readonly capacity=new AgentCapacity();private readonly commands=new DurableCommands();private readonly routing:Routing;
  constructor(private readonly source:DataSource,private readonly sessions:ChatflowSessionPort=unavailableSessions,private readonly adapter:RuntimeAdapter=new DeterministicMock()){this.uow=new UnitOfWork(source);this.routing=new Routing(source);}
  private async live(s:TransactionScope,snapshot:SessionSnapshot,message:string){
    const p=await this.identity.principal(s,snapshot.principalId,true);
    if(!p||p.kind!=='ai'||!p.available||p.runtimeAdapter!=='mock'||!p.policyId||p.timeoutMs<1||p.timeoutMs>30000||p.maxToolCalls<1||p.maxToolCalls>5)throw new CommandError(403,'RUNTIME_AUTH_REVOKED');
    const a=await withFieldPolicies(s,p.access),c=await this.conversations.bound(s,snapshot.conversationId,message,a);
    if(c.record.ownerPrincipalId!==p.id||c.record.ownerRevision!==snapshot.ownerRevision)throw new CommandError(409,'RUNTIME_OWNER_CHANGED');
    if(await this.routing.eligibility(s,c.record,p.id,c.record.teamId,false))throw new CommandError(403,'RUNTIME_AUTH_REVOKED');
    const service=await this.identity.service(s,snapshot.serviceActorId);if(!permits(service,'conversation','read',c.record)||!permits(service,'conversation','assign',c.record))throw new CommandError(403,'RUNTIME_AUTH_REVOKED');
    if(!Array.isArray(snapshot.allowedTools)||snapshot.allowedTools.length>4||new Set(snapshot.allowedTools).size!==snapshot.allowedTools.length||snapshot.allowedTools.some(t=>!tools.includes(t)||!p.tools.includes(t)))throw new CommandError(403,'TOOL_FORBIDDEN');
    return {p,a,c,service};
  }
  async start(s:TransactionScope,sessionId:string,messageId:string,actionKey:string){
    if(!uuid(sessionId)||!uuid(messageId)||typeof actionKey!=='string'||! /^[\x21-\x7e]{1,128}$/.test(actionKey))throw new CommandError(400,'INVALID_REQUEST');
    await requireActiveTenant(s,true);const session=await this.sessions.load(s,sessionId,messageId);this.snapshot(session,sessionId);const live=await this.live(s,session,messageId);
    const request={message_id:messageId,node:session.node,instruction:session.instruction,allowed_tools:session.allowedTools},digest=hash(request);
    const [old]=await s.query('SELECT id,request_hash,status FROM agent_execution WHERE tenant_id=? AND session_id=? AND action_key=?',[s.context.tenantId,sessionId,actionKey]);if(old){if(old.request_hash!==digest)throw new CommandError(409,'EXECUTION_CONFLICT');return {id:old.id,status:old.status};}
    if(session.status!=='running')throw new CommandError(409,'SESSION_NOT_AVAILABLE');
    const id=randomUUID();await s.query("INSERT INTO agent_execution(id,tenant_id,session_id,conversation_id,principal_id,service_actor_id,action_key,request_hash,owner_revision,auth_revision,service_revision,policy_id,policy_version,policy_digest,status,request,queued_until,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'queued',?,TIMESTAMPADD(SECOND,30,UTC_TIMESTAMP(6)),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id,s.context.tenantId,sessionId,session.conversationId,session.principalId,session.serviceActorId,actionKey,digest,session.ownerRevision,live.p.access.revision,live.service.revision,live.p.policyId,live.p.policyVersion,policyHash(live.p),JSON.stringify(request)]);
    await this.commands.systemAudit(s,id,'agent_execution',id,'runtime.queue',['status']);return {id,status:'queued'};
  }
  private snapshot(session:SessionSnapshot,id:string){if(!['running','paused_human','completed','failed','cancelled'].includes(session.status)||session.id!==id||![session.conversationId,session.principalId,session.serviceActorId].every(uuid)||! /^[1-9][0-9]{0,19}$/.test(session.ownerRevision)||! /^[a-zA-Z0-9_.:-]{1,64}$/.test(session.node)||!['ask_need','ask_contact_method','confirm_contact_permission'].includes(session.instruction))throw new CommandError(422,'SESSION_INVALID');}
  private async lock(s:TransactionScope,id:string){
    // Stable tenant lock before all cross-module locks, including cancellation.
    await s.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[s.context.tenantId]);
    const [candidate]=await s.query('SELECT conversation_id FROM agent_execution WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);if(!candidate)throw new CommandError(404,'NOT_FOUND');await conversation(s,candidate.conversation_id,true);
    const [row]=await s.query('SELECT *,queued_until<=UTC_TIMESTAMP(6) queue_expired,expires_at<=UTC_TIMESTAMP(6) expired FROM agent_execution WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);return row;
  }
  private async guard(s:TransactionScope,row:any){
    await requireActiveTenant(s,true);const request=json(row.request),session=await this.sessions.load(s,row.session_id,request.message_id);this.snapshot(session,row.session_id);
    if(session.status!=='running')throw new CommandError(409,'SESSION_NOT_AVAILABLE');
    if(session.conversationId!==row.conversation_id||session.principalId!==row.principal_id||session.serviceActorId!==row.service_actor_id||session.ownerRevision!==String(row.owner_revision)||hash({message_id:request.message_id,node:session.node,instruction:session.instruction,allowed_tools:session.allowedTools})!==row.request_hash)throw new CommandError(409,'RUNTIME_OWNER_CHANGED');
    const live=await this.live(s,session,request.message_id);if(live.p.access.revision!==String(row.auth_revision)||live.service.revision!==String(row.service_revision)||policyHash(live.p)!==row.policy_digest)throw new CommandError(403,'RUNTIME_AUTH_REVOKED');return {...live,session,request};
  }
  private async finish(s:TransactionScope,row:any,status:string,code:string|null,attention=false){
    await s.query('UPDATE agent_execution SET status=?,error_code=?,attention=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[status,code,attention?1:0,s.context.tenantId,row.id]);await releaseExecution(s,row.id);await this.commands.systemAudit(s,row.id,'agent_execution',row.id,`runtime.${status}`,['status','error_code']);
  }
  private async handoff(s:TransactionScope,row:any,reason:string){
    // A stale failure may never replace a newer owner. Preserve draft in session port.
    const c=await conversation(s,row.conversation_id,true);if(c.row.status==='closed'||c.record.ownerPrincipalId!==row.principal_id||c.record.ownerRevision!==String(row.owner_revision))return;
    // Validate before any session effect; failed authorization keeps persisted attention.
    try{await requireActiveTenant(s,true);const service=await this.identity.service(s,row.service_actor_id);if(!permits(service,'conversation','read',c.record)||!permits(service,'conversation','assign',c.record))return;}catch(e){if(e instanceof Error&&['FORBIDDEN'].includes(e.message))return;throw e;}
    await this.sessions.handoff(s,row.session_id,reason);
    if(c.record.teamId)await this.routing.routeService(s,row.service_actor_id,c.record.id,c.record.version,c.record.teamId,'chat','human',row.id);
  }
  async claim(tenant:string,id:string):Promise<RuntimeRequest|null>{return this.uow.run({tenantId:tenant},async s=>{
    const row=await this.lock(s,id);if(row.status!=='queued')return null;
    let live;try{live=await this.guard(s,row);}catch(e){if(!(e instanceof AccessError)&&(!(e instanceof CommandError)||!['RUNTIME_AUTH_REVOKED','RUNTIME_OWNER_CHANGED','TOOL_FORBIDDEN','SESSION_NOT_AVAILABLE'].includes(e.code)))throw e;await this.finish(s,row,'cancelled',e instanceof CommandError?e.code:'RUNTIME_AUTH_REVOKED',true);return null;}
    if(Number(row.queue_expired)===1){await this.finish(s,row,'timed_out','CAPACITY_TIMEOUT',true);await this.handoff(s,row,'CAPACITY_TIMEOUT');return null;}
    if(!await this.capacity.reserve(s,row.principal_id,row.id,live.p.timeoutMs))return null;
    const token=randomUUID();await s.query("UPDATE agent_execution SET status='running',dispatch_token=?,expires_at=(SELECT expires_at FROM agent_capacity_slot WHERE tenant_id=? AND execution_id=?),updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[token,tenant,id,tenant,id]);
    const [clock]=await s.query("SELECT DATE_FORMAT(expires_at,'%Y-%m-%dT%H:%i:%s.%fZ') deadline FROM agent_execution WHERE tenant_id=? AND id=?",[tenant,id]);
    const context=await this.conversations.context(s,row.conversation_id,live.a,live.c.row.contact_id),qualification=Object.fromEntries(Object.entries(draft(Object.fromEntries(Object.entries(live.session.qualification).filter(([k])=>['service_interest','need_summary','preferred_contact_method','phone'].includes(k))))).filter(([k])=>fieldAllowed(live.a,'lead',k,'read')&&fieldAllowed(live.a,'lead','qualification','read')));
    const request:RuntimeRequest={execution_id:id,tenant_id:tenant,principal_id:row.principal_id,conversation_id:row.conversation_id,session_id:row.session_id,owner_revision:String(row.owner_revision),auth_revision:String(row.auth_revision),policy:{policy_id:row.policy_id,version:String(row.policy_version),allowed_tools:live.request.allowed_tools,max_tool_calls:live.p.maxToolCalls,timeout_ms:live.p.timeoutMs},context:{...context,qualification,...await this.identity.locale(s)},input:{message_id:live.request.message_id,instruction:live.request.instruction,current_node:live.request.node},deadline_at:clock.deadline,correlation_id:id};
    await this.commands.systemAudit(s,id,'agent_execution',id,'runtime.start',['status']);return request;
  });}
  private authorizeTool(a:Access,c:any,p:RoutingPrincipal,call:ToolCall,allowed:string[]){
    if(!allowed.includes(call.tool)||!p.tools.includes(call.tool))throw new CommandError(403,'TOOL_FORBIDDEN');
    if(call.tool==='qualification.save'){
      if(!p.actions.includes('lead.create')||!p.actions.includes('lead.qualify')||!allows(a,'lead','create',c.record)||!allows(a,'lead','qualify',c.record))throw new CommandError(403,'TOOL_FORBIDDEN');
      if(!fieldAllowed(a,'lead','qualification','write')||!fieldAllowed(a,'lead','qualification','read')||Object.keys(call.arguments.qualification as object).some(k=>!fieldAllowed(a,'lead',k,'write')||!fieldAllowed(a,'lead',k,'read')))throw new CommandError(403,'TOOL_FORBIDDEN');
    }
    if(call.tool==='crm.read_contact'&&(!p.actions.includes('contact.read')||call.arguments.contact_id!==c.row.contact_id))throw new CommandError(403,'TOOL_FORBIDDEN');
    if(call.tool==='routing.request_human'&&!p.actions.includes('routing.request_human'))throw new CommandError(403,'TOOL_FORBIDDEN');
  }
  async accept(tenant:string,id:string,token:string,value:unknown){return this.uow.run({tenantId:tenant},async s=>{
    const row=await this.lock(s,id);if(row.status!=='running'||row.dispatch_token!==token){await this.commands.systemAudit(s,id,'agent_execution',id,'runtime.late_result',[]);return {terminal:true,results:[]};}
    if(Number(row.expired)===1)throw new CommandError(409,'RUNTIME_DEADLINE');const live=await this.guard(s,row),output=result(value,id),results:{call_id:string;result:Record<string,unknown>}[]=[];
    if(output.status==='tool_calls'){
      const [count]=await s.query('SELECT COUNT(*) n FROM tool_execution WHERE tenant_id=? AND agent_execution_id=?',[tenant,id]);let added=0;
      for(const call of output.tool_calls!){this.authorizeTool(live.a,live.c,live.p,call,live.request.allowed_tools);const [old]=await s.query('SELECT * FROM tool_execution WHERE tenant_id=? AND agent_execution_id=? AND call_id=?',[tenant,id,call.call_id]);const digest=hash({tool:call.tool,arguments:call.arguments});
        if(old){if(old.args_hash!==digest)throw new CommandError(409,'TOOL_CALL_CONFLICT');const replay=call.tool==='crm.read_contact'?await this.conversations.contact(s,live.c.row.contact_id,live.a):json(old.result);results.push({call_id:call.call_id,result:replay});continue;}
        if(Number(count.n)+ ++added>live.p.maxToolCalls)throw new CommandError(422,'TOOL_LIMIT');let value:Record<string,unknown>;
        await s.query("INSERT INTO tool_execution(tenant_id,agent_execution_id,call_id,tool,args_hash,status,created_at) VALUES (?,?,?,?,?,'pending',UTC_TIMESTAMP(6))",[tenant,id,call.call_id,call.tool,digest]);
        if(call.tool==='crm.read_contact')value=await this.conversations.contact(s,live.c.row.contact_id,live.a);
        else if(call.tool==='qualification.save'){await this.sessions.saveDraft(s,row.session_id,draft(call.arguments.qualification));value={saved:true};}
        else if(call.tool==='conversation.propose_reply'){await this.sessions.proposeReply(s,row.session_id,String(call.arguments.text));value={proposed:true};}
        else {value={handoff_required:true};}
        await s.query("UPDATE tool_execution SET result=?,status='completed' WHERE tenant_id=? AND agent_execution_id=? AND call_id=?",[JSON.stringify(value),tenant,id,call.call_id]);results.push({call_id:call.call_id,result:value});
      }
      // Check DB time after ports, before commit: slow port must not sneak past deadline.
      const [clock]=await s.query('SELECT expires_at>UTC_TIMESTAMP(6) live FROM agent_execution WHERE tenant_id=? AND id=?',[tenant,id]);if(Number(clock.live)!==1)throw new CommandError(409,'RUNTIME_DEADLINE');
      if(output.tool_calls!.some(c=>c.tool==='routing.request_human')){await this.finish(s,row,'completed',null,true);await this.handoff(s,row,'REQUEST_HUMAN');return {terminal:true,results};}
      await this.commands.systemAudit(s,id,'agent_execution',id,'runtime.tools',['tool_calls']);return {terminal:false,results};
    }
    if(output.status==='failed')throw new CommandError(422,'MOCK_FAILURE');
    if(output.status==='handoff_required'){await this.finish(s,row,'completed',null,true);await this.handoff(s,row,'REQUEST_HUMAN');return {terminal:true,results};}
    if(output.proposed_reply!==undefined)await this.sessions.proposeReply(s,row.session_id,output.proposed_reply);await this.sessions.complete(s,row.session_id,id);
    const [clock]=await s.query('SELECT expires_at>UTC_TIMESTAMP(6) live FROM agent_execution WHERE tenant_id=? AND id=?',[tenant,id]);if(Number(clock.live)!==1)throw new CommandError(409,'RUNTIME_DEADLINE');
    await s.query('UPDATE agent_execution SET result=? WHERE tenant_id=? AND id=?',[JSON.stringify(output),tenant,id]);await this.finish(s,row,'completed',null);return {terminal:true,results};
  });}
  async fail(tenant:string,id:string,token:string,code:string){
    const safe=['RUNTIME_DEADLINE','RUNTIME_AUTH_REVOKED','RUNTIME_OWNER_CHANGED','TOOL_FORBIDDEN','TOOL_CALL_CONFLICT','TOOL_LIMIT','RUNTIME_PROTOCOL_INVALID','MOCK_FAILURE','RUNTIME_FAILURE','SESSION_NOT_AVAILABLE'].includes(code)?code:'RUNTIME_FAILURE';
    return this.uow.run({tenantId:tenant},async s=>{const row=await this.lock(s,id);if(terminal(row.status)||row.dispatch_token!==token)return;
      const cancelled=['RUNTIME_AUTH_REVOKED','RUNTIME_OWNER_CHANGED','SESSION_NOT_AVAILABLE'].includes(safe);await this.finish(s,row,cancelled?'cancelled':safe==='RUNTIME_DEADLINE'?'timed_out':'failed',safe,true);if(!cancelled)await this.handoff(s,row,safe);
    });
  }
  async run(tenant:string,id:string){
    const request=await this.claim(tenant,id);if(!request)return;
    const [row]=await this.source.query('SELECT dispatch_token FROM agent_execution WHERE tenant_id=? AND id=?',[tenant,id]);const token=row.dispatch_token;
    let results:{call_id:string;result:Record<string,unknown>}[]=[];
    try{for(let round=0;round<7;round++){
      const active=await this.uow.run({tenantId:tenant},async s=>{const current=await this.lock(s,id);if(current.status!=='running'||current.dispatch_token!==token)return false;if(Number(current.expired)===1)throw new CommandError(409,'RUNTIME_DEADLINE');const live=await this.guard(s,current);const context=await this.conversations.context(s,current.conversation_id,live.a,live.c.row.contact_id);for(const item of results){const [tool]=await s.query('SELECT tool FROM tool_execution WHERE tenant_id=? AND agent_execution_id=? AND call_id=?',[tenant,id,item.call_id]);if(tool?.tool==='crm.read_contact')item.result=await this.conversations.contact(s,live.c.row.contact_id,live.a);}
      request.context={...context,qualification:Object.fromEntries(Object.entries(live.session.qualification).filter(([k])=>['service_interest','need_summary','preferred_contact_method','phone'].includes(k)&&fieldAllowed(live.a,'lead',k,'read')&&fieldAllowed(live.a,'lead','qualification','read'))),...await this.identity.locale(s)};return true;});if(!active)return;
      const remaining=Date.parse(request.deadline_at)-Date.now();if(remaining<=0)throw new CommandError(409,'RUNTIME_DEADLINE');let timer:ReturnType<typeof setTimeout>|undefined;
      try{const output=await Promise.race([(validateRequest(request),this.adapter.execute(structuredClone(request),structuredClone(results))),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new CommandError(409,'RUNTIME_DEADLINE')),remaining);})]);const accepted=await this.accept(tenant,id,token,output);if(accepted.terminal)return;results=accepted.results;}finally{clearTimeout(timer);}
    }throw new CommandError(422,'TOOL_LIMIT');}catch(e){await this.fail(tenant,id,token,e instanceof CommandError?e.code:e instanceof AccessError?'RUNTIME_AUTH_REVOKED':'RUNTIME_FAILURE');}
  }
  async cancelExternal(){
    const rows=await this.source.query("SELECT tenant_id,id,error_code FROM agent_execution WHERE status IN ('cancelled','timed_out','failed') AND cancel_ack=0 AND cancel_attempts<3 ORDER BY updated_at LIMIT 25");
    for(const row of rows){const update=await this.source.query('UPDATE agent_execution SET cancel_attempts=cancel_attempts+1 WHERE tenant_id=? AND id=? AND cancel_ack=0 AND cancel_attempts<3',[row.tenant_id,row.id]);if(!update.affectedRows)continue;let timer:ReturnType<typeof setTimeout>|undefined;
      try{await Promise.race([this.adapter.cancel(row.id,row.error_code??'CANCELLED'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),1000);})]);await this.source.query('UPDATE agent_execution SET cancel_ack=1 WHERE tenant_id=? AND id=?',[row.tenant_id,row.id]);}catch{/* Best effort, no raw adapter error logs. */}finally{clearTimeout(timer);}
    }
  }
  async revoke(s:TransactionScope,principal:string){
    await s.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[s.context.tenantId]);const rows=await s.query("SELECT id FROM agent_execution WHERE tenant_id=? AND principal_id=? AND status IN ('queued','running') ORDER BY conversation_id,id",[s.context.tenantId,principal]);
    for(const candidate of rows){const row=await this.lock(s,candidate.id);if(terminal(row.status))continue;try{await this.guard(s,row);}catch(e){if(!(e instanceof AccessError)&&!(e instanceof CommandError))throw e;await this.finish(s,row,'cancelled','RUNTIME_AUTH_REVOKED',true);}}
  }
  async drain(){await Promise.all(this.inflight.values());}
  async tick(){
    const expired=await this.source.query("SELECT tenant_id,id,dispatch_token FROM agent_execution WHERE status='running' AND expires_at<=UTC_TIMESTAMP(6) ORDER BY expires_at LIMIT 25");for(const row of expired)await this.fail(row.tenant_id,row.id,row.dispatch_token,'RUNTIME_DEADLINE');
    const queued=await this.source.query("SELECT tenant_id,id FROM agent_execution WHERE status='queued' ORDER BY created_at,id LIMIT 25");await this.cancelExternal();for(const row of queued){if(this.inflight.size>=4)break;const key=row.tenant_id+':'+row.id;if(this.inflight.has(key))continue;const task=this.run(row.tenant_id,row.id).catch(()=>{console.warn('AGENT_EXECUTION_TICK_FAILED');}).finally(()=>this.inflight.delete(key));this.inflight.set(key,task);}
  }
}
