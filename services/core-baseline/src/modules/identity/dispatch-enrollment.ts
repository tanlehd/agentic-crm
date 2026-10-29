import {randomUUID} from 'node:crypto';
import type {DataSource} from 'typeorm';
import {UnitOfWork} from '../../kernel/tenancy/unit-of-work.js';
import {AccessError,IdentityAuthorization,requireActiveTenant} from './authorization.js';
import {CommandError} from '../../kernel/reliability/commands.js';
import {lockedNativeSession} from './auth/locked-session.js';

/** Local native controller port only. No caller-provided principal or RPC verifier. */
export class HumanDispatchEnrollment {
 private readonly uow:UnitOfWork;
 private readonly auth:IdentityAuthorization;
 constructor(source:DataSource){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
 enroll(tenant:string,verifier:string){return this.uow.run({tenantId:tenant},async s=>{
  await requireActiveTenant(s);
  const session=await lockedNativeSession(s,verifier),access=await this.auth.loadHuman(s,session.accountId),id=randomUUID();
  await s.query('INSERT INTO identity_dispatch_delegation(tenant_id,id,principal_id,session_hash,principal_revision,security_revision,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,id,access.principalId,verifier,access.revision,session.securityRevision]);
  return {delegationId:id,principalId:access.principalId};
 }).catch(error=>{if(error instanceof AccessError)throw new CommandError(403,error.code);throw error;});}
}
