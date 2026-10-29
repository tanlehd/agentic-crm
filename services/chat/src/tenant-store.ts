import type {Pool,PoolConnection,RowDataPacket,ResultSetHeader} from 'mysql2/promise';
import {businessTenant,session} from './database.js';

// Storage predicates only. T04 supplies current Identity/owner authorization;
// these methods are not public endpoints and do not authorize an actor.
export class ChatTenantStore {
  readonly tenant:string;
  constructor(private readonly pool:Pool,tenant:string){this.tenant=businessTenant(tenant);}
  async tag(id:string):Promise<{id:string;name:string;version:string}|null>{
    const [rows]=await this.pool.execute<RowDataPacket[]>('SELECT id,name,CAST(version AS CHAR) AS version FROM conversation_tag WHERE tenant_id=? AND id=?',[this.tenant,id]);
    return rows[0]?{id:rows[0].id,name:rows[0].name,version:rows[0].version}:null;
  }
  async message(id:string):Promise<{id:string;conversationId:string}|null>{
    const [rows]=await this.pool.execute<RowDataPacket[]>('SELECT id,conversation_id FROM message WHERE tenant_id=? AND id=?',[this.tenant,id]);
    return rows[0]?{id:rows[0].id,conversationId:rows[0].conversation_id}:null;
  }
  async job(intentId:string):Promise<{intentId:string;status:string}|null>{
    const [rows]=await this.pool.execute<RowDataPacket[]>('SELECT intent_id,status FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[this.tenant,intentId]);
    return rows[0]?{intentId:rows[0].intent_id,status:rows[0].status}:null;
  }
  // T03 verifies the SQL tenant predicate without committing business effects.
  // The supplied connection must belong to this pool's transaction owner.
  async renameTag(connection:PoolConnection,id:string,version:string,name:string,epoch:string):Promise<boolean>{
    businessTenant(this.tenant);
    if(!/^[1-9]\d*$/.test(version)||!/^[1-9]\d*$/.test(epoch)||name.length<1||name.length>80)throw new Error('STORAGE_INPUT_INVALID');
    const [gates]=await connection.execute<RowDataPacket[]>('SELECT mode,epoch FROM chat_writer_gate WHERE tenant_id=? FOR SHARE',[this.tenant]);
    if(gates[0]?.mode!=='active'||String(gates[0].epoch)!==epoch)throw new Error('CHAT_WRITER_FENCED');
    const [result]=await connection.execute<ResultSetHeader>('UPDATE conversation_tag SET name=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=? AND version=?',[name,this.tenant,id,version]);
    return result.affectedRows===1;
  }
  async transaction<T>(work:(connection:PoolConnection)=>Promise<T>):Promise<T>{
    const c=await this.pool.getConnection();try{await session(c);await c.beginTransaction();const result=await work(c);await c.commit();return result;}catch(e){await c.rollback();throw e;}finally{c.release();}
  }
}
