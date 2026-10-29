import { Controller,Get,Post,Patch,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthRuntime,AuthModule,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { ReportingBridge,reportingBridgeConfig } from './bridge.js';
import {ReportingQueryBridge,queryRequest} from './query-bridge.js';
import {DashboardBridge} from './dashboard-bridge.js';
interface Request extends IncomingMessage {body:unknown;params:Record<string,string>;query:Record<string,unknown>}
export class ReportingBridgeRuntime implements OnModuleDestroy {
 private readonly source=databaseSource();private initialized?:Promise<unknown>;
 readonly bridge=new ReportingBridge(this.source,reportingBridgeConfig());
 readonly queryBridge=new ReportingQueryBridge(this.source,reportingBridgeConfig());
 readonly dashboardBridge=new DashboardBridge(this.source,reportingBridgeConfig());
 async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
 async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller('reporting/definitions')
export class ReportingDefinitionsController {
 constructor(@Inject(AuthRuntime)private readonly auth:AuthRuntime,@Inject(ReportingBridgeRuntime)private readonly runtime:ReportingBridgeRuntime){}
 private async respond(req:Request,res:ServerResponse,kind:'create'|'update'|'archive'|'list'|'get'|'version'){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const mutation=['create','update','archive'].includes(kind),sid=cookie(req,'crm_session');
   const session=mutation?await this.auth.service.requireMutation(sid,req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(sid,true);
   const tenant=req.headers['x-tenant-id'];if(!uuid(tenant)||Object.keys(req.query).some(k=>kind!=='list'||!['limit','after'].includes(k)))throw new CommandError(400,'INVALID_REQUEST');
   const op:Record<string,unknown>={kind};
   if(req.params.id){if(!uuid(req.params.id))throw new CommandError(400,'INVALID_REQUEST');op.id=req.params.id;}
   if(kind==='version')op.version=req.params.version;
   if(kind==='list'){
    if(req.query.after!==undefined){if(!uuid(req.query.after))throw new CommandError(400,'INVALID_REQUEST');op.after=req.query.after;}
    if(req.query.limit!==undefined){if(typeof req.query.limit!=='string'||!/^\d{1,3}$/.test(req.query.limit))throw new CommandError(400,'INVALID_REQUEST');op.limit=Number(req.query.limit);}
   }
   if(mutation){
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');
    const key=req.headers['idempotency-key'];if(!uuid(key))throw new CommandError(400,'INVALID_REQUEST');op.key=key;op.body=req.body;
    if(kind!=='create'){const match=req.headers['if-match'];if(match===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');if(typeof match!=='string'||!/^"[1-9][0-9]{0,15}"$/.test(match))throw new CommandError(400,'INVALID_REQUEST');op.expectedRevision=match.slice(1,-1);}
   }
   await this.runtime.ready();const data=await this.runtime.bridge.dispatch(session.account_id,tenant,op);
   await this.auth.service.session(sid,true);
   if(data?.revision)res.setHeader('ETag',`"${data.revision}"`);res.statusCode=200;res.end(JSON.stringify({data,meta:{correlation_id}}));
  }catch(e){const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'REPORTING_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500},meta:{correlation_id}}));}
 }
 @Get() list(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'list');}
 @Post() create(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'create');}
 @Get(':id') get(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'get');}
 @Patch(':id') update(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'update');}
 @Post(':id/archive') archive(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'archive');}
 @Get(':id/versions/:version') version(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'version');}
}
@Controller('reporting/query')
export class ReportingQueryController {
 constructor(@Inject(AuthRuntime)private readonly auth:AuthRuntime,@Inject(ReportingBridgeRuntime)private readonly runtime:ReportingBridgeRuntime){}
 @Post() async query(@Req()req:Request,@Res()res:ServerResponse){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json');
  try{
   const sid=cookie(req,'crm_session'),session=await this.auth.service.requireMutation(sid,req.headers.origin,req.headers['x-csrf-token']),tenant=req.headers['x-tenant-id'];
   if(!uuid(tenant)||Object.keys(req.query).length||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');
   const request=queryRequest(req.body);await this.runtime.ready();const data=await this.runtime.queryBridge.dispatch(session.account_id,tenant,request);await this.auth.service.session(sid,true);
   if(res.destroyed)return;res.statusCode=200;
   if(request.format==='csv'){res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="report.csv"');res.setHeader('X-Correlation-Id',correlation_id);res.end(data);}else res.end(JSON.stringify({data,meta:{correlation_id}}));
  }catch(e){if(res.destroyed)return;const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?e.code:'REPORTING_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500||error.status===429},meta:{correlation_id}}));}
 }
}
@Controller('reporting/authoring')
export class ReportingAuthoringController {
 constructor(@Inject(AuthRuntime)private readonly auth:AuthRuntime,@Inject(ReportingBridgeRuntime)private readonly runtime:ReportingBridgeRuntime){}
 @Get() async get(@Req()req:Request,@Res()res:ServerResponse){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{const sid=cookie(req,'crm_session'),session=await this.auth.service.session(sid,true),tenant=req.headers['x-tenant-id'];if(!uuid(tenant)||Object.keys(req.query).some(k=>k!=='after')||req.query.after!==undefined&&!uuid(req.query.after))throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();const data=await this.runtime.queryBridge.discover(session.account_id,tenant,req.query.after as string|undefined);await this.auth.service.session(sid,true);res.statusCode=200;res.end(JSON.stringify({data,meta:{correlation_id}}));}
  catch(e){const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'REPORTING_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500},meta:{correlation_id}}));}
 }
}
@Controller('reporting/runs')
export class ReportingRunsController {
 constructor(@Inject(AuthRuntime)private readonly auth:AuthRuntime,@Inject(ReportingBridgeRuntime)private readonly runtime:ReportingBridgeRuntime){}
 private async respond(req:Request,res:ServerResponse,kind:'create'|'get'|'execute'|'cancel'|'result'){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const mutation=['create','execute','cancel'].includes(kind),sid=cookie(req,'crm_session'),session=mutation?await this.auth.service.requireMutation(sid,req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(sid,true),tenant=req.headers['x-tenant-id'];
   if(!uuid(tenant)||Object.keys(req.query).some(k=>kind!=='result'||k!=='format'))throw new CommandError(400,'INVALID_REQUEST');
   const op:Record<string,unknown>={kind};if(kind!=='create'){if(!uuid(req.params.id))throw new CommandError(400,'INVALID_REQUEST');op.id=req.params.id;}
   if(mutation){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');if(kind==='create'){if(!uuid(req.headers['idempotency-key']))throw new CommandError(400,'INVALID_REQUEST');op.key=req.headers['idempotency-key'];op.request=req.body;}else if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||Object.keys(req.body).length)throw new CommandError(400,'INVALID_REQUEST');}
   if(kind==='result'&&req.query.format!==undefined)op.format=req.query.format;
   await this.runtime.ready();const data=await this.runtime.queryBridge.dispatchRun(session.account_id,tenant,op);await this.auth.service.session(sid,true);if(res.destroyed)return;res.statusCode=200;
   if(op.format==='csv'){res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="report.csv"');res.setHeader('X-Correlation-Id',correlation_id);res.end(data);}else res.end(JSON.stringify({data,meta:{correlation_id}}));
  }catch(e){if(res.destroyed)return;const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?e.code:'REPORTING_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500||error.status===429},meta:{correlation_id}}));}
 }
 @Post() create(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'create');}
 @Get(':id') get(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'get');}
 @Post(':id/execute') execute(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'execute');}
 @Post(':id/cancel') cancel(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'cancel');}
 @Get(':id/result') result(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'result');}
}
@Controller('reporting')
export class DashboardController {
 constructor(@Inject(AuthRuntime)private readonly auth:AuthRuntime,@Inject(ReportingBridgeRuntime)private readonly runtime:ReportingBridgeRuntime){}
 private async respond(req:Request,res:ServerResponse,kind:string){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const mutation=req.method!=='GET',sid=cookie(req,'crm_session'),session=mutation?await this.auth.service.requireMutation(sid,req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(sid,true),tenant=req.headers['x-tenant-id'];if(!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');
   const op:Record<string,any>={kind};for(const k of ['id','widgetId','version','templateKey'])if(req.params[k])op[k]=req.params[k];
   if(['list','reports','legacy','usage'].includes(kind)){op.filters={};for(const [key,value]of Object.entries(req.query)){if(typeof value!=='string'||!['q','owner','archived','model','chart','limit','cursor'].includes(key))throw new CommandError(400,'INVALID_REQUEST');if(key==='archived'){if(!['true','false'].includes(value))throw new CommandError(400,'INVALID_REQUEST');op.filters[key]=value==='true';}else if(key==='limit'){if(!/^\d{1,2}$/.test(value))throw new CommandError(400,'INVALID_REQUEST');op.filters[key]=Number(value);}else op.filters[key]=value;}}
   else if(Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');
   if(mutation){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');op.body=req.body;if(!['query','preview'].includes(kind)){if(!uuid(req.headers['idempotency-key']))throw new CommandError(400,'INVALID_REQUEST');op.key=req.headers['idempotency-key'];}if(['update','archive','duplicate','convert_legacy'].includes(kind)){const match=req.headers['if-match'];if(match===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');if(typeof match!=='string'||!/^"[1-9][0-9]{0,15}"$/.test(match))throw new CommandError(400,'INVALID_REQUEST');op.expectedRevision=match.slice(1,-1);}}
   await this.runtime.ready();const data=await this.runtime.dashboardBridge.dispatch(session.account_id,tenant,op);await this.auth.service.session(sid,true);if(data.revision)res.setHeader('ETag',`"${data.revision}"`);res.statusCode=200;res.end(JSON.stringify({data,meta:{correlation_id}}));
  }catch(e){const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?e.code:'REPORTING_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500||error.status===429},meta:{correlation_id}}));}
 }
 @Get('dashboards') list(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'list');}
 @Get('dashboards/legacy') legacy(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'legacy');}
 @Get('dashboards/:id') get(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'get');}
 @Post('dashboards') create(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'create');}
 @Patch('dashboards/:id') update(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'update');}
 @Post('dashboards/:id/archive') archive(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'archive');}
 @Post('dashboards/:id/duplicate') duplicate(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'duplicate');}
 @Post('dashboards/from-template') templateCreate(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'from_template');}
 @Post('dashboards/convert-legacy') convert(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'convert_legacy');}
 @Get('dashboard-templates') templates(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'templates');}
 @Get('dashboard-templates/:templateKey/versions/1') template(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'template');}
 @Get('reports') reports(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'reports');}
 @Get('reports/:id/dashboards') usage(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'usage');}
 @Post('reports/:id/versions/:version/preview') preview(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'preview');}
 @Post('dashboards/:id/widgets/:widgetId/query') query(@Req()q:Request,@Res()r:ServerResponse){return this.respond(q,r,'query');}
}
@Module({imports:[AuthModule],controllers:[ReportingDefinitionsController,ReportingQueryController,ReportingRunsController,ReportingAuthoringController,DashboardController],providers:[ReportingBridgeRuntime]})export class ReportingDefinitionsModule {}
