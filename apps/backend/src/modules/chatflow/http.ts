import { Controller,Get,Post,Patch,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { Chatflows,type Operation } from './application.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class ChatflowRuntime implements OnModuleDestroy {
  private readonly source=databaseSource();private initialized?:Promise<unknown>;readonly chatflows=new Chatflows(this.source);
  async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
  async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller()
export class ChatflowController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(ChatflowRuntime) private readonly runtime:ChatflowRuntime){}
  private async respond(req:Request,res:ServerResponse,kind:Operation|'definitions'|'versions'|'session'|'conversation'){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const mutation=!['definitions','versions','session','conversation'].includes(kind),session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];
      if(!uuid(tenant)||req.params.id!==undefined&&!uuid(req.params.id)||Object.keys(req.query).some(k=>mutation||['session','conversation'].includes(kind)||k!=='limit'))throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
      if(!mutation){if(req.query.limit!==undefined&&(typeof req.query.limit!=='string'||!/^\d{1,3}$/.test(req.query.limit)))throw new CommandError(400,'INVALID_REQUEST');res.end(JSON.stringify({...await this.runtime.chatflows.read(session.account_id,tenant,kind as 'definitions'|'versions'|'session'|'conversation',req.params.id,req.query.limit===undefined?50:Number(req.query.limit)),meta:{correlation_id:correlation}}));return;}
      const key=req.headers['idempotency-key'],match=req.headers['if-match'],num=req.params.version;
      if(typeof key!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||match!==undefined&&(typeof match!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(match))||num!==undefined&&!/^[1-9][0-9]{0,8}$/.test(num))throw new CommandError(400,'INVALID_REQUEST');
      const result=await this.runtime.chatflows.mutate(session.account_id,tenant,kind as Operation,req.body,key,correlation,req.params.id,num===undefined?undefined:Number(num),typeof match==='string'?match.slice(1,-1):undefined);res.statusCode=result.status;if(result.body.data.version)res.setHeader('ETag',`"${result.body.data.version}"`);res.end(JSON.stringify(result.body));
    }catch(e){const f=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=f.status;res.end(JSON.stringify({error:{code:f.code,message:'Không thể hoàn tất yêu cầu.',fields:[],retryable:f.status===503},meta:{correlation_id:correlation}}));}
  }
  @Get('chatflows') list(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'definitions');}
  @Post('chatflows') create(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'create');}
  @Get('chatflows/:id/versions') versions(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'versions');}
  @Post('chatflows/:id/versions') version(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'version');}
  @Post('chatflows/:id/versions/:version/publish') publish(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'publish');}
  @Get('chatflow-sessions/:id') session(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'session');}
  @Get('conversations/:id/chatflow-session') current(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'conversation');}
  @Post('chatflow-sessions/:id/complete-qualification') complete(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'complete');}
}
@Module({imports:[AuthModule],controllers:[ChatflowController],providers:[ChatflowRuntime]})
export class ChatflowModule {}
