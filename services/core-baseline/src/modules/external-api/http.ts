import {Controller,Get,Post,Patch,Req,Res,Inject,Module,type OnModuleDestroy} from '@nestjs/common';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHmac,randomUUID} from 'node:crypto';
import {databaseSource} from '../../kernel/database/data-source.js';
import {CommandError} from '../../kernel/reliability/commands.js';
import {AuthModule,AuthRuntime,cookie} from '../identity/auth/http.js';
import {AuthError} from '../identity/auth/security.js';
import {AccessError} from '../identity/authorization.js';
import {uuid} from '../identity/admin.js';
import {ExternalApps,exactObject} from '../identity/external-apps.js';
import {appCatalog} from './catalog.js';
import type {ConversationReadKind} from './conversation-catalog.js';
import {identityDrains} from '../identity/owner-drain-runtime.js';
import {NativeExternalReadAdmissions} from '../identity/external-read-admission.js';
import {ExternalChatReadGateway} from '../../gateway/chat-external-read.js';
import {chatConnection} from '../../gateway/chat-connection.js';
import {CrmRecords} from '../crm/records.js';
import {coreDomains,contactReferences} from '../crm/core.js';
import {leadDomain} from '../sales/leads.js';
import {dealDomain} from '../sales/deals.js';
import {ExternalData} from './service.js';
import {externalOpenApi} from './openapi.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class ExternalRuntime implements OnModuleDestroy {
  readonly source=databaseSource();private initialized:Promise<unknown>|undefined;
  readonly apps=new ExternalApps(this.source,appCatalog,identityDrains(this.source).policy);readonly data:ExternalData;
  constructor(@Inject(AuthRuntime) auth:AuthRuntime){
    const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));domains.set('deal',dealDomain());
    const secret=createHmac('sha256',auth.service.config.encryptionKey).update('external-api-cursor-v1').digest();
    const identity=chatConnection('identity'),bff=chatConnection('bff');
    const admissions=new NativeExternalReadAdmissions(this.apps,async(t,ref)=>(await identity()).read(t,'command-proof',{...ref}));
    const gateway=new ExternalChatReadGateway(admissions,async request=>(await bff()).read(request.tenant_id,'external-prepare',request),async request=>(await bff()).command(request));
    this.data=new ExternalData(this.apps,new CrmRecords(this.source,secret,domains),gateway);
  }
  async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
  async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller()
export class ExternalController {
  constructor(@Inject(AuthRuntime)private readonly auth:AuthRuntime,@Inject(ExternalRuntime)private readonly runtime:ExternalRuntime){}
  private async respond(res:ServerResponse,fn:(correlation:string)=>Promise<unknown>){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Correlation-Id',correlation);
    try{const data=await fn(correlation);res.end(JSON.stringify({...data as object,meta:{correlation_id:correlation}}));}
    catch(error){const e=error instanceof CommandError||error instanceof AuthError?error:error instanceof AccessError?new CommandError(403,'FORBIDDEN'):new CommandError(503,'TEMPORARILY_UNAVAILABLE');res.statusCode=e.status;if(e.status===429)res.setHeader('Retry-After','60');if(e.status===401)res.setHeader('WWW-Authenticate','Bearer');res.end(JSON.stringify({error:{code:e.code,message:'Không thể hoàn tất yêu cầu API.',retryable:[429,503].includes(e.status)},meta:{correlation_id:correlation}}));}
  }
  private manage(req:Request,res:ServerResponse,action:'list'|'catalog'|'create'|'update'|'token'|'revoke'){
    return this.respond(res,async correlation=>{
      if(Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');
      const mutation=!['list','catalog'].includes(action),session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];
      if(!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
      if(action==='list')return this.runtime.apps.list(session.account_id,tenant);
      if(action==='catalog')return this.runtime.apps.discover(session.account_id,tenant);
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');
      const match=req.headers['if-match'];if(match!==undefined&&(typeof match!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(match)))throw new CommandError(400,'INVALID_REQUEST');
      let body=req.body,id=req.params.id;
      if(action==='create'){const b=exactObject(body,['id','name','description','status','grants']);id=b.id;const {id:unused,...config}=b;body=config;}
      const result=await this.runtime.apps.change(session.account_id,tenant,action,id!,body,typeof match==='string'?match.slice(1,-1):undefined,correlation);
      res.statusCode=action==='create'?201:200;res.setHeader('ETag',`"${result.data.version}"`);return result;
    });
  }
  private read(req:Request,res:ServerResponse,kind:'scopes'|'properties'|'records'){return this.respond(res,async()=>{await this.runtime.ready();return this.runtime.data.read(req.headers.authorization,req.headers['x-tenant-id'],kind,req.params.object,req.params.id,req.query);});}
  @Get('external-apps/catalog') catalog(@Req()q:Request,@Res()s:ServerResponse){return this.manage(q,s,'catalog');}
  @Get('external-apps') list(@Req()q:Request,@Res()s:ServerResponse){return this.manage(q,s,'list');}
  @Post('external-apps') create(@Req()q:Request,@Res()s:ServerResponse){return this.manage(q,s,'create');}
  @Patch('external-apps/:id') update(@Req()q:Request,@Res()s:ServerResponse){return this.manage(q,s,'update');}
  @Post('external-apps/:id/token') token(@Req()q:Request,@Res()s:ServerResponse){return this.manage(q,s,'token');}
  @Post('external-apps/:id/revoke') revoke(@Req()q:Request,@Res()s:ServerResponse){return this.manage(q,s,'revoke');}
  @Get('external/scopes') scopes(@Req()q:Request,@Res()s:ServerResponse){return this.read(q,s,'scopes');}
  private readConversation(req:Request,res:ServerResponse,kind:ConversationReadKind){return this.respond(res,async()=>{await this.runtime.ready();return this.runtime.data.readConversation(req.headers.authorization,req.headers['x-tenant-id'],kind,req.params.id,req.params.messageId,req.query);});}
  @Get('external/conversations') conversations(@Req()q:Request,@Res()s:ServerResponse){return this.readConversation(q,s,'conversations');}
  @Get('external/conversations/:id') conversation(@Req()q:Request,@Res()s:ServerResponse){return this.readConversation(q,s,'conversations');}
  @Get('external/conversations/:id/messages') messages(@Req()q:Request,@Res()s:ServerResponse){return this.readConversation(q,s,'messages');}
  @Get('external/conversations/:id/messages/:messageId') message(@Req()q:Request,@Res()s:ServerResponse){return this.readConversation(q,s,'messages');}
  @Get('external/crm/properties/:object') properties(@Req()q:Request,@Res()s:ServerResponse){return this.read(q,s,'properties');}
  @Get('external/crm/objects/:object') records(@Req()q:Request,@Res()s:ServerResponse){return this.read(q,s,'records');}
  @Get('external/crm/objects/:object/:id') record(@Req()q:Request,@Res()s:ServerResponse){return this.read(q,s,'records');}
  @Get('external/openapi.json') openapi(@Res()s:ServerResponse){s.setHeader('Content-Type','application/json');s.setHeader('X-Content-Type-Options','nosniff');s.end(JSON.stringify(externalOpenApi));}
}
@Module({imports:[AuthModule],controllers:[ExternalController],providers:[ExternalRuntime]})
export class ExternalApiModule {}
