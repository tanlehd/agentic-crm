import { Controller,Get,Put,Post,Req,Res,Inject } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import type { WorkspaceRuntime } from './workspace-http.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
@Controller('chat-workspace/conversations')
export class WorkspaceActivityController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject('WorkspaceRuntime') private readonly runtime:WorkspaceRuntime){}
  private async respond(req:Request,res:ServerResponse,kind:'get'|'snooze'|'wake'|'activity'){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const mutation=kind==='snooze'||kind==='wake',session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'],id=req.params.id;
      if(!uuid(tenant)||!uuid(id)||kind!=='activity'&&Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
      if(mutation){const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');const result=await this.runtime.snooze.mutate(session.account_id,tenant,id,kind,req.body,key,req.headers['if-match'],correlation);res.statusCode=result.status;res.end(JSON.stringify(result.body));return;}
      const result=kind==='activity'?await this.runtime.activity.read(session.account_id,tenant,id,req.query):await this.runtime.snooze.get(session.account_id,tenant,id);res.end(JSON.stringify({...result,meta:{...result.meta,correlation_id:correlation}}));
    }catch(e){const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,message:'Không thể hoàn tất yêu cầu hội thoại.',fields:[],retryable:error.status===503},meta:{correlation_id:correlation}}));}
  }
  @Get(':id/snooze') get(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'get');}
  @Put(':id/snooze') snooze(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'snooze');}
  @Post(':id/wake') wake(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'wake');}
  @Get(':id/activity') activity(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'activity');}
}
