// Test-only durable session stand-in. Never imported by application composition.
import type { DataSource } from 'typeorm';
import type { TransactionScope } from '../src/kernel/tenancy/unit-of-work.js';
import { CommandError } from '../src/kernel/reliability/commands.js';
import type { ChatflowSessionPort,SessionSnapshot } from '../src/modules/agents/session-port.js';
export class RuntimeSessionHarness implements ChatflowSessionPort {
  async install(ds:DataSource){await ds.query('CREATE TABLE synthetic_runtime_session (tenant_id CHAR(36) NOT NULL,id CHAR(36) NOT NULL,snapshot JSON NOT NULL,draft JSON NOT NULL,reply TEXT NULL,status VARCHAR(32) NOT NULL,effects INT NOT NULL DEFAULT 0,PRIMARY KEY(tenant_id,id))');}
  async load(s:TransactionScope,id:string,_messageId:string):Promise<SessionSnapshot>{const [r]=await s.query('SELECT * FROM synthetic_runtime_session WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);if(!r)throw new CommandError(409,'SESSION_NOT_AVAILABLE');const parse=(v:any)=>typeof v==='string'?JSON.parse(v):v;return {...parse(r.snapshot),status:r.status,qualification:parse(r.draft)};}
  async saveDraft(s:TransactionScope,id:string,value:Record<string,unknown>){const snapshot=await this.load(s,id,'');await s.query('UPDATE synthetic_runtime_session SET draft=?,effects=effects+1 WHERE tenant_id=? AND id=?',[JSON.stringify({...snapshot.qualification,...value}),s.context.tenantId,id]);}
  async proposeReply(s:TransactionScope,id:string,text:string){await s.query('UPDATE synthetic_runtime_session SET reply=?,effects=effects+1 WHERE tenant_id=? AND id=?',[text,s.context.tenantId,id]);}
  async complete(s:TransactionScope,id:string,_execution:string){await s.query("UPDATE synthetic_runtime_session SET status='completed' WHERE tenant_id=? AND id=?",[s.context.tenantId,id]);}
  async handoff(s:TransactionScope,id:string,_reason:string){await s.query("UPDATE synthetic_runtime_session SET status='paused_human' WHERE tenant_id=? AND id=?",[s.context.tenantId,id]);}
}
