import {describe,it,expect} from 'vitest';
import {WorkspaceIdentityPort} from '../src/modules/identity/workspace-port.js';
import {PLATFORM_TENANT_ID} from '../src/kernel/database/system-scope.js';
import type {TransactionScope} from '../src/kernel/tenancy/unit-of-work.js';

describe('Inbox authoring reference boundaries',()=>{
 it('does not access unrequested directories, and binds each requested query to its owner scope',async()=>{
   const calls:{sql:string;args:unknown[]}[]=[],tenant='12345678-1234-1234-1234-123456789012';
   const scope={context:{tenantId:tenant},query:async(sql:string,args:unknown[])=>{calls.push({sql,args});return [];}} as unknown as TransactionScope;
   const port=new WorkspaceIdentityPort();expect(await port.inboxOptions(scope,false,false)).toEqual({teams:[],principals:[]});expect(calls).toHaveLength(0);
   await port.inboxOptions(scope,true,true);expect(calls).toHaveLength(2);expect(calls[0]!.args).toEqual([tenant]);expect(calls[1]!.args).toEqual([PLATFORM_TENANT_ID,tenant]);
   expect(calls[1]!.sql).toContain("p.kind='human'");expect(calls[1]!.sql).toContain("a.native_status='active'");
 });
 it('fails explicitly rather than silently truncating either reference directory',async()=>{
   for(const [teams,principals,n] of [[true,false,201],[false,true,501]] as const){
     const scope={context:{tenantId:'12345678-1234-1234-1234-123456789012'},query:async()=>Array(n).fill({id:'synthetic',name:'Synthetic'})} as unknown as TransactionScope;
     await expect(new WorkspaceIdentityPort().inboxOptions(scope,teams,principals)).rejects.toMatchObject({status:422,code:'OPTIONS_LIMIT_EXCEEDED'});
   }
 });
});
