import {it,expect,vi} from 'vitest';
import type {DataSource} from 'typeorm';
import type {TransactionScope} from '../src/kernel/tenancy/unit-of-work.js';
import {WorkflowEngine} from '../src/modules/workflow/engine.js';
vi.mock('../src/modules/identity/workflow-port.js',()=>({workflowActor:vi.fn().mockResolvedValue({}),lockWorkflowTenant:vi.fn()}));

it('does not read or assign the retained Chat registry when Workflow Chat integration is unavailable',async()=>{
 const engine=new WorkflowEngine({} as DataSource),query=vi.fn().mockResolvedValue([]);
 const scope={context:{tenantId:'synthetic-tenant'},query} as unknown as TransactionScope;
 vi.spyOn(engine.uow,'run').mockImplementation(async(_context,work)=>work(scope));
 // Isolate the already-authorized step boundary; only its business effect runs.
 Object.defineProperty(engine,'locked',{value:async()=>({r:{id:'synthetic-run',service_actor_id:'synthetic-service',role:'synthetic-role'},step:{input:{record_id:'synthetic-chat',team_id:'synthetic-team',capability:'chat',preference:'human'}},n:{type:'assign_owner',key:'assign'}})});
 await expect(engine.effect({tenantId:'synthetic-tenant',runId:'synthetic-run',nodeKey:'assign',token:'1'})).rejects.toThrow('WORKFLOW_CHAT_UNAVAILABLE');
 expect(query).toHaveBeenCalledTimes(1);
 expect(query.mock.calls[0]?.[0]).toContain('SELECT result FROM workflow_action');
});
