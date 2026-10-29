// Read-only D3 metadata/source inventory. Not a complete ownership or runtime boundary proof.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {sourceFiles} from './source-files.mjs';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
const base=parseEnv(await readFile('.env','utf8')),api=parseEnv(await readFile('.local/services/api.env','utf8'));
assert.equal(api.APP_ENV,'development');assert.equal(api.MYSQL_HOST,'127.0.0.1');assert.equal(api.MYSQL_PORT,'13306');assert.equal(api.MYSQL_DATABASE,'agentic_crm');Object.assign(process.env,base,api);
const source=databaseSource(true);await source.initialize();
try{
 const tables=await source.query("SELECT TABLE_NAME name,TABLE_COMMENT comment FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
 const names=new Set(tables.map(r=>r.name)),references=new Map(),dynamic=[],allReferences=[],imports=new Map(),sourceHashes={};
 const allFiles=(await sourceFiles('services/core-baseline/src')).map(p=>p.replaceAll('\\','/')).filter(p=>p.endsWith('.ts')&&!/\.(test|spec|d)\.ts$/.test(p)&&!p.includes('/tests/'));
 const files=allFiles.filter(p=>p.startsWith('services/core-baseline/src/modules/conversation/'));
 const fileSet=new Set(allFiles),chatSet=new Set(files);
 for(const file of allFiles){
  const content=await readFile(file,'utf8'),ast=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true);
  assert.equal(ast.parseDiagnostics.length,0,`Cannot parse ${file}`);
  sourceHashes[file]=createHash('sha256').update(content).digest('hex');
  const dependencies=new Set();imports.set(file,dependencies);
  const visit=node=>{
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteralLike(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('.')){
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),node.moduleSpecifier.text)).replace(/\.js$/,'.ts');
    if(fileSet.has(target))dependencies.add(target);
   }
   if(ts.isStringLiteralLike(node)||ts.isTemplateExpression(node)){
    const text=ts.isTemplateExpression(node)?node.head.text:node.text;
    if(/\b(?:SELECT|UPDATE|INSERT|DELETE)\b/i.test(text)){
     const line=ast.getLineAndCharacterOfPosition(node.getStart()).line+1;
     if(ts.isTemplateExpression(node)&&chatSet.has(file))dynamic.push({file,line,sha256:createHash('sha256').update(node.getText(ast)).digest('hex'),expressions:node.templateSpans.map(span=>span.expression.getText(ast))});
     const complete=ts.isTemplateExpression(node)?node.getText(ast):text;
     for(const match of complete.matchAll(/\b(FROM|JOIN|UPDATE|INTO)\s+(?:\\?`)?([a-z][a-z0-9_]*)/gi)){
      if(!names.has(match[2]))continue;
      allReferences.push({table:match[2],file,line,keyword:match[1].toUpperCase()});
      if(chatSet.has(file)){const refs=references.get(match[2])??[];refs.push({file,line});references.set(match[2],refs);}
     }
    }
   }
   ts.forEachChild(node,visit);
  };visit(ast);
 }
 const reachable=new Set(files),pending=[...files];
 while(pending.length){for(const dependency of imports.get(pending.pop())??[])if(!reachable.has(dependency)){reachable.add(dependency);pending.push(dependency);}}
 const fks=await source.query("SELECT TABLE_NAME source_table,CONSTRAINT_NAME constraint_name,COLUMN_NAME source_column,REFERENCED_TABLE_NAME target_table,REFERENCED_COLUMN_NAME target_column,ORDINAL_POSITION ordinal_position FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION");
 const relevant=fks.filter(r=>references.has(r.source_table)||references.has(r.target_table));
 const columns=await source.query('SELECT TABLE_NAME table_name,COLUMN_NAME name,ORDINAL_POSITION position,COLUMN_TYPE type,IS_NULLABLE nullable,COLUMN_DEFAULT default_value,EXTRA extra,GENERATION_EXPRESSION generation_expression,COLLATION_NAME collation_name,COLUMN_COMMENT comment FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');
 const indexes=await source.query('SELECT TABLE_NAME table_name,INDEX_NAME name,NON_UNIQUE non_unique,SEQ_IN_INDEX position,COLUMN_NAME column_name,SUB_PART prefix_length,INDEX_TYPE type,EXPRESSION expression FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX');
 const checks=await source.query("SELECT t.TABLE_NAME table_name,c.CONSTRAINT_NAME name,c.CHECK_CLAUSE clause FROM information_schema.TABLE_CONSTRAINTS t JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME WHERE t.TABLE_SCHEMA=DATABASE() AND t.CONSTRAINT_TYPE='CHECK' ORDER BY t.TABLE_NAME,c.CONSTRAINT_NAME");
 const rules=await source.query('SELECT TABLE_NAME source_table,CONSTRAINT_NAME constraint_name,UPDATE_RULE update_rule,DELETE_RULE delete_rule FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME');
 const constraints=rules.map(rule=>({...rule,columns:fks.filter(f=>f.source_table===rule.source_table&&f.constraint_name===rule.constraint_name)}));
 const report={at:new Date().toISOString(),readOnly:true,mainSchema:(await source.query("SELECT MAX(version) version FROM schema_migration WHERE state='applied'"))[0].version,filesScanned:files.length,physicalTables:tables.length,directlyReferencedTables:[...references].sort(([a],[b])=>a.localeCompare(b)).map(([table,refs])=>({table,references:refs})),dynamicSqlLocations:dynamic,foreignKeyColumns:relevant,
  schema:tables.map(table=>({...table,columns:columns.filter(c=>c.table_name===table.name),indexes:indexes.filter(i=>i.table_name===table.name),checks:checks.filter(c=>c.table_name===table.name)})),foreignKeys:constraints,
  source:{files:allFiles.length,hashes:sourceHashes,sqlReferences:allReferences,conservativeReachableFiles:[...reachable].sort(),externalSqlCandidates:allReferences.filter(r=>!chatSet.has(r.file)&&references.has(r.table)),reachableSqlCandidates:allReferences.filter(r=>!chatSet.has(r.file)&&reachable.has(r.file))},
  limitation:'Metadata and syntactic candidate inventory only. Import closure includes unused exports/types; SQL strings are not a call graph or write-set. Dynamic SQL/manual port and row-partition review remains required. No data rows copied.'};
 await mkdir('artifacts/chat-extraction',{recursive:true});await writeFile('artifacts/chat-extraction/inventory.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({readOnly:true,schema:report.mainSchema,files:files.length,backendFiles:allFiles.length,tables:tables.length,columns:columns.length,directTables:references.size,dynamicLocations:dynamic.length,relevantFkColumns:relevant.length,foreignKeys:constraints.length,externalSqlCandidates:report.source.externalSqlCandidates.length}));
}finally{await source.destroy();}
