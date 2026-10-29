import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const require=createRequire(new URL('../../services/core-baseline/package.json',import.meta.url));
const mysql=require('mysql2/promise');
export const systemTenant='01900000-0000-7000-8000-000000000001';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function connect(env,role='OPERATOR'){
 if(!['crm_marketing','test_crm_marketing'].includes(env.MARKETING_DB_NAME)||env.MARKETING_DB_HOST!=='127.0.0.1'||env.MARKETING_DB_PORT!=='13306')throw new Error('LOCAL_MARKETING_DATABASE_ONLY');
 const c=await mysql.createConnection({host:env.MARKETING_DB_HOST,port:Number(env.MARKETING_DB_PORT),database:env.MARKETING_DB_NAME,user:env[`MARKETING_${role}_USER`],password:env[`MARKETING_${role}_PASSWORD`],supportBigNumbers:true,bigNumberStrings:true,dateStrings:true,timezone:'Z'});
 await c.query("SET SESSION time_zone='+00:00'");
 await c.query("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");return c;
}
export async function migrate(c){
 const [[{db}]]=await c.query('SELECT DATABASE() db');
 if(!['crm_marketing','test_crm_marketing'].includes(db))throw new Error('DATABASE_DENIED');
 const [[{locked}]]=await c.execute('SELECT GET_LOCK(?,10) locked',[`${db}:marketing:migration`]);
 if(Number(locked)!==1)throw new Error('MIGRATION_LOCK_UNAVAILABLE');
 try{
  await c.query(`CREATE TABLE IF NOT EXISTS schema_migration (
   tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
   version INT UNSIGNED NOT NULL, step INT UNSIGNED NOT NULL,
   checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
   applied_at DATETIME(6) NOT NULL,
   PRIMARY KEY (tenant_id,version,step),
   CHECK (tenant_id='${systemTenant}')
  ) ENGINE=InnoDB COMMENT='Marketing system-scope immutable migration journal'`);
  const steps=[];
  for(const [version,file,count] of [[1,'001-storage.sql',23],[2,'002-sync-control.sql',6],[3,'003-control-tenant-validation.sql',2]]){
   const sql=await readFile(new URL('../../services/marketing/database/migrations/'+file,import.meta.url),'utf8');
   const statements=sql.replace(/^--.*$/gm,'').split(/;\r?\n/).map(x=>x.trim()).filter(Boolean);
   if(statements.length!==count||statements.some(sql=>!/^(CREATE|ALTER) TABLE marketing_[a-z_]+\b/.test(sql)))throw new Error('MIGRATION_MANIFEST_INVALID');
   steps.push(...statements.map((sql,i)=>({version,step:i+1,sql,checksum:digest(sql)})));
  }
  const [journal]=await c.query('SELECT tenant_id,version,step,checksum FROM schema_migration ORDER BY version,step');
  for(let i=0;i<journal.length;i++){
   const row=journal[i],expected=steps[i];if(!expected||row.tenant_id!==systemTenant||row.version!==expected.version||row.step!==expected.step||row.checksum!==expected.checksum)throw new Error('MIGRATION_JOURNAL_DRIFT');
  }
  let applied=0;
  for(let i=journal.length;i<steps.length;i++){
   const step=steps[i];
   await c.query(step.sql); // DDL auto-commits. Crash before journal requires inspection, never DROP/replay blindly.
   await c.execute('INSERT INTO schema_migration (tenant_id,version,step,checksum,applied_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[systemTenant,step.version,step.step,step.checksum]);applied++;
  }
  return {version:3,applied,totalSteps:steps.length};
 }finally{await c.execute('SELECT RELEASE_LOCK(?)',[`${db}:marketing:migration`]);}
}
