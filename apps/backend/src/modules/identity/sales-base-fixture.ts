import type { DataSource } from 'typeorm';
import { fixtureId,seedGuard } from './seed.js';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
// Explicit local synthetic fixture addition; never overwrites existing roles/permissions.
export async function seedSalesBase(source:DataSource,env=process.env){
  seedGuard(env);if(source.options.type!=='mysql'||source.options.database!==env.MYSQL_DATABASE||source.options.host!==env.MYSQL_HOST)throw new Error('SEED_DATABASE_DENIED');
  const uow=new UnitOfWork(source);
  for(const label of ['alpha','beta'])await uow.run({tenantId:fixtureId(`clinic_${label}`)},async s=>{
    for(const user of [label+'_admin',...(label==='alpha'?['sales_binh','sales_chi']:[])]){
      const principal=fixtureId(`${label}:human:${user}`),role=fixtureId(`${label}:role:sales_base:${user}`),scope=user.endsWith('_admin')?'all':'own';
      if(!(await s.query('SELECT id FROM principal WHERE tenant_id=? AND id=?',[s.context.tenantId,principal]))[0])throw new Error('SEED_IDENTITY_REQUIRED');
      if((await s.query('SELECT id FROM role WHERE tenant_id=? AND id=?',[s.context.tenantId,role]))[0])continue;
      const permissions=[...['read','create','update'].map(action=>({resource:'deal',action,scope})),...['read','create','qualify'].map(action=>({resource:'lead',action,scope})),{resource:'report',action:'read',scope:'all'}];
      await s.query('INSERT INTO role(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[role,s.context.tenantId,'sales_base_'+user,'Sales base fixture',JSON.stringify(permissions)]);
      await s.query('INSERT INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?)',[s.context.tenantId,principal,role]);
      await s.query('UPDATE principal SET version=version+1,auth_revision=auth_revision+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[s.context.tenantId,principal]);
      const [r]=await s.query('SELECT version,auth_revision FROM principal WHERE tenant_id=? AND id=?',[s.context.tenantId,principal]);
      await new DurableCommands().fixtureAccessChanged(s,{id:principal,version:String(r.version),auth_revision:String(r.auth_revision)},'sales-base-fixture-v1');
      await new DurableCommands().systemAudit(s,'sales-base-fixture-v1','role',role,'sales_base.bootstrap',['permissions']);
    }
  });
}
