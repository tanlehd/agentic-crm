// Run inside the built Chat image against retained synthetic history; SELECT only.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
const require=createRequire('/app/package.json'),{createPool}=require('mysql2/promise');
const {ChatHistory,historyOperations}=await import('/app/dist/history.js');
const env=parseEnv(await readFile('/probe/.env','utf8')),fixture=JSON.parse(await readFile('/probe/history.json','utf8'));
assert.equal(env.APP_ENV,'development');assert.equal(fixture.chatDatabase,'test_crm_chat_owner');
const pool=createPool({host:'127.0.0.1',port:13306,user:'root',password:env.MYSQL_ROOT_PASSWORD,database:fixture.chatDatabase,dateStrings:true,jsonStrings:true,timezone:'Z'});
try{
 const [[row]]=await pool.execute('SELECT tenant_id,connection_id FROM conversation WHERE record_id=?',[fixture.conversation]);assert(row);
 const history=new ChatHistory({}, {}, 'synthetic-probe-key'.repeat(3));let queries=0;
 const c={execute:async(sql,args)=>{assert.match(sql,/^SELECT /);queries++;return pool.execute(sql,args);}};
 const run=(id,allowed,limit=50)=>history.timeline(c,row.tenant_id,id,row.connection_id,{operation:historyOperations.rich,payload:{limit}},'00000000-0000-4000-8000-000000000001',undefined,allowed,'mock_messenger');
 const small=await run(fixture.conversation,true);assert.deepEqual(small.data.map(m=>m.id),fixture.messages);assert.equal(small.data[1].reply_to.internal_message_id,fixture.messages[0]);assert.equal(small.data[2].reply_to.internal_message_id,null);assert.equal(queries,3);
 queries=0;const denied=await run(fixture.conversation,false);assert.equal(queries,2);for(const m of denied.data)for(const field of ['text','reply_to','attachment'])assert(!Object.hasOwn(m,field));
 queries=0;const start=performance.now(),large=await run(fixture.largeConversation,true,100);assert.deepEqual(large.data.map(m=>m.id),fixture.largeMessages);assert.equal(large.next_cursor,null);assert.equal(queries,2);
 console.log(JSON.stringify({status:'PASS',checks:['retained rich replies','cross-conversation reply unresolved','field denial','100-message page'],largePageMs:Math.round(performance.now()-start),largePageQueries:queries,reset:false}));
}finally{await pool.end();}
