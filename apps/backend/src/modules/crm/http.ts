import { Controller,Get,Post,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { createHmac,randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { CrmPlatform,type MetadataRoute } from './platform.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class CrmRuntime implements OnModuleDestroy {
  private readonly source=databaseSource();private initialized:Promise<unknown>|undefined;readonly platform:CrmPlatform;
  constructor(@Inject(AuthRuntime) auth:AuthRuntime){this.platform=new CrmPlatform(this.source,createHmac('sha256',auth.service.config.encryptionKey).update('registry-pagination-v1').digest());}
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
  @Get('object-types') objects(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'object-types',false);}
  @Post('object-types') createObject(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'object-types',true);}
  @Get('association-types') types(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'association-types',false);}
  @Post('association-types') createType(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'association-types',true);}
  @Post('associations') createAssociation(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'associations',true);}
  @Get('records/:id/associations') associations(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'associations',false);}
}
@Module({imports:[AuthModule],controllers:[CrmController],providers:[CrmRuntime]})
export class CrmModule {}
