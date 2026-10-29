// Operator only. Runtime must never import or invoke this migration runner.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import {identifier,SYSTEM_TENANT,session} from './database.js';

export type Column={name:string;type:string;nullable:boolean;default?:string|null;extra?:string;generated?:string};
export type ForeignKey={constraint_name:string;target_table:string;columns:{source_column:string;target_column:string}[];update_rule:string;delete_rule:string};
export type Table={name:string;scope:string;legacy:boolean;columns:Column[];keys:{name:string;unique:boolean;columns:{name:string;prefix?:number|null}[]}[];checks:string[];foreignKeys:ForeignKey[];grants:Record<string,string[]>};
export const sha=(value:string|Buffer):string=>createHash('sha256').update(value).digest('hex');
const folder=new URL('../migrations/',import.meta.url);
const text=async(name:string):Promise<string>=>(await readFile(new URL(name,folder),'utf8')).replaceAll('\r\n','\n');
export async function artifacts():Promise<{tables:Table[];steps:{version:number;name:string;checksum:string;statements:string[]}[]}> {
  const checks=JSON.parse(await text('checksums.json')) as Record<string,string>;
  for(const [file,digest] of Object.entries(checks))if(sha(await text(file))!==digest)throw new Error('IMMUTABLE_MIGRATION_DRIFT');
  const dictionary=JSON.parse(await text('dictionary.json')) as {tables:Table[]};
  return {tables:dictionary.tables,steps:await Promise.all(['chat001-owned-storage.sql','chat002-local-constraints.sql'].map(async(name,n)=>({version:n+1,name,checksum:checks[name]!,statements:(await text(name)).split(/;\s*(?:\n|$)/).map(s=>s.trim()).filter(Boolean)})))};
}
function same(a:unknown,b:unknown,code:string):void{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('SCHEMA_DRIFT_'+code);}
// ALTER rebuilds may render ASCII literal bytes as _ascii rather than _utf8mb4.
// Only this lossless introducer change is normalized; grouping/operators remain.
function mysqlExpression(value:string):string{return value.replace(/_(?:ascii|utf8mb4)(\\?'[\x20-\x7e]*?\\?')/g,'$1');}
export async function verifyTable(c:PoolConnection,t:Table,requireForeignKeys=false):Promise<void> {
  // Exact server-rendered expressions from the fresh native DDL rehearsal, pinned
  // alongside the SQL. Never erase parentheses or infer equivalence from tokens.
  const golden=JSON.parse(await text('mysql84-metadata.json')) as {columns:RowDataPacket[];checks:RowDataPacket[]};
  const [base]=await c.query<RowDataPacket[]>('SELECT ENGINE,TABLE_COLLATION,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[t.name]);
  if(base[0]?.ENGINE!=='InnoDB'||base[0]?.TABLE_COLLATION!=='utf8mb4_0900_as_cs'||base[0]?.TABLE_TYPE!=='BASE TABLE')throw new Error('SCHEMA_DRIFT_TABLE_'+t.name);
  const [cols]=await c.query<RowDataPacket[]>('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,GENERATION_EXPRESSION,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[t.name]);
  same(cols.length,t.columns.length,t.name+'_COLUMNS');
  for(const [n,col] of t.columns.entries()){
    const row=cols[n]!;
    same(row.COLUMN_NAME,col.name,t.name+'_COLUMN');
    same(String(row.COLUMN_TYPE).toLowerCase(),col.type.split(/ CHARACTER SET /i)[0]!.toLowerCase(),t.name+'_'+col.name+'_TYPE');
    same(row.COLLATION_NAME,col.type.match(/COLLATE (\w+)/i)?.[1]??null,t.name+'_'+col.name+'_COLLATION');
    if(!col.generated)same(row.IS_NULLABLE,col.nullable?'YES':'NO',t.name+'_'+col.name+'_NULL');
    const canonical=golden.columns.find(r=>r.TABLE_NAME===t.name&&r.COLUMN_NAME===col.name);
    same([row.COLUMN_DEFAULT,row.GENERATION_EXPRESSION,row.EXTRA],[canonical?.COLUMN_DEFAULT,canonical?.GENERATION_EXPRESSION,canonical?.EXTRA],t.name+'_'+col.name+'_EXPRESSION');
  }
  const [indexes]=await c.query<RowDataPacket[]>('SELECT INDEX_NAME,NON_UNIQUE,COLUMN_NAME,SUB_PART,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX',[t.name]);
  const expected=t.keys.flatMap(k=>k.columns.map((v,n)=>[k.name,k.unique?0:1,v.name,v.prefix??null,n+1])).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))||Number(a[4])-Number(b[4]));
  const actual=indexes.map(r=>[r.INDEX_NAME,Number(r.NON_UNIQUE),r.COLUMN_NAME,r.SUB_PART==null?null:Number(r.SUB_PART),Number(r.SEQ_IN_INDEX)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))||Number(a[4])-Number(b[4]));
  same(actual,expected,t.name+'_INDEXES');
  const [checks]=await c.query<RowDataPacket[]>('SELECT cc.CONSTRAINT_NAME,cc.CHECK_CLAUSE,tc.ENFORCED FROM information_schema.CHECK_CONSTRAINTS cc JOIN information_schema.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_SCHEMA=cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME=cc.CONSTRAINT_NAME WHERE tc.TABLE_SCHEMA=DATABASE() AND tc.TABLE_NAME=?',[t.name]);
  same(checks.length,t.checks.length,t.name+'_CHECKS');
  for(const [n] of t.checks.entries()){
    const found=checks.find(r=>r.CONSTRAINT_NAME===`ck_${t.name}_${n+1}`);
    if(!found||found.ENFORCED!=='YES')throw new Error('SCHEMA_DRIFT_CHECK_'+t.name);
    same(mysqlExpression(found.CHECK_CLAUSE),mysqlExpression(golden.checks.find(r=>r.TABLE_NAME===t.name&&r.CONSTRAINT_NAME===found.CONSTRAINT_NAME)?.CHECK_CLAUSE??''),t.name+'_CHECK_'+(n+1));
  }
  const [foreign]=await c.query<RowDataPacket[]>('SELECT k.CONSTRAINT_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_SCHEMA,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,k.ORDINAL_POSITION,r.UPDATE_RULE,r.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME=? AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.CONSTRAINT_NAME,k.ORDINAL_POSITION',[t.name]);
  const [db]=await c.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  for(const r of foreign){
    const fk=t.foreignKeys.find(f=>f.constraint_name===r.CONSTRAINT_NAME),col=fk?.columns[Number(r.ORDINAL_POSITION)-1];
    same([r.REFERENCED_TABLE_SCHEMA,r.REFERENCED_TABLE_NAME,r.COLUMN_NAME,r.REFERENCED_COLUMN_NAME,r.UPDATE_RULE,r.DELETE_RULE],[db[0]!.name,fk?.target_table,col?.source_column,col?.target_column,fk?.update_rule,fk?.delete_rule],t.name+'_FK');
  }
  if(requireForeignKeys)same(foreign.length,t.foreignKeys.reduce((n,f)=>n+f.columns.length,0),t.name+'_FK_COUNT');
}
export async function migrate(pool:Pool,through:1|2,options:{validated?:()=>Promise<void>;afterStatement?:(version:number,index:number)=>Promise<void>}={}):Promise<number> {
  const {tables,steps}=await artifacts(),c=await pool.getConnection();let lock='';
  try{
    await session(c);const [db]=await c.query<RowDataPacket[]>('SELECT DATABASE() AS name');lock='chat:migrate:'+db[0]!.name;
    const [locked]=await c.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS ok',[lock]);if(Number(locked[0]!.ok)!==1)throw new Error('MIGRATION_BUSY');
    const qualify=(sql:string)=>sql.replaceAll('`crm_chat`',identifier(db[0]!.name));
    const [inventory]=await c.query<RowDataPacket[]>('SELECT TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    if(inventory.some(r=>r.TABLE_TYPE!=='BASE TABLE'||!tables.some(t=>t.name===r.TABLE_NAME)))throw new Error('SCHEMA_DRIFT_UNEXPECTED_TABLE');
    const [triggers]=await c.query<RowDataPacket[]>('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()');
    if(triggers.length)throw new Error('SCHEMA_DRIFT_TRIGGER');
    const exists=async(table:string)=>{const [r]=await c.query<RowDataPacket[]>('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[table]);return r.length>0;};
    const journal=tables.find(t=>t.name==='schema_migration')!;
    if(!await exists(journal.name))await c.query(qualify(steps[0]!.statements.find(s=>s.startsWith('CREATE TABLE `crm_chat`.`schema_migration`'))!));
    await verifyTable(c,journal);
    const [rows]=await c.query<RowDataPacket[]>('SELECT * FROM schema_migration ORDER BY version');
    for(const [i,row] of rows.entries()){
      const m=steps[i];if(!m||row.tenant_id!==SYSTEM_TENANT||Number(row.version)!==m.version||row.name!==m.name||row.checksum!==m.checksum||!['started','applied','failed'].includes(row.state)||row.state!=='applied'&&i!==rows.length-1||(row.state==='applied')!==(row.applied_at!==null))throw new Error('JOURNAL_DRIFT');
    }
    let applied=0;
    for(const step of steps.filter(s=>s.version<=through)){
      const old=rows.find(r=>Number(r.version)===step.version);
      if(step.version===2&&old?.state!=='applied'){if(!options.validated)throw new Error('RECONCILIATION_REQUIRED');await options.validated();}
      if(!old)await c.execute("INSERT INTO schema_migration(tenant_id,version,name,checksum,state,started_at) VALUES (?,?,?,?,'started',UTC_TIMESTAMP(6))",[SYSTEM_TENANT,step.version,step.name,step.checksum]);
      try{
        for(const [i,sql] of step.statements.entries()){
          const name=sql.match(/(?:CREATE|ALTER) TABLE `crm_chat`\.`(\w+)`/)?.[1];const t=tables.find(t=>t.name===name);if(!t)throw new Error('MIGRATION_FORMAT');
          if(step.version===1){if(!await exists(t.name)){if(old?.state==='applied')throw new Error('APPLIED_TABLE_MISSING');await c.query(qualify(sql));}await verifyTable(c,t);}
          else {
            await verifyTable(c,t);const fk=sql.match(/ADD CONSTRAINT `(\w+)`/)?.[1];
            const [present]=await c.query<RowDataPacket[]>('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?',[t.name,fk]);
            if(!present.length){if(old?.state==='applied')throw new Error('APPLIED_FK_MISSING');await c.query(qualify(sql));}
          }
          await options.afterStatement?.(step.version,i);
        }
        if(step.version===2)for(const t of tables)await verifyTable(c,t,true);
        if(old?.state!=='applied'){await c.execute("UPDATE schema_migration SET state='applied',applied_at=UTC_TIMESTAMP(6),error_code=NULL WHERE tenant_id=? AND version=?",[SYSTEM_TENANT,step.version]);applied++;}
      }catch(error){
        if(old?.state!=='applied')await c.execute("UPDATE schema_migration SET state='failed',error_code='OPERATOR_REVIEW' WHERE tenant_id=? AND version=?",[SYSTEM_TENANT,step.version]);
        throw error;
      }
    }
    return applied;
  }finally{try{if(lock)await c.query('SELECT RELEASE_LOCK(?)',[lock]);}finally{c.release();}}
}
