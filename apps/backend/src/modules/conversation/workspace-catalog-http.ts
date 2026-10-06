import { Controller,Get,Post,Patch,Put,Delete,Req,Res,Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage,ServerResponse } from 'node:http';
import type { WorkspaceRuntime } from './workspace-http.js';
import { type CatalogKind } from './workspace-catalogs.js';
import { AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { object } from '../crm/properties.js';
import { CommandError } from '../../kernel/reliability/commands.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
@Controller('chat-workspace')
export class WorkspaceCatalogController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject('WorkspaceRuntime') private readonly runtime:WorkspaceRuntime){}
  private async respond(req:Request,res:ServerResponse,action:'list'|'get'|'create'|'update'|'archive'|'shares'|'attach'|'detach'){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const mutation=!['list','get'].includes(action),session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];
      if(!uuid(tenant)||req.params.id&&!uuid(req.params.id)||req.params.tagId&&!uuid(req.params.tagId)||action!=='list'&&Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');
      const link=action==='attach'||action==='detach',kind=req.params.catalog as CatalogKind;if(!link&&!['inboxes','tags','snippets'].includes(kind)||action==='shares'&&kind!=='inboxes')throw new CommandError(404,'NOT_FOUND');
      await this.runtime.ready();const catalogs=this.runtime.catalogs;
      if(!mutation){const r=action==='list'?await catalogs.list(session.account_id,tenant,kind,req.query):await catalogs.get(session.account_id,tenant,kind,req.params.id!);res.end(JSON.stringify({...r,meta:{...r.meta,correlation_id:correlation}}));return;}
      const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');if(link)object(req.body,[]);
      const r=link?await catalogs.tagLink(session.account_id,tenant,req.params.id!,req.params.tagId!,action==='attach',key,correlation):await catalogs.mutate(session.account_id,tenant,kind,action as 'create'|'update'|'archive'|'shares',req.params.id,req.body,key,req.headers['if-match'],correlation);
      res.statusCode=r.status;if('version' in r.body.data)res.setHeader('ETag',`"${r.body.data.version}"`);res.end(JSON.stringify(r.body));
    }catch(e){const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,message:'Không thể hoàn tất yêu cầu hộp thư.',fields:[],retryable:error.status===503},meta:{correlation_id:correlation}}));}
  }
  @Get(':catalog') list(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'list');}
  @Get(':catalog/:id') get(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'get');}
  @Post(':catalog') create(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'create');}
  @Patch(':catalog/:id') update(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'update');}
  @Delete(':catalog/:id') archive(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'archive');}
  @Put(':catalog/:id/shares') shares(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'shares');}
  @Put('conversations/:id/tags/:tagId') attach(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'attach');}
  @Delete('conversations/:id/tags/:tagId') detach(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'detach');}
}
