import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseArgs,parseEnv} from 'node:util';
import {ReportingStore} from '../services/reporting/dist/storage.js';
import {ProjectionStore,ingestSnapshot} from '../services/reporting/dist/projections.js';
import {syntheticAdapter} from '../services/reporting/dist/synthetic-source.js';
import {validateContext} from '../services/reporting/dist/projection-contract.js';
import {connect} from './lib/reporting-database.mjs';
const {values}=parseArgs({options:{test:{type:'boolean'},tenant:{type:'string'},binding:{type:'string'}},strict:true});
const context={tenantId:values.tenant,bindingId:values.binding,environment:'mock',adapterId:'synthetic_g1_v1'};validateContext(context);
const env=parseEnv(await readFile(values.test?'.local/reporting-test.env':'.local/reporting.env','utf8'));if(env.REPORTING_DB_NAME!==(values.test?'test_crm_reporting':'crm_reporting'))throw new Error('LOCAL_TARGET_DENIED');
const preflight=await connect(env,'RUNTIME');await preflight.end();const owner=new ReportingStore(env);
try{const store=new ProjectionStore(owner.pool),activation=await ingestSnapshot(store,syntheticAdapter(context),context),snapshot=await store.read(context);const counts={};for(const row of snapshot.records)counts[row.object]=(counts[row.object]??0)+1;const result={database:env.REPORTING_DB_NAME,environment:'mock',...activation,objects:snapshot.manifest.catalog.objects.length,fields:snapshot.manifest.availableFields.length,canonicalRows:snapshot.records.length,counts};await mkdir('artifacts/reporting-projections',{recursive:true});await writeFile(`artifacts/reporting-projections/${env.REPORTING_DB_NAME}-${context.bindingId}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{await owner.close();}
