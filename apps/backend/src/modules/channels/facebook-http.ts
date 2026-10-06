import { Controller,Get,Post,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { uuid } from '../identity/admin.js';
import { FacebookChannels } from './facebook.js';
import { facebookConfig } from './facebook-graph.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;body:unknown}
export class FacebookRuntime implements OnModuleDestroy {
 private readonly source=databaseSource();private initialized?:Promise<unknown>;readonly facebook=new FacebookChannels(this.source,facebookConfig());
 async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
 async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller('admin/channels/facebook')
export class FacebookController {
 constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(FacebookRuntime) private readonly runtime:FacebookRuntime){}
 private async respond(req:Request,res:ServerResponse,kind:'list'|'connect'|'callback'){
  const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json');
  try{const sid=cookie(req,'crm_session'),session=kind==='connect'?await this.auth.service.requireMutation(sid,req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(sid,true);await this.runtime.ready();
   if(kind==='callback'){const result=await this.runtime.facebook.callback(session.account_id,sid as string,req.query);res.statusCode=303;res.setHeader('Location','/?facebook='+result);res.end();return;}
   const tenant=req.headers['x-tenant-id'];if(!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');
   if(kind==='list'){res.end(JSON.stringify({...await this.runtime.facebook.list(session.account_id,tenant,req.query),meta:{correlation_id:correlation}}));return;}
   if(Object.keys(req.query).length||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||Buffer.byteLength(JSON.stringify(req.body)??'')>1024)throw new CommandError(400,'INVALID_REQUEST');
   res.statusCode=200;res.end(JSON.stringify({data:await this.runtime.facebook.begin(session.account_id,tenant,sid as string,req.body),meta:{correlation_id:correlation}}));
  }catch(e){if(kind==='callback'){res.statusCode=303;res.setHeader('Location','/?facebook=failed');res.end();return;}const f=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=f.status;res.end(JSON.stringify({error:{code:f.code,message:'Không thể hoàn tất cấu hình Facebook.',fields:[],retryable:f.status>=500},meta:{correlation_id:correlation}}));}
 }
 @Get('pages') list(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'list');}
 @Post('connect') connect(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'connect');}
 @Get('callback') callback(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'callback');}
}
@Module({imports:[AuthModule],controllers:[FacebookController],providers:[FacebookRuntime]})
export class FacebookModule {}
