import { createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { seedGuard,fixtureId } from '../identity/seed.js';
import { ingressFixture } from '../identity/ingress-fixture.js';
import { requireActiveTenant,validateOwnershipTarget } from '../identity/authorization.js';
import { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
import { validateJournal } from '../../kernel/database/migration-runner.js';
import { migrations } from '../../kernel/database/migrations.js';
export async function seedChannels(source:DataSource,tokens:{alpha:string;beta:string},env=process.env){
  seedGuard(env);if(source.options.type!=='mysql'||source.options.host!==env.MYSQL_HOST||source.options.database!==env.MYSQL_DATABASE)throw new Error('SEED_DATABASE_DENIED');
  if(!tokens||Object.keys(tokens).length!==2||![tokens.alpha,tokens.beta].every(t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t))||tokens.alpha===tokens.beta)throw new Error('SEED_INVALID_CREDENTIAL');
  validateJournal(await source.query('SELECT * FROM schema_migration ORDER BY version'),migrations,true);
  return seedBoth(source,tokens);
}
async function seedBoth(source:DataSource,tokens:{alpha:string;beta:string}){
  const runner=source.createQueryRunner();await runner.connect();const scopes:TransactionScope[]=[];
  try{await runner.startTransaction('READ COMMITTED');let created=0,existing=0;
    for(const label of ['alpha','beta'] as const){
      const tenant=fixtureId(`clinic_${label}`),s=new TransactionScope({tenantId:tenant},runner);scopes.push(s);await requireActiveTenant(s,true);
      const id=(key:string)=>fixtureId(`${label}:${key}`),connection=id('mock_connection'),actor=id('mock_ingress_service'),team=id('team:intake'),hash=createHash('sha256').update(tokens[label]).digest('hex');
      const [row]=await s.query('SELECT * FROM channel_connection WHERE tenant_id=? AND id=?',[tenant,connection]);
      await ingressFixture(s,{role:id('role:mock_ingress'),actor,operatorRole:id('role:integration_operator'),admin:id(`human:${label}_admin`)},!!row);
      if(row){if(row.credential_hash!==hash||row.service_actor_id!==actor||row.team_id!==team||row.provider!=='mock_messenger')throw new Error('SEED_MAPPING_CHANGED');existing++;continue;}
      await validateOwnershipTarget(s,null,team);
      await s.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,team_id,service_actor_id,credential_hash) VALUES (?,?,'mock_messenger',?,?,?,?)",[connection,tenant,`synthetic-${label}-page`,team,actor,hash]);
      await new DurableCommands().systemAudit(s,'channels-fixture-v1','connection',connection,'channels.bootstrap.v1',['configuration']);created++;
    }await runner.commitTransaction();return {created,existing};
  }catch(e){if(runner.isTransactionActive)await runner.rollbackTransaction();throw e;}finally{for(const s of scopes)s.close();await runner.release();}
}
