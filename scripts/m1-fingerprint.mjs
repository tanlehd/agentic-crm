import { createHash } from 'node:crypto';
import { databaseSource } from './dist/kernel/database/data-source.js';
const source=databaseSource(true);await source.initialize();
try{const data={};for(const table of ['account','tenant','membership','principal','role','team','principal_role','team_member','agent_policy','ai_agent','service_actor','object_type','crm_record']){const rows=await source.query(`SELECT * FROM \`${table}\` ORDER BY 1,2`);data[table]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}console.log(JSON.stringify(data));}finally{await source.destroy();}
