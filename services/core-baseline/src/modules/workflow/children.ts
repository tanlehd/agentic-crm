import type { DataSource } from 'typeorm';
import { CommandError } from '../../kernel/reliability/commands.js';
import { SalesHandoffs } from '../sales/handoff.js';
import { RoutingIdentityPort } from '../identity/routing-port.js';
import { workflowActor } from '../identity/workflow-port.js';
import { allows } from '../crm/access.js';
import { RecordRegistry } from '../crm/registry.js';
import type { WorkflowChildren } from './ports.js';
export function workflowChildren(source:DataSource):WorkflowChildren {
 const sales=new SalesHandoffs(source),identity=new RoutingIdentityPort();
 return {
  async validate(s,g,a){for(const n of g.nodes)if(n.type==='request_lead_handoff'){await identity.salesTeam(s,n.config.target_team_id);if(!allows(a,'lead','handoff')||!allows(a,'lead','read'))throw new CommandError(403,'FORBIDDEN');}},
  async execute(s,n,input,c){if(n.type!=='request_lead_handoff')throw new CommandError(422,'WORKFLOW_ACTION_UNSUPPORTED');
   const [parent]=await s.query('SELECT r.status,r.service_actor_id,v.execution_role_id,v.graph FROM workflow_run r JOIN workflow_version v ON v.tenant_id=r.tenant_id AND v.id=r.version_id WHERE r.tenant_id=? AND r.id=? FOR UPDATE',[s.context.tenantId,c.runId]);
   const graph=typeof parent?.graph==='string'?JSON.parse(parent.graph):parent?.graph,bound=graph?.nodes.find((x:any)=>x.key===n.key&&x.type==='request_lead_handoff');
   if(!parent||!['running','queued'].includes(parent.status)||parent.service_actor_id!==c.actorId||bound?.config.target_team_id!==input.target_team_id)throw new CommandError(409,'HANDOFF_PARENT_INVALID');
   const a=await workflowActor(s,c.actorId,parent.execution_role_id),r=await new RecordRegistry().get(s,input.lead_id,true),data=await sales.request(s,a,r.id,input.target_team_id,r.version,c.correlationId,'service',c);return {handoff_id:data.handoff_id,lead_id:r.id};
  },
  async result(s,run,type,id){if(type!=='lead.accepted')throw new CommandError(422,'WORKFLOW_SIGNAL_UNSUPPORTED');return sales.result(s,run,id);},
  async cancel(){},
 };
}
