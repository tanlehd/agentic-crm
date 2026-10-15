import 'reflect-metadata';
import { Controller,Get,Inject,Module,Post,Req,Res,type OnModuleDestroy } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ReportingStore } from './storage.js';
import { AdmissionVerifier,StorageError } from './storage-security.js';
import {ProjectionStore} from './projections.js';
import {ProjectionError} from './projection-contract.js';
import {QueryError} from './query.js';
import {QueryAdmissionVerifier} from './query-security.js';
import {ReportingQueryService} from './query-service.js';
import {RunAdmissionVerifier} from './runs-security.js';
import {ReportingRunStore} from './runs-store.js';
import {ReportingRunService} from './runs-service.js';
import {discoverAuthoring} from './authoring.js';
import {DashboardVerifier} from './dashboard-security.js';
import {DashboardService} from './dashboards.js';
interface Request extends IncomingMessage {body:unknown;rawBodyText:string}
export class ReportingRuntime implements OnModuleDestroy {
 readonly store=new ReportingStore(process.env);readonly verifier=new AdmissionVerifier(process.env.REPORTING_ADMISSION_KEY??'');
 readonly queryVerifier=new QueryAdmissionVerifier(process.env.REPORTING_ADMISSION_KEY??'');
 readonly queries=new ReportingQueryService(new ProjectionStore(this.store.pool));
 readonly runVerifier=new RunAdmissionVerifier(process.env.REPORTING_ADMISSION_KEY??'');
 readonly runs=new ReportingRunService(new ReportingRunStore(this.store.pool),new ProjectionStore(this.store.pool),this.queries);
 readonly dashboardVerifier=new DashboardVerifier(process.env.REPORTING_ADMISSION_KEY??'');
 readonly dashboards=new DashboardService(this.store,this.dashboardVerifier,this.queries);
 async onModuleDestroy(){await this.store.close();}
}
@Controller('internal/v1/reporting')
export class ReportingController {
 constructor(@Inject(ReportingRuntime)private readonly runtime:ReportingRuntime){}
 @Post('dashboards') async dashboard(@Req()req:Request,@Res()res:ServerResponse){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{if(['cookie','origin','x-tenant-id'].some(k=>req.headers[k]!==undefined)||req.url?.includes('?'))throw new StorageError(403,'PRIVATE_TRANSPORT_REQUIRED');const a=this.runtime.dashboardVerifier.verify(req.headers['x-reporting-admission'],req.rawBodyText),data=await this.runtime.dashboards.execute(a,req.body,req.rawBodyText);res.statusCode=200;res.end(JSON.stringify({data,meta:{correlation_id}}));}catch(e){const error=queryHttpError(e);res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500},meta:{correlation_id}}));}
 }
 @Get('health/ready') async health(@Res()res:ServerResponse){res.setHeader('Cache-Control','no-store');try{await this.runtime.store.pool.query('SELECT 1');res.statusCode=200;res.end('{"ready":true}');}catch{res.statusCode=503;res.end('{"ready":false}');}}
 @Post('authoring') async authoring(@Req()req:Request,@Res()res:ServerResponse){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{if(['cookie','origin','x-tenant-id'].some(k=>req.headers[k]!==undefined)||req.url?.includes('?'))throw new StorageError(403,'PRIVATE_TRANSPORT_REQUIRED');const a=this.runtime.queryVerifier.verify(req.headers['x-reporting-admission'],req.rawBodyText),data=await discoverAuthoring(this.runtime.store.pool,a,req.body,req.rawBodyText);const body=JSON.stringify({data,meta:{correlation_id}});if(Buffer.byteLength(body)>4194304)throw new StorageError(503,'CATALOG_LIMIT');res.statusCode=200;res.end(body);}
  catch(e){const error=queryHttpError(e);res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500},meta:{correlation_id}}));}
 }
 @Post('runs') async run(@Req()req:Request,@Res()res:ServerResponse){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{if(['cookie','origin','x-tenant-id'].some(k=>req.headers[k]!==undefined)||req.url?.includes('?'))throw new StorageError(403,'PRIVATE_TRANSPORT_REQUIRED');const a=this.runtime.runVerifier.verify(req.headers['x-reporting-admission'],req.rawBodyText),data=await this.runtime.runs.execute(a,req.body,req.rawBodyText);res.statusCode=200;res.end(JSON.stringify({data,meta:{correlation_id}}));}
  catch(e){const error=queryHttpError(e);res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500||error.status===429},meta:{correlation_id}}));}
 }
 @Post('query') async query(@Req()req:Request,@Res()res:ServerResponse){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   if(['cookie','origin','x-tenant-id'].some(k=>req.headers[k]!==undefined)||req.url?.includes('?'))throw new StorageError(403,'PRIVATE_TRANSPORT_REQUIRED');
   const a=this.runtime.queryVerifier.verify(req.headers['x-reporting-admission'],req.rawBodyText),data=await this.runtime.queries.execute(a,req.body,req.rawBodyText);
   res.statusCode=200;res.end(JSON.stringify({data,meta:{correlation_id}}));
  }catch(e){const error=queryHttpError(e);res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500||error.status===429},meta:{correlation_id}}));}
 }
 @Post('definitions') async operation(@Req() req:Request,@Res() res:ServerResponse){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{if(['cookie','origin','x-tenant-id'].some(k=>req.headers[k]!==undefined)||req.url?.includes('?'))throw new StorageError(403,'PRIVATE_TRANSPORT_REQUIRED');
   const a=this.runtime.verifier.verify(req.headers['x-reporting-admission'],req.rawBodyText);const data=await this.runtime.store.execute(a,req.body,req.rawBodyText);res.statusCode=200;res.end(JSON.stringify({data,meta:{correlation_id}}));
  }catch(e){const error=e instanceof StorageError?e:new StorageError(503,'REPORTING_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500},meta:{correlation_id}}));}
 }
}
export function queryHttpError(e:unknown):StorageError{
 if(e instanceof StorageError)return e;
 if(e instanceof ProjectionError){if(['BINDING_NOT_FOUND','GENERATION_NOT_FOUND'].includes(e.code))return new StorageError(404,'SNAPSHOT_NOT_FOUND');if(['SNAPSHOT_UNAVAILABLE','SNAPSHOT_NOT_READY'].includes(e.code))return new StorageError(409,e.code);return new StorageError(503,'REPORTING_UNAVAILABLE');}
 if(e instanceof QueryError){const status=e.code==='QUERY_CONCURRENCY_LIMIT'?429:e.code==='QUERY_TIMEOUT'?504:['QUERY_FORBIDDEN','STALE_AUTHORIZATION','SOURCE_SCOPE_INCOMPLETE','ACCESS_DENIED'].includes(e.code)?403:['CURRENCY_MISMATCH','INVALID_SOURCE_VALUE','MISSING_OUTCOME_TIME','RELATION_NOT_UNIQUE'].includes(e.code)?422:400;return new StorageError(status,e.code);}
 return new StorageError(503,'REPORTING_UNAVAILABLE');
}
@Module({controllers:[ReportingController],providers:[ReportingRuntime]})export class ReportingModule {}
export function storageJsonBody(app:{use:(fn:(req:Request,res:ServerResponse,next:()=>void)=>void)=>void}){
 app.use((req,res,next)=>{
  if(req.method!=='POST')return next();const parts:Buffer[]=[];let size=0,failed=false;
  const reject=(status:number)=>{if(failed)return;failed=true;res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:{code:'INVALID_REQUEST',retryable:false}}));};
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))return reject(400);
  req.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>98304){parts.length=0;reject(413);}else if(!failed)parts.push(chunk);});
  req.on('end',()=>{if(failed)return;try{req.rawBodyText=Buffer.concat(parts).toString('utf8');req.body=JSON.parse(req.rawBodyText);next();}catch{reject(400);}});
  req.on('error',()=>reject(400));
 });
}
export async function startReporting(){
 const app=await NestFactory.create(ReportingModule,{logger:['error','warn'],bodyParser:false});storageJsonBody(app);app.enableShutdownHooks();
 const port=Number(process.env.REPORTING_PORT??3004);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('INVALID_PORT');await app.listen(port,process.env.REPORTING_HOST??'127.0.0.1');return app;
}
