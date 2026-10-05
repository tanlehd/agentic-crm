import { Controller,Get,Post,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { Routing } from './routing.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class RoutingRuntime implements OnModuleDestroy {
  private readonly source=databaseSource();private initialized?:Promise<unknown>;readonly routing=new Routing(this.source);
  async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
  async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller()
export class RoutingController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(RoutingRuntime) private readonly runtime:RoutingRuntime){}
  private async respond(req:Request,res:ServerResponse,kind:'assignment'|'takeover'|'targets'|'history'){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const mutation=kind==='assignment'||kind==='takeover',session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];
      if(!uuid(tenant)||!uuid(req.params.id)||Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
      if(!mutation){res.end(JSON.stringify({...await this.runtime.routing.read(session.account_id,tenant,req.params.id,kind as 'targets'|'history'),meta:{correlation_id:correlation}}));return;}
      const key=req.headers['idempotency-key'],match=req.headers['if-match'];
      if(typeof key!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||match!==undefined&&(typeof match!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(match)))throw new CommandError(400,'INVALID_REQUEST');
      const result=await this.runtime.routing.mutate(session.account_id,tenant,req.params.id,kind==='takeover',req.body,key,typeof match==='string'?match.slice(1,-1):undefined,correlation);res.statusCode=result.status;res.setHeader('ETag',`"${result.body.data.version}"`);res.end(JSON.stringify(result.body));
    }catch(e){const f=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=f.status;res.end(JSON.stringify({error:{code:f.code,message:'Không thể hoàn tất yêu cầu.',fields:[],retryable:f.status===503},meta:{correlation_id:correlation}}));}
  }
  @Post('records/:id/assignment') assignment(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'assignment');}
  @Post('conversations/:id/takeover') takeover(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'takeover');}
  @Get('records/:id/assignment-targets') targets(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'targets');}
  @Get('records/:id/ownership-history') history(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'history');}
}
@Module({imports:[AuthModule],controllers:[RoutingController],providers:[RoutingRuntime]})
export class RoutingModule {}
