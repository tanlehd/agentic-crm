import { Controller,Get,Post,Patch,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { uuid } from '../identity/admin.js';
import { MarketingAuthority } from './marketing-authority.js';
import { marketingConfig,MarketingIntegrationAuth } from './marketing-security.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;body:unknown;params:Record<string,string>}
export class MarketingAuthorityRuntime implements OnModuleDestroy {
 private readonly config=marketingConfig();private readonly source:ReturnType<typeof databaseSource>;private initialized?:Promise<unknown>;
 readonly integration=new MarketingIntegrationAuth(process.env.MARKETING_AUTHORITY_INTEGRATIONS);
 readonly service:MarketingAuthority;
 constructor(){if(this.config&&(!process.env.MYSQL_MARKETING_USER||!process.env.MYSQL_MARKETING_PASSWORD||process.env.MYSQL_MARKETING_USER===process.env.MYSQL_USER))throw new Error('MARKETING_DATABASE_ROLE_REQUIRED');this.source=databaseSource(false,this.config?{user:process.env.MYSQL_MARKETING_USER!,password:process.env.MYSQL_MARKETING_PASSWORD!}:undefined);this.service=new MarketingAuthority(this.source,this.config);}
 async ready(){if(!this.config)throw new CommandError(503,'MARKETING_NOT_CONFIGURED');if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
 async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller()
export class MarketingAuthorityController {
 constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(MarketingAuthorityRuntime) private readonly runtime:MarketingAuthorityRuntime){}
 private async respond(req:Request,res:ServerResponse,kind:'list'|'create'|'replace'|'revoke'|'page'|'graph'|'check'|'admit'|'receipt'){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const internal=['graph','check','admit','receipt'].includes(kind),write=!['list','receipt'].includes(kind);
   if(kind!=='list'&&Object.keys(req.query).length||write&&(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||Buffer.byteLength(JSON.stringify(req.body)??'')>65536))throw new CommandError(400,'INVALID_REQUEST');
   let data:unknown;
   if(internal){const ctx=this.runtime.integration.authenticate(req.headers);await this.runtime.ready();data=kind==='graph'?await this.runtime.service.graphRead(ctx,req.body):kind==='check'?await this.runtime.service.pageCheck(ctx,req.body):kind==='admit'?await this.runtime.service.admit(ctx,req.body):await this.runtime.service.getReceipt(ctx,req.params.id!);}
   else{const sid=cookie(req,'crm_session'),session=write?await this.auth.service.requireMutation(sid,req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(sid,true),tenant=req.headers['x-tenant-id'];if(!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();data=kind==='list'?await this.runtime.service.list(session.account_id,tenant,req.query):await this.runtime.service.mutate(session.account_id,tenant,kind as 'create'|'replace'|'revoke'|'page',req.params.id,req.body);}
   res.statusCode=200;res.end(JSON.stringify({data,meta:{correlation_id}}));
  }catch(e){const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status>=500},meta:{correlation_id}}));}
 }
 @Get('admin/channels/marketing/credentials') list(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'list');}
 @Post('admin/channels/marketing/credentials') create(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'create');}
 @Patch('admin/channels/marketing/credentials/:id') replace(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'replace');}
 @Post('admin/channels/marketing/credentials/:id/revoke') revoke(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'revoke');}
 @Post('admin/channels/facebook/pages/:id/marketing-admission') page(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'page');}
 @Post('internal/v1/marketing-authority/graph-read') graph(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'graph');}
 @Post('internal/v1/marketing-authority/page-check') check(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'check');}
 @Post('internal/v1/marketing-authority/admit') admit(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'admit');}
 @Get('internal/v1/marketing-authority/receipts/:id') receipt(@Req() q:Request,@Res() r:ServerResponse){return this.respond(q,r,'receipt');}
}
@Module({imports:[AuthModule],controllers:[MarketingAuthorityController],providers:[MarketingAuthorityRuntime]})
export class MarketingAuthorityModule {}
