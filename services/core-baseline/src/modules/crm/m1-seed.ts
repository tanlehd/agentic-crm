import type { DataSource } from 'typeorm';
import { fixtureId,seedGuard } from '../identity/seed.js';
import { grantM1Fixture } from '../identity/crm-fixture.js';
import { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
import { validateJournal } from '../../kernel/database/migration-runner.js';
import { migrations } from '../../kernel/database/migrations.js';
const specs={appointment:[['title','Tên cuộc hẹn','string',true],['starts','Bắt đầu (UTC)','datetime',false],['stage','Trạng thái hẹn','enum',false]],service_offering:[['name_label','Tên dịch vụ','string',true],['category','Nhóm dịch vụ','enum',false],['list_price','Giá niêm yết','decimal',false]]} as const;
export async function seedM1(source:DataSource,env:NodeJS.ProcessEnv=process.env){
  seedGuard(env);if(source.options.type!=='mysql'||source.options.host!==env.MYSQL_HOST||source.options.database!==env.MYSQL_DATABASE)throw new Error('SEED_DATABASE_DENIED');
  validateJournal(await source.query('SELECT * FROM schema_migration ORDER BY version'),migrations,true);
  const runner=source.createQueryRunner();await runner.connect();const scopes:TransactionScope[]=[];
  try{const [lock]=await runner.query("SELECT GET_LOCK('crm:m1:fixture:v3',10) acquired");if(Number(lock.acquired)!==1)throw new Error('SEED_LOCK_BUSY');await runner.startTransaction('READ COMMITTED');let created=0,existing=0;
    for(const label of ['alpha','beta']){
      const tenant=fixtureId(`clinic_${label}`),scope=new TransactionScope({tenantId:tenant},runner);scopes.push(scope);
      if(!(await scope.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[tenant]))[0])throw new Error('SEED_IDENTITY_REQUIRED');
      const commands=new DurableCommands();
      if(await commands.m1BootstrapExists(scope)){
        for(const key of Object.keys(specs))if(!(await scope.query('SELECT id FROM object_type WHERE tenant_id=? AND id=? AND `key`=?',[tenant,fixtureId(`${label}:object:${key}`),key]))[0])throw new Error('SEED_INCOMPLETE');existing++;continue;
      }
      if(!await commands.registryBootstrapExists(scope))throw new Error('SEED_REGISTRY_REQUIRED');
      await grantM1Fixture(scope,label);
      for(const [key,props] of Object.entries(specs)){
        const type=fixtureId(`${label}:object:${key}`);await scope.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,schema_version,version,created_at,updated_at) VALUES (?,?,?,?,'custom',4,4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[type,tenant,key,key==='appointment'?'Appointment':'ServiceOffering']);
        for(const [field,title,kind,required] of props){const options=kind==='enum'?JSON.stringify(field==='stage'?['planned','confirmed','cancelled']:['consultation','follow_up']):null;
          await scope.query('INSERT INTO property_definition(id,tenant_id,object_type_id,`key`,label,type,required,indexed,`sensitive`,options,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,0,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[fixtureId(`${label}:${key}:property:${field}`),tenant,type,field,title,kind,required,options]);
        }
        await scope.query("INSERT INTO form_definition(id,tenant_id,object_type_id,`key`,fields,created_at,updated_at) VALUES (?,?,?,'default',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[fixtureId(`${label}:${key}:form`),tenant,type,JSON.stringify(props.map(p=>p[0]))]);
        await scope.query("INSERT INTO view_definition(id,tenant_id,object_type_id,`key`,columns,filter,sort,created_at,updated_at) VALUES (?,?,?,'default',?,JSON_ARRAY(),NULL,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[fixtureId(`${label}:${key}:view`),tenant,type,JSON.stringify(props.map(p=>p[0]))]);
      }
      for(const [key,source,target,labelText] of [['contact_appointment','contact','appointment','Cuộc hẹn'],['appointment_service','appointment','service_offering','Dịch vụ'],['contact_company','contact','company','Công ty']])await scope.query("INSERT INTO association_type(id,tenant_id,`key`,label,source_object_type_id,target_object_type_id,cardinality,created_at,updated_at) VALUES (?,?,?,?,?,?,'many_to_many',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[fixtureId(`${label}:association:${key}`),tenant,key,labelText,fixtureId(`${label}:object:${source}`),fixtureId(`${label}:object:${target}`)]);
      await commands.m1Bootstrapped(scope);created++;
    }
    await runner.commitTransaction();return {created,existing};
  }catch(error){if(runner.isTransactionActive)await runner.rollbackTransaction();throw error;}
  finally{for(const scope of scopes)scope.close();await runner.query("SELECT RELEASE_LOCK('crm:m1:fixture:v3')").catch(()=>{});await runner.release();}
}
