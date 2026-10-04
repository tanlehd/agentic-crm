import { Controller,Get,Post,Patch,Put,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { createHmac,randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { CrmUi } from './ui.js';
import { coreDomains,contactReferences } from './core.js';
import { leadDomain,leadArchiveGuard,LeadService } from '../sales/leads.js';
import { CrmRecords,type RecordRoute } from './records.js';
import { FieldError } from './properties.js';
import { CrmPlatform,type MetadataRoute } from './platform.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class CrmRuntime implements OnModuleDestroy {
  private readonly source=databaseSource();private initialized:Promise<unknown>|undefined;readonly platform:CrmPlatform;readonly records:CrmRecords;readonly leads:LeadService;readonly ui:CrmUi;
  constructor(@Inject(AuthRuntime) auth:AuthRuntime){this.platform=new CrmPlatform(this.source,createHmac('sha256',auth.service.config.encryptionKey).update('registry-pagination-v1').digest());const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));this.records=new CrmRecords(this.source,createHmac('sha256',auth.service.config.encryptionKey).update('records-pagination-v1').digest(),domains,undefined,[leadArchiveGuard]);this.leads=new LeadService(this.records,contactReferences);this.ui=new CrmUi(this.records);}
  async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
  async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller()
export class CrmController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(CrmRuntime) private readonly runtime:CrmRuntime){}
  private async respond(req:Request,res:ServerResponse,route:MetadataRoute|'associations',mutation:boolean){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true);
      const tenant=req.headers['x-tenant-id'];if(!uuid(tenant)||req.params.id!==undefined&&!uuid(req.params.id))throw new CommandError(400,'INVALID_REQUEST');
      if(Object.keys(req.query).some(k=>mutation||!['limit','cursor'].includes(k)))throw new CommandError(400,'INVALID_REQUEST');
      await this.runtime.ready();const app=this.runtime.platform;
      if(!mutation){const result=route==='associations'?await app.associations(session.account_id,tenant,req.params.id!,req.query):await app.list(session.account_id,tenant,route,req.query);res.end(JSON.stringify({...result,meta:{correlation_id:correlation}}));return;}
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');
      const match=req.headers['if-match'],key=req.headers['idempotency-key'];
      if(route==='associations'&&match===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');
      if(match!==undefined&&(typeof match!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(match))||typeof key!=='string')throw new CommandError(400,'INVALID_REQUEST');
      const result=await app.mutate(session.account_id,tenant,route,req.body,key,typeof match==='string'?match.slice(1,-1):undefined,correlation);
      res.statusCode=result.status;if(result.body.data.version)res.setHeader('ETag',`"${result.body.data.version}"`);res.end(JSON.stringify(result.body));
    }catch(error){
      const failure=error instanceof CommandError||error instanceof AuthError?error:error instanceof AccessError?new CommandError(403,error.code):new CommandError(503,'TEMPORARILY_UNAVAILABLE');
      res.statusCode=failure.status;if(failure.code==='REQUEST_IN_PROGRESS')res.setHeader('Retry-After','1');
      res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất yêu cầu.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));
    }
  }
  private async recordResponse(req:Request,res:ServerResponse,kind:RecordRoute['kind'],mutation=false){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true);
      const tenant=req.headers['x-tenant-id'];if(!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');
      if(Object.keys(req.query).length&&(mutation||kind!=='records'||req.params.id))throw new CommandError(400,'INVALID_REQUEST');
      await this.runtime.ready();const route={object:req.params.key!,kind,...(req.params.id?{id:req.params.id}:{})};
      if(!mutation){const result=await this.runtime.records.read(session.account_id,tenant,route,req.query);if(!Array.isArray(result.data)&&result.data.version)res.setHeader('ETag',`"${result.data.version}"`);res.end(JSON.stringify({...result,meta:{correlation_id:correlation}}));return;}
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');
      const match=req.headers['if-match'],key=req.headers['idempotency-key'];
      if(typeof key!=='string'||match!==undefined&&(typeof match!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(match)))throw new CommandError(400,'INVALID_REQUEST');
      const result=await this.runtime.records.mutate(session.account_id,tenant,route,req.body,key,typeof match==='string'?match.slice(1,-1):undefined,correlation);
      res.statusCode=result.status;res.setHeader('ETag',`"${result.body.data.version}"`);res.end(JSON.stringify(result.body));
    }catch(error){
      const failure=error instanceof CommandError||error instanceof AuthError?error:error instanceof AccessError?new CommandError(403,error.code):new CommandError(503,'TEMPORARILY_UNAVAILABLE');
      res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất yêu cầu.',fields:error instanceof FieldError?[{path:error.field,code:error.code}]:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));
    }
  }
  private async leadResponse(req:Request,res:ServerResponse,action:'read'|'create'|'qualification'|'disqualify'){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
    try{
      const mutation=action!=='read',session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true);
      const tenant=req.headers['x-tenant-id'];if(!uuid(tenant)||req.params.id!==undefined&&!uuid(req.params.id))throw new CommandError(400,'INVALID_REQUEST');
      if(Object.keys(req.query).length&&(mutation||req.params.id))throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
      if(!mutation){const result=await this.runtime.leads.read(session.account_id,tenant,req.params.id,req.query);if(!Array.isArray(result.data)&&result.data.version)res.setHeader('ETag',`"${result.data.version}"`);res.end(JSON.stringify({...result,meta:{correlation_id:correlation}}));return;}
      const key=req.headers['idempotency-key'],match=req.headers['if-match'];
      if(typeof key!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||match!==undefined&&(typeof match!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(match)))throw new CommandError(400,'INVALID_REQUEST');
      const result=action==='create'?await this.runtime.leads.create(session.account_id,tenant,req.body,key,correlation):await this.runtime.leads.command(session.account_id,tenant,req.params.id!,action as 'qualification'|'disqualify',req.body,key,typeof match==='string'?match.slice(1,-1):undefined,correlation);
      res.statusCode=result.status;res.setHeader('ETag',`"${result.body.data.version}"`);res.end(JSON.stringify(result.body));
    }catch(error){const failure=error instanceof CommandError||error instanceof AuthError?error:error instanceof AccessError?new CommandError(403,error.code):new CommandError(503,'TEMPORARILY_UNAVAILABLE');res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất yêu cầu.',fields:error instanceof FieldError?[{path:error.field,code:error.code}]:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));}
  }
  private async uiResponse(req:Request,res:ServerResponse,descriptor=false){
    const correlation=randomUUID();res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    try{const session=await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];if(!uuid(tenant)||Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();const data=descriptor?await this.runtime.ui.descriptor(session.account_id,tenant,req.params.key!):await this.runtime.ui.context(session.account_id,tenant);res.end(JSON.stringify({data,meta:{correlation_id:correlation}}));}
    catch(error){const failure=error instanceof CommandError||error instanceof AuthError?error:new CommandError(error instanceof AccessError?403:503,error instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể tải workspace.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));}
  }
  @Get('crm/context') context(@Req() q:Request,@Res() s:ServerResponse){return this.uiResponse(q,s);}
  @Get('objects/:key/descriptor') descriptor(@Req() q:Request,@Res() s:ServerResponse){return this.uiResponse(q,s,true);}
  @Get('leads') leads(@Req() q:Request,@Res() s:ServerResponse){return this.leadResponse(q,s,'read');}
  @Get('leads/:id') lead(@Req() q:Request,@Res() s:ServerResponse){return this.leadResponse(q,s,'read');}
  @Post('leads') createLead(@Req() q:Request,@Res() s:ServerResponse){return this.leadResponse(q,s,'create');}
  @Post('leads/:id/qualification') qualifyLead(@Req() q:Request,@Res() s:ServerResponse){return this.leadResponse(q,s,'qualification');}
  @Post('leads/:id/disqualify') disqualifyLead(@Req() q:Request,@Res() s:ServerResponse){return this.leadResponse(q,s,'disqualify');}
  @Get('object-types/:key/properties') properties(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'properties');}
  @Post('object-types/:key/properties') createProperty(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'properties',true);}
  @Patch('object-types/:key/properties/:id') patchProperty(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'properties',true);}
  @Get('object-types/:key/forms/:id') form(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'forms');}
  @Put('object-types/:key/forms/:id') putForm(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'forms',true);}
  @Get('object-types/:key/views/:id') view(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'views');}
  @Put('object-types/:key/views/:id') putView(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'views',true);}
  @Get('objects/:key/records') records(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'records');}
  @Get('objects/:key/records/:id') record(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'records');}
  @Post('objects/:key/records') createRecord(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'records',true);}
  @Patch('objects/:key/records/:id') patchRecord(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'records',true);}
  @Post('objects/:key/records/:id/archive') archiveRecord(@Req() q:Request,@Res() s:ServerResponse){return this.recordResponse(q,s,'archive',true);}
  @Get('object-types') objects(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'object-types',false);}
  @Post('object-types') createObject(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'object-types',true);}
  @Get('association-types') types(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'association-types',false);}
  @Post('association-types') createType(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'association-types',true);}
  @Post('associations') createAssociation(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'associations',true);}
  @Get('records/:id/associations') associations(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'associations',false);}
}
@Module({imports:[AuthModule],controllers:[CrmController],providers:[CrmRuntime]})
export class CrmModule {}
