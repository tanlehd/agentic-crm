import type { DataSource } from 'typeorm';
import { fixtureId,seedGuard } from '../identity/seed.js';
import { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
import { validateJournal } from '../../kernel/database/migration-runner.js';
import { migrations } from '../../kernel/database/migrations.js';
import { standardKeys } from './platform.js';
export async function seedRegistry(source:DataSource,env:NodeJS.ProcessEnv=process.env){
  seedGuard(env);
  if(source.options.type!=='mysql'||source.options.host!==env.MYSQL_HOST||source.options.database!==env.MYSQL_DATABASE)throw new Error('SEED_DATABASE_DENIED');
  validateJournal(await source.query('SELECT * FROM schema_migration ORDER BY version'),migrations,true);
  const runner=source.createQueryRunner();await runner.connect();
  try{
    const [lock]=await runner.query("SELECT GET_LOCK('crm:registry:fixture:v2',10) acquired");if(Number(lock.acquired)!==1)throw new Error('SEED_LOCK_BUSY');
    await runner.startTransaction('READ COMMITTED');
    const commands=new DurableCommands();
    const scopes:TransactionScope[]=[];
    try {
      let created=0,existing=0;
      for(const label of ['alpha','beta']){
        const tenant=fixtureId(`clinic_${label}`);
        const scoped=new TransactionScope({tenantId:tenant},runner);scopes.push(scoped);
        const tenants=await scoped.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[tenant]);if(!tenants[0])throw new Error('SEED_IDENTITY_REQUIRED');
        const done=await commands.registryBootstrapExists(scoped);
        const rows=await scoped.query('SELECT id,`key`,kind FROM object_type WHERE tenant_id=?',[tenant]);
        if(done){
          for(const key of standardKeys)if(!rows.some((r:any)=>r.id===fixtureId(`${label}:object:${key}`)&&r.key===key&&r.kind==='standard'))throw new Error('SEED_INCOMPLETE');
          existing++;continue;
        }
        if(rows.some((r:any)=>standardKeys.includes(r.key)))throw new Error('SEED_CONFLICT');
        for(const key of standardKeys)await scoped.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[fixtureId(`${label}:object:${key}`),tenant,key,key]);
        await commands.registryBootstrapped(scoped,'registry-fixture-v2');created++;
      }
      await runner.commitTransaction();return {created,existing};
    }catch(error){if(runner.isTransactionActive)await runner.rollbackTransaction();throw error;}
    finally{for(const scope of scopes)scope.close();}
  }finally{await runner.query("SELECT RELEASE_LOCK('crm:registry:fixture:v2')").catch(()=>{});await runner.release();}
}
