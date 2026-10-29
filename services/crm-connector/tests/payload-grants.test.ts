import { describe,it,expect } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { grantRuntime } from '../src/grants.js';

describe('payload runtime grant boundary',()=>{
 it('grants append-only payload and request access without update/delete/DDL',async()=>{
  const statements:string[]=[];
  const c={release(){},async query(sql:string){
   statements.push(sql);
   if(sql.startsWith('SELECT CURRENT_USER'))return [[{db:'test_connector',runtime_actor:'operator@%'}]];
   if(sql.startsWith('SHOW GRANTS'))return [[{grant:'GRANT USAGE ON *.* TO `runtime`@`%`'}]];
   return [[]];
  }};
  await grantRuntime({getConnection:async()=>c} as unknown as Pool,'test_connector','runtime','x'.repeat(32));
  const payload=statements.filter(sql=>sql.startsWith('GRANT') && /connector_(dispatch_payload|payload_request)/.test(sql));
  expect(payload).toHaveLength(2);
  for(const sql of payload)expect(sql).toMatch(/^GRANT SELECT, INSERT ON /);
  expect(statements.filter(sql=>sql.startsWith('GRANT') && sql.includes('connector_dispatch_guard'))).toEqual(["GRANT SELECT, INSERT, UPDATE ON `test_connector`.`connector_dispatch_guard` TO ?@'%'"]);
  expect(statements.filter(sql=>sql.startsWith('GRANT') && sql.includes('connector_dispatch_request'))).toEqual(["GRANT SELECT, INSERT ON `test_connector`.`connector_dispatch_request` TO ?@'%'"]);
  expect(statements.filter(sql=>sql.startsWith('GRANT') && sql.includes('connector_attempt_event'))).toEqual(["GRANT SELECT, INSERT ON `test_connector`.`connector_attempt_event` TO ?@'%'"]);
 });
 it('rejects an existing account with unrelated database privileges',async()=>{
  const c={release(){},async query(sql:string){
   if(sql.startsWith('SELECT CURRENT_USER'))return [[{db:'test_connector',runtime_actor:'operator@%'}]];
   if(sql.startsWith('SHOW GRANTS'))return [[{grant:'GRANT ALL PRIVILEGES ON *.* TO `runtime`@`%`'}]];
   return [[]];
  }};
  await expect(grantRuntime({getConnection:async()=>c} as unknown as Pool,'test_connector','runtime','x'.repeat(32))).rejects.toThrow('UNSAFE_EXISTING_GRANTS');
 });
});
