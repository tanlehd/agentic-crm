import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { Envelope,Consumer } from '../../kernel/reliability/delivery.js';
import { AccessError } from '../identity/authorization.js';
import { workflowActor,lockWorkflowTenant } from '../identity/workflow-port.js';
import { Routing } from '../agents/routing.js';
import { RecordRegistry } from '../crm/registry.js';
import { uuid } from '../identity/admin.js';
import { validateGraph,resolveConfig,sanitizeOutput,type Graph,type Node } from './graph.js';
import { unavailableChildren,type WorkflowChildren } from './ports.js';
import { notifyWorkflowActivity } from './activity-port.js';
export const json=(v:any):any=>typeof v==='string'?JSON.parse(v):v;
export interface Claim {tenantId:string;runId:string;nodeKey:string;token:string}
const delays=[1,5,30,120,600];
export class WorkflowEngine {
  readonly uow:UnitOfWork;private readonly routing:Routing;private readonly commands=new DurableCommands();
  constructor(readonly source:DataSource,readonly children:WorkflowChildren=unavailableChildren){this.uow=new UnitOfWork(source);this.routing=new Routing(source);}
  consumers():Consumer[]{return [{name:'workflow.starter.v1',type:'conversation.created',handle:(s,e)=>this.start(s,e)},...['chatflow.completed','lead.accepted'].map(type=>({name:`workflow.${type}.v1`,type,handle:async(s:TransactionScope,e:Envelope)=>{const child=e.data[type==='chatflow.completed'?'session_id':'handoff_id'];if(!uuid(child))throw new CommandError(422,'INVALID_WORKFLOW_SIGNAL');const waits=await s.query("SELECT run_id FROM workflow_wait WHERE tenant_id=? AND event_type=? AND match_key=? AND status='waiting'",[s.context.tenantId,type,child]);for(const w of waits)await this.wake(s,w.run_id);}}))];}
  async start(s:TransactionScope,e:Envelope){
    if(e.tenant_id!==s.context.tenantId||e.event_type!=='conversation.created'||e.schema_version!==1||!uuid(e.aggregate_id)||!uuid(e.data.contact_id)||!uuid(e.data.connection_id))throw new CommandError(422,'INVALID_WORKFLOW_TRIGGER');
    await lockWorkflowTenant(s);const defs=await s.query('SELECT * FROM workflow_definition WHERE tenant_id=? ORDER BY id FOR UPDATE',[s.context.tenantId]);
    for(const d of defs){const old=await s.query('SELECT event_id FROM workflow_trigger_selection WHERE tenant_id=? AND definition_id=? AND event_id=?',[s.context.tenantId,d.id,e.event_id]);if(old.length)continue;
      await s.query('INSERT INTO workflow_trigger_selection(tenant_id,definition_id,event_id) VALUES (?,?,?)',[s.context.tenantId,d.id,e.event_id]);if(!d.enabled||!d.active_version_id)continue;
      const [v]=await s.query("SELECT * FROM workflow_version WHERE tenant_id=? AND id=? AND state='published'",[s.context.tenantId,d.active_version_id]);if(!v)continue;const g=validateGraph(json(v.graph));if(g.trigger.connection_id!==e.data.connection_id)continue;
      const id=randomUUID(),context={trigger:{aggregate_id:e.aggregate_id,contact_id:e.data.contact_id,connection_id:e.data.connection_id},outputs:{}};
      await s.query("INSERT INTO workflow_run(id,tenant_id,definition_id,version_id,trigger_event_id,service_actor_id,current_node,context,status,correlation_id) VALUES (?,?,?,?,?,?,?,?,'queued',?)",[id,s.context.tenantId,d.id,v.id,e.event_id,d.service_actor_id,g.entry_node,JSON.stringify(context),e.correlation_id]);
      await this.commands.systemAudit(s,e.correlation_id,'workflow_run',id,'workflow.started',['version_id']);await notifyWorkflowActivity(s,id,'started');
    }
  }
  private async run(s:TransactionScope,id:string){await lockWorkflowTenant(s);const [r]=await s.query('SELECT * FROM workflow_run WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);if(!r)throw new CommandError(404,'NOT_FOUND');const [v]=await s.query('SELECT graph,execution_role_id FROM workflow_version WHERE tenant_id=? AND id=?',[s.context.tenantId,r.version_id]);return {...r,graph:json(v.graph) as Graph,role:v.execution_role_id,context:json(r.context)};}
  private async locked(s:TransactionScope,c:Claim){const r=await this.run(s,c.runId);const [step]=await s.query("SELECT * FROM workflow_step_run WHERE tenant_id=? AND run_id=? AND node_key=? AND status='running' AND fencing_token=? AND lease_until>UTC_TIMESTAMP(6) FOR UPDATE",[s.context.tenantId,c.runId,c.nodeKey,c.token]);if(!step||r.status!=='running'||r.current_node!==c.nodeKey)throw new CommandError(409,'WORKFLOW_LEASE_LOST');return {r,step,n:r.graph.nodes.find((n:Node)=>n.key===c.nodeKey)!};}
  async claim():Promise<Claim[]>{
    const candidates=await this.source.query("SELECT r.tenant_id,r.id FROM workflow_run r LEFT JOIN workflow_step_run s ON s.tenant_id=r.tenant_id AND s.run_id=r.id AND s.node_key=r.current_node WHERE r.status IN('queued','running') AND (s.run_id IS NULL OR (s.status='pending' AND (s.next_attempt_at IS NULL OR s.next_attempt_at<=UTC_TIMESTAMP(6))) OR (s.status='running' AND s.lease_until<=UTC_TIMESTAMP(6))) ORDER BY r.started_at,r.id LIMIT 100");const claims:Claim[]=[];
    for(const row of candidates){const c=await this.uow.run({tenantId:row.tenant_id},async s=>{const r=await this.run(s,row.id);if(!['queued','running'].includes(r.status))return null;const n=r.graph.nodes.find((n:Node)=>n.key===r.current_node)!;
      await s.query("INSERT INTO workflow_step_run(tenant_id,run_id,node_key,status,input,action_key) VALUES (?,?,?,'pending',?,?) ON DUPLICATE KEY UPDATE node_key=VALUES(node_key)",[row.tenant_id,r.id,n.key,JSON.stringify(resolveConfig(n,r.context)),`${r.id}:${n.key}`]);
      const result=await s.query("UPDATE workflow_step_run SET status='running',attempt=attempt+1,fencing_token=fencing_token+1,lease_until=TIMESTAMPADD(SECOND,60,UTC_TIMESTAMP(6)),next_attempt_at=NULL WHERE tenant_id=? AND run_id=? AND node_key=? AND ((status='pending' AND (next_attempt_at IS NULL OR next_attempt_at<=UTC_TIMESTAMP(6))) OR (status='running' AND lease_until<=UTC_TIMESTAMP(6)))",[row.tenant_id,r.id,n.key]);if(!result.affectedRows)return null;
      await s.query("UPDATE workflow_run SET status='running' WHERE tenant_id=? AND id=?",[row.tenant_id,r.id]);const [step]=await s.query('SELECT fencing_token FROM workflow_step_run WHERE tenant_id=? AND run_id=? AND node_key=?',[row.tenant_id,r.id,n.key]);return {tenantId:row.tenant_id,runId:r.id,nodeKey:n.key,token:String(step.fencing_token)};});if(c)claims.push(c);
    }return claims;
  }
  async heartbeat(c:Claim){await this.uow.run({tenantId:c.tenantId},async s=>{await this.locked(s,c);await s.query('UPDATE workflow_step_run SET lease_until=TIMESTAMPADD(SECOND,60,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND run_id=? AND node_key=?',[c.tenantId,c.runId,c.nodeKey]);});}
  // Deliberately separate transaction from finish: durable ledger bridges crash gap.
  async effect(c:Claim){return this.uow.run({tenantId:c.tenantId},async s=>{const {r,step,n}=await this.locked(s,c),a=await workflowActor(s,r.service_actor_id,r.role);const [done]=await s.query('SELECT result FROM workflow_action WHERE tenant_id=? AND run_id=? AND node_key=?',[c.tenantId,c.runId,c.nodeKey]);if(done)return json(done.result);
    if(!['assign_owner','start_chatflow','request_lead_handoff'].includes(n.type))return null;const input=json(step.input);let result:Record<string,unknown>;
    if(n.type==='assign_owner'){const record=await new RecordRegistry().get(s,input.record_id,true);const routed=await this.routing.route(s,a,record.id,record.version,input.team_id,input.capability,input.preference,r.correlation_id,'service');result={owner_id:routed.owner_principal_id,owner_revision:routed.owner_revision};}
    else result=await this.children.execute(s,n,input,{runId:r.id,actorId:r.service_actor_id,actionKey:step.action_key,correlationId:r.correlation_id,access:a});
    result=sanitizeOutput(n.type,result);await this.locked(s,c);await s.query('INSERT INTO workflow_action(tenant_id,run_id,node_key,result) VALUES (?,?,?,?)',[c.tenantId,c.runId,c.nodeKey,JSON.stringify(result)]);return result;
  });}
  private async terminal(s:TransactionScope,r:any,status:'completed'|'failed'|'cancelled',code?:string){
    await s.query('UPDATE workflow_run SET status=?,finished_at=UTC_TIMESTAMP(6),error_code=?,attention=? WHERE tenant_id=? AND id=?',[status,code??null,status==='failed'?1:0,s.context.tenantId,r.id]);
    if(status==='failed'){await s.query("UPDATE workflow_step_run SET status='failed',lease_until=NULL,error_code=? WHERE tenant_id=? AND run_id=? AND status IN('pending','running')",[code??'WORKFLOW_ACTION_REJECTED',s.context.tenantId,r.id]);await s.query("UPDATE workflow_wait SET status='cancelled' WHERE tenant_id=? AND run_id=? AND status='waiting'",[s.context.tenantId,r.id]);}
    await this.commands.systemAudit(s,r.correlation_id,'workflow_run',r.id,`workflow.${status}`,['status']);await notifyWorkflowActivity(s,r.id,status);
    if(status!=='cancelled')await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,'workflow_run',?,1,?,?,'service',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),s.context.tenantId,status==='completed'?'workflow.completed':'execution.failed',r.id,JSON.stringify(status==='completed'?{run_id:r.id,version_id:r.version_id}:{execution_type:'workflow',execution_id:r.id,error_code:code}),r.correlation_id,r.service_actor_id]);
  }
  private async advance(s:TransactionScope,r:any,n:Node,output:Record<string,unknown>,next?:string){
    r.context.outputs[n.key]=output;await s.query("UPDATE workflow_step_run SET status='succeeded',output=?,lease_until=NULL,error_code=NULL WHERE tenant_id=? AND run_id=? AND node_key=?",[JSON.stringify(output),s.context.tenantId,r.id,n.key]);
    await s.query('UPDATE workflow_run SET context=?,current_node=?,status=? WHERE tenant_id=? AND id=?',[JSON.stringify(r.context),next??n.key,next?'queued':'running',s.context.tenantId,r.id]);if(!next)await this.terminal(s,r,'completed');
  }
  async finish(c:Claim){await this.uow.run({tenantId:c.tenantId},async s=>{const {r,step,n}=await this.locked(s,c);await workflowActor(s,r.service_actor_id,r.role);const input=json(step.input);
    if(n.type==='wait_event'||n.type==='wait_timer'){
      await s.query("INSERT INTO workflow_wait(tenant_id,run_id,node_key,kind,event_type,match_key,resume_at,status) VALUES (?,?,?,?,?,?,TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),'waiting')",[c.tenantId,r.id,n.key,n.type==='wait_event'?'event':'timer',input.event_type??null,input.match_key??null,input.timeout_seconds??input.duration_seconds]);
      await s.query("UPDATE workflow_run SET status='waiting' WHERE tenant_id=? AND id=?",[c.tenantId,r.id]);await s.query('UPDATE workflow_step_run SET lease_until=NULL WHERE tenant_id=? AND run_id=? AND node_key=?',[c.tenantId,r.id,n.key]);await this.wake(s,r.id);return;
    }
    if(n.type==='end'){await this.advance(s,r,n,{outcome:input.outcome});return;}
    if(n.type==='condition'){const yes=input.op==='exists'?input.left!==undefined&&input.left!==null:input.left!==undefined&&input.left!==null&&input.left===input.right;await this.advance(s,r,n,{},yes?input.on_true:input.on_false);return;}
    const [action]=await s.query('SELECT result FROM workflow_action WHERE tenant_id=? AND run_id=? AND node_key=?',[c.tenantId,r.id,n.key]);if(!action)throw new CommandError(409,'WORKFLOW_EFFECT_MISSING');await this.advance(s,r,n,json(action.result),n.next);
  });}
  async wake(s:TransactionScope,id:string){const r=await this.run(s,id);if(r.status!=='waiting')return;await s.query('UPDATE workflow_run SET last_checked_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);await workflowActor(s,r.service_actor_id,r.role);const [w]=await s.query("SELECT *,resume_at<=UTC_TIMESTAMP(6) due FROM workflow_wait WHERE tenant_id=? AND run_id=? AND node_key=? AND status='waiting' FOR UPDATE",[s.context.tenantId,id,r.current_node]);if(!w)return;
    const n=r.graph.nodes.find((n:Node)=>n.key===r.current_node)!;let result=w.kind==='event'?await this.children.result(s,id,w.event_type,w.match_key):null;
    if(!result&&!Number(w.due))return;const timed=w.kind==='event'&&!result;
    result=w.kind==='timer'?{woke_at:new Date(w.resume_at).toISOString()}:sanitizeOutput('wait_event',{outcome:timed?'timed_out':result?.outcome,lead_id:result?.lead_id??null,timed_out:timed});
    await s.query('UPDATE workflow_wait SET status=?,result=? WHERE tenant_id=? AND run_id=? AND node_key=?',[timed?'timed_out':'resumed',JSON.stringify(result),s.context.tenantId,id,n.key]);await this.advance(s,r,n,result,timed?n.on_timeout:n.next);
  }
  async fail(c:Claim,error:unknown){if(error instanceof CommandError&&error.code==='WORKFLOW_LEASE_LOST')return;
    await this.uow.run({tenantId:c.tenantId},async s=>{const {r,step}=await this.locked(s,c);const retry=!(error instanceof CommandError)&&!(error instanceof AccessError)&&Number(step.attempt)<=delays.length;
      const code=error instanceof AccessError?'FORBIDDEN':error instanceof CommandError?(['FORBIDDEN','WORKFLOW_ROLE_REVOKED','WORKFLOW_CHILD_UNAVAILABLE','INVALID_WORKFLOW_GRAPH'].includes(error.code)?error.code:'WORKFLOW_ACTION_REJECTED'):'WORKFLOW_TRANSIENT_FAILURE';
      await s.query(`UPDATE workflow_step_run SET status=?,lease_until=NULL,error_code=?,next_attempt_at=${retry?'TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6))':'NULL'} WHERE tenant_id=? AND run_id=? AND node_key=?`,[retry?'pending':'failed',code,...(retry?[delays[Number(step.attempt)-1]]:[]),c.tenantId,c.runId,c.nodeKey]);if(!retry)await this.terminal(s,r,'failed',code);
    });
  }
  async cancel(s:TransactionScope,id:string){const r=await this.run(s,id);if(['completed','failed','cancelled'].includes(r.status))return r.status;
    await s.query("UPDATE workflow_step_run SET status='cancelled',lease_until=NULL,fencing_token=fencing_token+1 WHERE tenant_id=? AND run_id=? AND status IN('pending','running')",[s.context.tenantId,id]);await s.query("UPDATE workflow_wait SET status='cancelled' WHERE tenant_id=? AND run_id=? AND status='waiting'",[s.context.tenantId,id]);
    await this.terminal(s,r,'cancelled');await s.query('UPDATE workflow_run SET cancel_pending=1 WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);return 'cancelled';
  }
  async tick(){for(const c of await this.claim()){try{await this.effect(c);await this.finish(c);}catch(e){try{await this.fail(c,e);}catch(f){if(!(f instanceof CommandError&&f.code==='WORKFLOW_LEASE_LOST'))throw f;}}}
    const rows=await this.source.query("SELECT tenant_id,id,cancel_pending FROM workflow_run WHERE status='waiting' OR (cancel_pending=1 AND cancel_attempts<5 AND (cancel_retry_at IS NULL OR cancel_retry_at<=UTC_TIMESTAMP(6))) ORDER BY COALESCE(last_checked_at,started_at),id LIMIT 100");for(const r of rows){try{await this.uow.run({tenantId:r.tenant_id},async s=>{if(r.cancel_pending){await this.run(s,r.id);await this.children.cancel(s,r.id);await s.query('UPDATE workflow_run SET cancel_pending=0 WHERE tenant_id=? AND id=?',[r.tenant_id,r.id]);}else await this.wake(s,r.id);});}catch(e){await this.uow.run({tenantId:r.tenant_id},async s=>{const run=await this.run(s,r.id);if(run.status==='waiting'&&(e instanceof CommandError||e instanceof AccessError))await this.terminal(s,run,'failed','WORKFLOW_WAIT_REJECTED');else await s.query('UPDATE workflow_run SET attention=1,cancel_attempts=cancel_attempts+1,cancel_retry_at=TIMESTAMPADD(SECOND,15,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND id=?',[r.tenant_id,r.id]);});}}
  }
}
