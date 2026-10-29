import {afterAll,describe} from 'vitest';
import {createHash} from 'node:crypto';
import {databaseSource} from '../src/kernel/database/data-source.js';
import {workflowCases} from './workflow-cases.js';
import {routingCases} from './routing-cases.js';
import {intakeCases} from './intake-cases.js';
import {healthcareCases} from './healthcare-cases.js';
import type {DataSource,DataSourceOptions} from 'typeorm';
import {DataSource as Source} from 'typeorm';

describe.skipIf(process.env.CHAT_RETIREMENT_NATIVE!=='1')('Chat retirement remaining owners',()=>{
 const sources:DataSource[]=[];
 async function isolated(name:string){
  const database='retire_'+createHash('sha256').update(process.env.RETIREMENT_RUN+':'+name).digest('hex').slice(0,16);
  const source=new Source({...databaseSource(true).options,database} as DataSourceOptions);await source.initialize();sources.push(source);return source;
 }
 afterAll(async()=>{for(const source of sources)await source.destroy();});
 const scope=process.env.CHAT_RETIREMENT_SCOPE;
 if(!scope||scope==='workflow')workflowCases(isolated);
 if(!scope||scope==='routing')routingCases(isolated);
 if(!scope||scope==='intake')intakeCases(isolated);
 if(!scope||scope==='healthcare')healthcareCases(isolated);
});
