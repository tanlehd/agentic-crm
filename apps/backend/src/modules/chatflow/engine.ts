import { chatflowExecutionStatus } from '../agents/chatflow-port.js';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { workflowActor,lockWorkflowTenant } from '../identity/workflow-port.js';
import { RoutingIdentityPort } from '../identity/routing-port.js';
import { permits,fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { withFieldPolicies } from '../crm/access.js';
import { ChatflowConversationPort } from '../conversation/chatflow-port.js';
import { ChatflowLeads } from '../sales/chatflow-port.js';
import { AgentExecutions } from '../agents/executions.js';
import { cancelAgentExecutions } from '../agents/cancellation.js';
import { Routing } from '../agents/routing.js';
import { text as runtimeText,draft as runtimeDraft } from '../agents/protocol.js';
import type { ChatflowSessionPort,SessionSnapshot } from '../agents/session-port.js';
import type { WorkflowChildren,ChildContext } from '../workflow/ports.js';
import { chatflowParent } from '../workflow/parent-port.js';
import { validateGraph,parseAnswer,renderPrompt,type Graph,type Node } from './graph.js';
export const json=(v:any):any=>typeof v==='string'?JSON.parse(v):v;
export const active=(status:string)=>['running','waiting_message','paused_human'].includes(status);
export interface Claim {tenantId:string;sessionId:string;node:string;token:string}
export class ChatflowEngine implements ChatflowSessionPort {
  readonly uow:UnitOfWork;readonly runtime:AgentExecutions;readonly conversations=new ChatflowConversationPort();readonly leads=new ChatflowLeads();
  readonly identity=new RoutingIdentityPort();private readonly commands=new DurableCommands();private readonly routing:Routing;
  constructor(readonly source:DataSource){this.uow=new UnitOfWork(source);this.runtime=new AgentExecutions(source,this);this.routing=new Routing(source);}
  async version(s:TransactionScope,id:string){const [v]=await s.query("SELECT * FROM chatflow_version WHERE tenant_id=? AND id=? AND state='published'",[s.context.tenantId,id]);if(!v)throw new CommandError(422,'CHATFLOW_VERSION_UNAVAILABLE');return {...v,graph:validateGraph(json(v.graph))};}
  async lock(s:TransactionScope,id:string){await lockWorkflowTenant(s);const [r]=await s.query('SELECT * FROM chatflow_session WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);if(!r)throw new CommandError(404,'NOT_FOUND');return {...r,version:String(r.version),owner_revision:String(r.owner_revision),variables:json(r.variables),draft:json(r.draft),provenance:json(r.provenance),graph:(await this.version(s,r.version_id)).graph as Graph};}
  async start(s:TransactionScope,version:string,conversation:string,c:ChildContext){
    await lockWorkflowTenant(s);const role=await chatflowParent(s,c.runId,conversation,c.actorId),a=await workflowActor(s,c.actorId,role),v=await this.version(s,version),record=await this.conversations.read(s,conversation,a);
    if(record.row.status==='closed')throw new CommandError(409,'CONVERSATION_CLOSED');
    const [old]=await s.query('SELECT * FROM chatflow_session WHERE tenant_id=? AND start_action_key=?',[s.context.tenantId,c.actionKey]);
    if(old){if(old.parent_run_id!==c.runId||old.version_id!==version||old.conversation_id!==conversation)throw new CommandError(409,'CHATFLOW_START_CONFLICT');return old.id as string;}
    if((await s.query('SELECT id FROM chatflow_session WHERE tenant_id=? AND active_conversation_key=?',[s.context.tenantId,conversation])).length)throw new CommandError(409,'CHATFLOW_ALREADY_ACTIVE');
    const p=record.record.ownerPrincipalId?await this.identity.principal(s,record.record.ownerPrincipalId):null;
    const eligible=p?.kind==='ai'&&p.available&&!await this.routing.eligibility(s,record.record,p.id,record.record.teamId,false);
    const id=randomUUID();await s.query('INSERT INTO chatflow_session(id,tenant_id,version_id,parent_run_id,start_action_key,conversation_id,service_actor_id,execution_role_id,node_key,status,owner_revision) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[id,s.context.tenantId,version,c.runId,c.actionKey,conversation,c.actorId,role,v.graph.entry_node,eligible?'running':'paused_human',record.record.ownerRevision]);
    await this.commands.systemAudit(s,id,'chatflow_session',id,'chatflow.start',['version_id','status']);return id;
  }
  children():WorkflowChildren{return {
    validate:async(s,g,a)=>{for(const n of g.nodes){if(n.type==='request_lead_handoff'||n.type==='wait_event'&&n.config.event_type!=='chatflow.completed')throw new CommandError(422,'WORKFLOW_CHILD_UNAVAILABLE');if(n.type==='start_chatflow'){await this.version(s,n.config.chatflow_version_id);if(!permits(a,'conversation','read'))throw new CommandError(403,'FORBIDDEN');}}},
    execute:async(s,n,input,c)=>{if(n.type!=='start_chatflow')throw new CommandError(422,'WORKFLOW_CHILD_UNAVAILABLE');return {session_id:await this.start(s,input.chatflow_version_id,input.conversation_id,c)};},
    result:async(s,run,type,id)=>{if(type!=='chatflow.completed')throw new CommandError(422,'WORKFLOW_CHILD_UNAVAILABLE');const r=await this.lock(s,id);if(r.parent_run_id!==run)throw new CommandError(409,'CHATFLOW_PARENT_INVALID');return active(r.status)?null:{outcome:r.outcome??'needs_attention',lead_id:r.lead_id};},
    cancel:async(s,run)=>{const rows=await s.query("SELECT id FROM chatflow_session WHERE tenant_id=? AND parent_run_id=? AND status IN('running','waiting_message','paused_human')",[s.context.tenantId,run]);for(const row of rows){const r=await this.lock(s,row.id);await this.stop(s,r,'cancelled','PARENT_CANCELLED');}},
  };}
  async guard(s:TransactionScope,r:any){
    const service=await workflowActor(s,r.service_actor_id,r.execution_role_id),c=await this.conversations.read(s,r.conversation_id,service);
    await chatflowParent(s,r.parent_run_id,r.conversation_id,r.service_actor_id,true);
    if(c.row.status==='closed'||c.record.ownerRevision!==r.owner_revision||!c.record.ownerPrincipalId)throw new CommandError(409,'OWNER_CONFLICT');
    const p=await this.identity.principal(s,c.record.ownerPrincipalId,true);
    if(!p||p.kind!=='ai'||!p.available||await this.routing.eligibility(s,c.record,p.id,c.record.teamId,false))throw new CommandError(403,'CHATFLOW_OWNER_UNAVAILABLE');
    const a=await withFieldPolicies(s,p.access);if(!fieldAllowed(a,'conversation','text','read')||!permits(service,'conversation','assign',c.record))throw new CommandError(403,'FORBIDDEN');return {service,c,a,p};
  }
  async stop(s:TransactionScope,r:any,status:'paused_human'|'cancelled',reason:string){
    if(!active(r.status))return;await s.query('UPDATE chatflow_session SET status=?,error_code=?,version=version+1 WHERE tenant_id=? AND id=?',[status,reason,s.context.tenantId,r.id]);
    await s.query("UPDATE chatflow_node_run SET status='cancelled',lease_until=NULL,fencing_token=fencing_token+1 WHERE tenant_id=? AND session_id=? AND status<>'succeeded'",[s.context.tenantId,r.id]);
    await this.conversations.cancel(s,r.conversation_id);await cancelAgentExecutions(s,r.conversation_id);await this.commands.systemAudit(s,r.id,'chatflow_session',r.id,'chatflow.stop',['status','error_code']);
  }
  async handoff(s:TransactionScope,id:string,reason:string){const r=await this.lock(s,id);await this.stop(s,r,'paused_human',['REQUEST_HUMAN','RUNTIME_DEADLINE','CAPACITY_TIMEOUT'].includes(reason)?reason:'RUNTIME_REQUIRES_HUMAN');}
  private async routeHuman(s:TransactionScope,r:any,reason:string,team?:string){await this.stop(s,r,'paused_human',reason);const c=await this.conversations.read(s,r.conversation_id);if(c.record.ownerRevision!==r.owner_revision)return;const target=team??c.record.teamId;if(target){await this.identity.chatTeam(s,target);await this.routing.routeService(s,r.service_actor_id,r.conversation_id,c.record.version,target,'chat','human',r.id);}}
  async terminal(s:TransactionScope,r:any,outcome:string,actor:{kind:'human'|'service';id:string}){
    await s.query("UPDATE chatflow_session SET status='completed',outcome=?,error_code=NULL,version=version+1 WHERE tenant_id=? AND id=?",[outcome,s.context.tenantId,r.id]);
    await s.query("UPDATE chatflow_node_run SET status='succeeded',lease_until=NULL,fencing_token=fencing_token+1 WHERE tenant_id=? AND session_id=? AND status IN('pending','running','waiting')",[s.context.tenantId,r.id]);
    if(outcome!=='qualified'){await this.conversations.cancel(s,r.conversation_id);await cancelAgentExecutions(s,r.conversation_id);}
    const [saved]=await s.query('SELECT version FROM chatflow_session WHERE tenant_id=? AND id=?',[s.context.tenantId,r.id]);
    await this.commands.automationEvent(s,'chatflow.completed',r.id,String(saved.version),{session_id:r.id,parent_run_id:r.parent_run_id,outcome,lead_id:r.lead_id},actor,r.id);
    await this.commands.systemAudit(s,r.id,'chatflow_session',r.id,'chatflow.completed',['status','outcome']);
  }
  private async advance(s:TransactionScope,r:any,next:string){await s.query("UPDATE chatflow_node_run SET status='succeeded',lease_until=NULL WHERE tenant_id=? AND session_id=? AND node_key=?",[s.context.tenantId,r.id,r.node_key]);await s.query("UPDATE chatflow_session SET node_key=?,status='running',version=version+1 WHERE tenant_id=? AND id=?",[next,s.context.tenantId,r.id]);}
  private async persist(s:TransactionScope,r:any){await s.query('UPDATE chatflow_session SET variables=?,draft=?,provenance=?,last_message_id=?,lead_id=?,version=version+1 WHERE tenant_id=? AND id=?',[JSON.stringify(r.variables),JSON.stringify(r.draft),JSON.stringify(r.provenance),r.last_message_id,r.lead_id,s.context.tenantId,r.id]);}
  private evidence(r:any):string|undefined{return r.variables.contact_permission===true&&r.provenance.contact_permission?.kind==='message'?r.provenance.contact_permission.message_id:undefined;}
  async saveLead(s:TransactionScope,r:any,a:Access,complete:boolean,kind:'human'|'service'='service',disqualified=false){
    const c=await this.conversations.read(s,r.conversation_id,a);if(!c.record.ownerPrincipalId)throw new CommandError(409,'OWNER_CONFLICT');
    r.lead_id=await this.leads.upsert(s,a,{sessionId:r.id,conversationId:r.conversation_id,contactId:c.row.contact_id,ownerId:c.record.ownerPrincipalId,teamId:c.record.teamId,values:{...r.draft,...r.variables},evidence:this.evidence(r),complete,disqualified},kind);await this.persist(s,r);return r.lead_id as string;
  }
  async claim():Promise<Claim[]>{const rows=await this.source.query("SELECT tenant_id,id FROM chatflow_session WHERE status IN('running','waiting_message') ORDER BY checked_at,id LIMIT 40"),claims:Claim[]=[];
    for(const row of rows){const c=await this.uow.run({tenantId:row.tenant_id},async s=>{const r=await this.lock(s,row.id);if(!['running','waiting_message'].includes(r.status))return null;
      await s.query('UPDATE chatflow_session SET checked_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[row.tenant_id,r.id]);
      await s.query("INSERT INTO chatflow_node_run(tenant_id,session_id,node_key,status) VALUES (?,?,?,'pending') ON DUPLICATE KEY UPDATE node_key=VALUES(node_key)",[row.tenant_id,r.id,r.node_key]);
      const changed=await s.query("UPDATE chatflow_node_run SET status='running',fencing_token=fencing_token+1,lease_until=TIMESTAMPADD(SECOND,60,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND session_id=? AND node_key=? AND execution_id IS NULL AND (status IN('pending','waiting') OR status='running' AND lease_until<=UTC_TIMESTAMP(6))",[row.tenant_id,r.id,r.node_key]);if(!changed.affectedRows)return null;
      const [n]=await s.query('SELECT fencing_token FROM chatflow_node_run WHERE tenant_id=? AND session_id=? AND node_key=?',[row.tenant_id,r.id,r.node_key]);return {tenantId:row.tenant_id,sessionId:r.id,node:r.node_key,token:String(n.fencing_token)};});if(c)claims.push(c);
    }return claims;
  }
  private async fenced(s:TransactionScope,c:Claim){const r=await this.lock(s,c.sessionId);const [n]=await s.query("SELECT * FROM chatflow_node_run WHERE tenant_id=? AND session_id=? AND node_key=? AND status='running' AND fencing_token=? AND lease_until>UTC_TIMESTAMP(6)",[c.tenantId,c.sessionId,c.node,c.token]);if(!n||r.node_key!==c.node||!['running','waiting_message'].includes(r.status))throw new CommandError(409,'CHATFLOW_LEASE_LOST');return {r,n};}
  async step(claim:Claim){await this.uow.run({tenantId:claim.tenantId},async s=>{
    const {r,n}=await this.fenced(s,claim),live=await this.guard(s,r),node=r.graph.nodes.find((x:Node)=>x.key===r.node_key)! as Node;
    const prompt=async(text:string,attempt:number)=>{await this.conversations.prompt(s,r.conversation_id,live.a,r.owner_revision,text,`${r.id}:${node.key}:${attempt}`,r.id);await s.query('UPDATE chatflow_node_run SET prompt_attempt=? WHERE tenant_id=? AND session_id=? AND node_key=?',[attempt,claim.tenantId,r.id,node.key]);};
    let next:string|undefined,wait=false;
    if(node.type==='send_prompt'){await prompt(renderPrompt(node,r.variables),0);next=node.next;}
    if(node.type==='collect'||node.type==='invoke_agent'){
      const used=(await s.query('SELECT message_id FROM chatflow_turn WHERE tenant_id=? AND session_id=?',[claim.tenantId,r.id])).map((x:any)=>x.message_id);const m=await this.conversations.next(s,r.conversation_id,used,node.type==='collect'&&node.config.variable_key==='contact_permission'?'consent':'inference');
      if(!m){if(node.type==='collect'&&n.prompt_attempt!==n.invalid_attempts)await prompt(node.config.prompt,n.invalid_attempts);wait=true;}
      else if(node.type==='collect'){
        const answer=parseAnswer(node.config,m.text);await s.query('INSERT INTO chatflow_turn(tenant_id,session_id,message_id,node_key,status) VALUES (?,?,?,?,?)',[claim.tenantId,r.id,m.id,node.key,answer.valid?'validated':'invalid']);r.last_message_id=m.id;
        if(answer.valid){r.variables[node.config.variable_key]=answer.value;r.provenance[node.config.variable_key]={kind:'message',message_id:m.id,node_key:node.key};await this.persist(s,r);
          if(node.config.variable_key==='contact_permission'&&answer.value===false){if(r.lead_id)await this.saveLead(s,r,live.service,false,'service',true);await this.fenced(s,claim);await this.terminal(s,r,'disqualified',{kind:'service',id:r.service_actor_id});return;}next=node.next;
        }else{const attempts=Number(n.invalid_attempts)+1;await s.query('UPDATE chatflow_node_run SET invalid_attempts=? WHERE tenant_id=? AND session_id=? AND node_key=?',[attempts,claim.tenantId,r.id,node.key]);await this.persist(s,r);if(attempts>=3){await this.fenced(s,claim);await this.routeHuman(s,r,'INVALID_ANSWERS');return;}await prompt(node.config.prompt,attempts);wait=true;}
      }else{
        await s.query("INSERT INTO chatflow_turn(tenant_id,session_id,message_id,node_key,status) VALUES (?,?,?,?,'runtime')",[claim.tenantId,r.id,m.id,node.key]);r.last_message_id=m.id;await this.persist(s,r);await s.query("UPDATE chatflow_session SET status='running' WHERE tenant_id=? AND id=?",[claim.tenantId,r.id]);
        const execution=await this.runtime.start(s,r.id,m.id,`${r.id}:${node.key}`);await this.fenced(s,claim);await s.query("UPDATE chatflow_node_run SET execution_id=?,status='waiting',lease_until=NULL WHERE tenant_id=? AND session_id=? AND node_key=?",[execution.id,claim.tenantId,r.id,node.key]);return;
      }
    }
    if(node.type==='validate_qualification'){let valid=true;try{this.leads.validate(live.service,{...r.draft,...r.variables},this.evidence(r));}catch(e){if(!(e instanceof CommandError)||e.status!==422)throw e;valid=false;}next=valid?node.config.on_valid:node.config.on_invalid;}
    if(node.type==='upsert_lead'){let complete=true;try{this.leads.validate(live.service,{...r.draft,...r.variables},this.evidence(r));}catch(e){if(!(e instanceof CommandError)||e.status!==422)throw e;complete=false;}await this.saveLead(s,r,live.service,complete);next=node.next;}
    if(node.type==='request_human'){await this.fenced(s,claim);await this.routeHuman(s,r,'REQUEST_HUMAN',node.config.target_chat_team);return;}
    if(node.type==='end'){
      if(node.config.outcome==='qualified'){this.leads.validate(live.service,{...r.draft,...r.variables},this.evidence(r));await this.saveLead(s,r,live.service,true);}
      await this.fenced(s,claim);await this.terminal(s,r,node.config.outcome,{kind:'service',id:r.service_actor_id});return;
    }
    await this.fenced(s,claim);if(next)await this.advance(s,r,next);else if(wait){await s.query("UPDATE chatflow_node_run SET status='waiting',lease_until=NULL WHERE tenant_id=? AND session_id=? AND node_key=?",[claim.tenantId,r.id,node.key]);await s.query("UPDATE chatflow_session SET status='waiting_message' WHERE tenant_id=? AND id=?",[claim.tenantId,r.id]);}
  });}
  async load(s:TransactionScope,id:string,message:string):Promise<SessionSnapshot>{const r=await this.lock(s,id),node=r.graph.nodes.find((n:Node)=>n.key===r.node_key) as Node;
    if(r.status!=='running'||node.type!=='invoke_agent'||r.last_message_id!==message)throw new CommandError(409,'SESSION_NOT_AVAILABLE');const live=await this.guard(s,r);await this.conversations.inbound(s,r.conversation_id,message,'inference');
    return {id,status:'running',conversationId:r.conversation_id,principalId:live.p.id,ownerRevision:r.owner_revision,serviceActorId:r.service_actor_id,node:node.key,instruction:node.config.instruction,allowedTools:[...node.config.allowed_tools],qualification:{...r.draft,...r.variables}};
  }
  async saveDraft(s:TransactionScope,id:string,value:Record<string,unknown>){const r=await this.lock(s,id);await this.load(s,id,r.last_message_id);r.draft={...r.draft,...runtimeDraft(value)};await this.persist(s,r);}
  async proposeReply(s:TransactionScope,id:string,text:string){const r=await this.lock(s,id);await this.load(s,id,r.last_message_id);runtimeText(text);await s.query('UPDATE chatflow_node_run SET proposed_reply=? WHERE tenant_id=? AND session_id=? AND node_key=?',[text,s.context.tenantId,id,r.node_key]);}
  async complete(s:TransactionScope,id:string,execution:string){const r=await this.lock(s,id);await this.load(s,id,r.last_message_id);const [n]=await s.query('SELECT execution_id,proposed_reply FROM chatflow_node_run WHERE tenant_id=? AND session_id=? AND node_key=?',[s.context.tenantId,id,r.node_key]);if(n?.execution_id!==execution)throw new CommandError(409,'SESSION_NOT_AVAILABLE');const live=await this.guard(s,r);if(n.proposed_reply)await this.conversations.prompt(s,r.conversation_id,live.a,r.owner_revision,n.proposed_reply,`${r.id}:${r.node_key}:runtime`,r.id);const node=r.graph.nodes.find((n:Node)=>n.key===r.node_key) as Extract<Node,{type:'invoke_agent'}>;await this.advance(s,r,node.next);}
  async tick(){
    for(const c of await this.claim())try{await this.step(c);}catch(e){if(e instanceof CommandError&&e.code==='CHATFLOW_LEASE_LOST')continue;await this.uow.run({tenantId:c.tenantId},async s=>{const r=await this.lock(s,c.sessionId);if(!active(r.status))return;await this.stop(s,r,'paused_human','CHATFLOW_REQUIRES_HUMAN');});}
    // Includes sessions waiting for an async runtime: access revocation cannot strand them.
    const rows=await this.source.query("SELECT tenant_id,id FROM chatflow_session WHERE status IN('running','waiting_message') ORDER BY checked_at,id LIMIT 40");for(const row of rows)await this.uow.run({tenantId:row.tenant_id},async s=>{const r=await this.lock(s,row.id);if(!['running','waiting_message'].includes(r.status))return;try{await this.guard(s,r);const [node]=await s.query('SELECT execution_id FROM chatflow_node_run WHERE tenant_id=? AND session_id=? AND node_key=?',[s.context.tenantId,r.id,r.node_key]);if(node?.execution_id&&!['queued','running'].includes(await chatflowExecutionStatus(s,node.execution_id,r.id)))await this.stop(s,r,'paused_human','RUNTIME_REQUIRES_HUMAN');}catch{await this.stop(s,r,'paused_human','CHATFLOW_ACCESS_CHANGED');}});
  }
}
