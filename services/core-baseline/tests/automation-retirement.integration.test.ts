import {afterAll,describe} from 'vitest';
import {createHash} from 'node:crypto';
import {databaseSource} from '../src/kernel/database/data-source.js';
import {workflowCases} from './workflow-cases.js';
import {crmCoreCases} from './crm-core-cases.js';
import {healthcareCases} from './healthcare-cases.js';
import type {DataSource,DataSourceOptions} from 'typeorm';
import {DataSource as Source} from 'typeorm';

// Explicit retained native run; the operator provisions these schemas before Vitest.
describe.skipIf(process.env.RETIREMENT_NATIVE_CASES!=='1')('retirement owner regressions',()=>{
 const sources:DataSource[]=[];
 async function isolated(name:string){
  const database='retire_'+createHash('sha256').update(process.env.RETIREMENT_RUN+':'+name).digest('hex').slice(0,16);
  const source=new Source({...databaseSource(true).options,database} as DataSourceOptions);await source.initialize();sources.push(source);return source;
 }
 afterAll(async()=>{for(const source of sources)await source.destroy();});
 workflowCases(isolated);crmCoreCases(isolated);healthcareCases(isolated);
});
