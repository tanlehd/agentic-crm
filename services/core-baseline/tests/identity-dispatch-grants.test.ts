import {describe,it,expect} from 'vitest';
import type {Connection} from 'mysql2/promise';
import {applyRuntimeGrants,chatExclusiveTables} from '../src/kernel/database/runtime-grants.js';
import {applyIdentityDispatchGrants} from '../src/kernel/database/identity-dispatch-grants.js';
import {applyWorkloadGrants} from '../src/kernel/database/workload-grants.js';

describe('Identity dispatch privileges',()=>{
 it('ordinary runtime excludes every workload table and reader cannot mutate',async()=>{
  const names=['identity_workload_service','identity_workload_certificate','identity_workload_admission','identity_workload_event'];
  const sql:string[]=[];const c={query:async(q:string)=>{sql.push(q);return [names.map(name=>({name}))];}} as unknown as Connection;
  await applyRuntimeGrants(c,'synthetic_test','synthetic_app');expect(sql.some(q=>q.startsWith('GRANT'))).toBe(false);
  sql.length=0;await applyWorkloadGrants(c,'synthetic_test','workload_test');
  expect(sql.filter(q=>q.startsWith('GRANT')).every(q=>q.startsWith('GRANT SELECT ON'))).toBe(true);
  expect(sql.some(q=>q.includes('identity_workload_event'))).toBe(false);
  await expect(applyWorkloadGrants(c,'synthetic_test','root')).rejects.toThrow();
 });
 it('ordinary CRM provisioning excludes session references and all dispatch ledgers',async()=>{
  const sql:string[]=[];const c={query:async(q:string)=>{sql.push(q);return [[...['account','channel_connection','auth_session','account_credential','identity_dispatch_delegation','identity_dispatch_grant','identity_dispatch_request','identity_dispatch_event',...chatExclusiveTables].map(name=>({name}))]];}} as unknown as Connection;
  await applyRuntimeGrants(c,'synthetic_test','synthetic_app');
  const grants=sql.filter(q=>q.startsWith('GRANT'));expect(grants.some(q=>q.includes('channel_connection'))).toBe(true);
  expect(grants.some(q=>/identity_dispatch_|auth_session|account_credential/.test(q))).toBe(false);
  for(const table of chatExclusiveTables)expect(grants.some(q=>q.includes('`'+table+'`'))).toBe(false);
 });
 it('Identity provisioner limits audit to append-only and never grants other business domains',async()=>{
  const sql:string[]=[];const c={query:async(q:string)=>{sql.push(q);return [];}} as unknown as Connection;
  await applyIdentityDispatchGrants(c,'synthetic_test','identity_test');
  expect(sql.filter(q=>q.includes('identity_dispatch_event'))).toEqual([expect.stringMatching(/^GRANT SELECT,INSERT ON/)]);
  expect(sql.some(q=>/DELETE|DROP|ALL PRIVILEGES|account_credential|conversation|sales|connector/.test(q))).toBe(false);
  await expect(applyIdentityDispatchGrants(c,'bad;sql','identity_test')).rejects.toThrow();
  await expect(applyIdentityDispatchGrants(c,'synthetic_test','root')).rejects.toThrow();
 });
});
