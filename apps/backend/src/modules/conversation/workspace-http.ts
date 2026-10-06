import { WorkspaceCatalogController } from './workspace-catalog-http.js';
import { WorkspaceCatalogs } from './workspace-catalogs.js';
import { Controller,Get,Post,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { createHmac,randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { ChatWorkspace } from './workspace.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class WorkspaceRuntime implements OnModuleDestroy {
  private readonly source=databaseSource();private initialized?:Promise<unknown>;readonly workspace:ChatWorkspace;readonly catalogs:WorkspaceCatalogs;
  constructor(@Inject(AuthRuntime) auth:AuthRuntime){this.catalogs=new WorkspaceCatalogs(this.source,createHmac('sha256',auth.service.config.encryptionKey).update('catalog-pagination-v1').digest());this.workspace=new ChatWorkspace(this.source,createHmac('sha256',auth.service.config.encryptionKey).update('workspace-pagination-v1').digest());}
  async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
  async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller('chat-workspace')
export class WorkspaceController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(WorkspaceRuntime) private readonly runtime:WorkspaceRuntime){}
  private async respond(req:Request,res:ServerResponse,kind:'capabilities'|'list'|'sidebar'|'state'|'mark'){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const mutation=kind==='mark',session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];
      if(!uuid(tenant)||Object.values(req.params).some(v=>!uuid(v))||kind!=='list'&&Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
      const w=this.runtime.workspace;
      if(mutation){const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');const result=await w.markRead(session.account_id,tenant,req.params.id!,req.body,key,correlation);res.statusCode=result.status;res.end(JSON.stringify(result.body));return;}
      const result=kind==='capabilities'?await w.capabilities(session.account_id,tenant):kind==='sidebar'?await w.sidebar(session.account_id,tenant):kind==='state'?await w.state(session.account_id,tenant,req.params.id!):await w.list(session.account_id,tenant,req.query);
      res.end(JSON.stringify({...result,meta:{...result.meta,correlation_id:correlation}}));
    }catch(e){const error=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,message:'Không thể hoàn tất yêu cầu hộp thư.',fields:[],retryable:error.status===503},meta:{correlation_id:correlation}}));}
  }
  @Get('capabilities') capabilities(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'capabilities');}
  @Get('conversations') list(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'list');}
  @Get('sidebar') sidebar(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'sidebar');}
  @Get('conversations/:id/read-state') state(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'state');}
  @Post('conversations/:id/read-state') mark(@Req() r:Request,@Res() s:ServerResponse){return this.respond(r,s,'mark');}
}
@Module({imports:[AuthModule],controllers:[WorkspaceController,WorkspaceCatalogController],providers:[WorkspaceRuntime,{provide:'WorkspaceRuntime',useExisting:WorkspaceRuntime}]})
export class WorkspaceModule {}
