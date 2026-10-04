// Explicit synthetic browser fixture only. Runs in local operator migration one-shot; never weakens runtime audit grants.
import { createPool } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
if(process.env.APP_ENV!=='development')throw new Error('Development only');
const input=JSON.parse(await new Promise(resolve=>{let body='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>body+=chunk);process.stdin.on('end',()=>resolve(body));}));
const pool=createPool({host:process.env.MYSQL_HOST,user:process.env.MYSQL_MIGRATION_USER,password:process.env.MYSQL_MIGRATION_PASSWORD,database:process.env.MYSQL_DATABASE});
const connection=await pool.getConnection();
try{
  const grants=['membership','role','team','agent'].flatMap(resource=>['read','create','update'].map(action=>({resource,action,scope:'all'})));
  await connection.beginTransaction();
  if(input.action==='create'){
    const [accounts]=await connection.query('SELECT id FROM account WHERE id=?',[input.account]);if(accounts.length!==1)throw new Error('Account required');
    const result=[];
    for(const label of ['Alpha','Beta']){
      const tenant=randomUUID(),role=randomUUID(),member=randomUUID(),principal=randomUUID(),team=randomUUID();
      await connection.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,`SRC007 E2E ${label}`]);
      await connection.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[member,tenant,input.account]);
      await connection.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[principal,tenant,member]);
      await connection.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'tenant_admin','Admin',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,tenant,JSON.stringify(grants)]);
      await connection.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,principal,role]);
      await connection.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,?,'general',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[team,tenant,label]);
      result.push({tenant,member,principal,team});
    }
    await connection.commit();process.stdout.write(JSON.stringify(result));
  }else if(input.action==='delivery-status'){
    const [rows]=await connection.query("SELECT o.status,COUNT(i.event_id) AS consumed FROM outbox_event o LEFT JOIN consumer_inbox i ON i.tenant_id=o.tenant_id AND i.event_id=o.id AND i.consumer_name='identity.access.v1' AND i.status='completed' WHERE o.tenant_id=? GROUP BY o.id,o.status",[input.tenant]);
    await connection.commit();process.stdout.write(JSON.stringify(rows));
  }else{
    for(const fixture of input.fixtures){
      const [rows]=await connection.query('SELECT name FROM tenant WHERE id=? FOR UPDATE',[fixture.tenant]);
      if(rows.length!==1||!['SRC007 E2E Alpha','SRC007 E2E Beta'].includes(rows[0].name))throw new Error('Fixture mismatch');
      if(input.action==='suspend'){
        await connection.query("UPDATE membership SET status='suspended',version=version+1,auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?",[fixture.tenant,fixture.member]);
        await connection.query("UPDATE principal SET status='suspended',version=version+1,auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?",[fixture.tenant,fixture.principal]);
      }else if(input.action==='cleanup'){
        for(const table of ['consumer_inbox','outbox_event','idempotency_record','audit_entry','principal_role','team_member','principal','ai_agent','agent_policy','service_actor','membership','team','role'])await connection.query(`DELETE FROM \`${table}\` WHERE tenant_id=?`,[fixture.tenant]);
        await connection.query('DELETE FROM tenant WHERE id=?',[fixture.tenant]);
      }else throw new Error('Unknown action');
    }
    await connection.commit();process.stdout.write('{}');
  }
}catch{await connection.rollback();process.exitCode=1;}finally{connection.release();await pool.end();}
