import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const mysql=createRequire(new URL('../../apps/backend/package.json',import.meta.url))('mysql2/promise');
export const systemTenant='01900000-0000-7000-8000-000000000001';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function connect(env,role='OPERATOR'){
 if(!['crm_reporting','test_crm_reporting'].includes(env.REPORTING_DB_NAME)||env.REPORTING_DB_HOST!=='127.0.0.1'||env.REPORTING_DB_PORT!=='13306')throw new Error('LOCAL_REPORTING_ONLY');
 const c=await mysql.createConnection({host:env.REPORTING_DB_HOST,port:13306,database:env.REPORTING_DB_NAME,user:env[`REPORTING_${role}_USER`],password:env[`REPORTING_${role}_PASSWORD`],supportBigNumbers:true,bigNumberStrings:true,dateStrings:true,timezone:'Z'});
 await c.query("SET SESSION time_zone='+00:00'");return c;
}
export async function migrate(c){
 const [[{db}]]=await c.query('SELECT DATABASE() db');if(!['crm_reporting','test_crm_reporting'].includes(db))throw new Error('DATABASE_DENIED');
 const [[{locked}]]=await c.execute('SELECT GET_LOCK(?,10) locked',[db+':reporting:migration']);if(Number(locked)!==1)throw new Error('MIGRATION_LOCK_UNAVAILABLE');
 try{
  await c.query(`CREATE TABLE IF NOT EXISTS schema_migration (tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,version INT UNSIGNED NOT NULL,step INT UNSIGNED NOT NULL,checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,applied_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,version,step),CHECK(tenant_id='${systemTenant}')) ENGINE=InnoDB COMMENT='Reporting system-scoped immutable migration journal'`);
  const steps=[];for(const [version,file,count]of [[1,'001-definitions.sql',6],[2,'002-projections.sql',5],[3,'003-runs.sql',2],[4,'004-dashboards.sql',6],[5,'005-connected-catalog.sql',2],[6,'006-conversion-catalog.sql',1]]){
   const source=await readFile(new URL('../../services/reporting/database/migrations/'+file,import.meta.url),'utf8');
   const statements=source.replace(/^--.*$/gm,'').split(/;\r?\n/).map(s=>s.trim()).filter(Boolean);if(statements.length!==count||statements.some(s=>!/^CREATE TABLE (report|dashboard)_[a-z_]+\b/.test(s)&&!(version===5&&/^ALTER TABLE dashboard_widget\b/.test(s))&&!(version===6&&/^ALTER TABLE report_connected_catalog\b/.test(s))))throw new Error('MIGRATION_MANIFEST_INVALID');
   statements.forEach((sql,i)=>steps.push({version,step:i+1,sql}));
  }
  const [journal]=await c.query('SELECT tenant_id,version,step,checksum FROM schema_migration ORDER BY version,step');
  for(const [i,row] of journal.entries())if(!steps[i]||row.tenant_id!==systemTenant||row.version!==steps[i].version||row.step!==steps[i].step||row.checksum!==digest(steps[i].sql))throw new Error('MIGRATION_JOURNAL_DRIFT');
  for(let i=journal.length;i<steps.length;i++){const s=steps[i];await c.query(s.sql);await c.execute('INSERT INTO schema_migration VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[systemTenant,s.version,s.step,digest(s.sql)]);}
  return {version:6,applied:steps.length-journal.length,totalSteps:steps.length};
 }finally{await c.execute('SELECT RELEASE_LOCK(?)',[db+':reporting:migration']);}
}
