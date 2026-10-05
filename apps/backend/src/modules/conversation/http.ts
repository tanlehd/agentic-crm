import { Controller,Get,Post,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { createHmac,randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { Conversations } from './domain.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class ConversationRuntime implements OnModuleDestroy {
  private readonly source=databaseSource();private initialized?:Promise<unknown>;readonly conversations:Conversations;
  constructor(@Inject(AuthRuntime) auth:AuthRuntime){this.conversations=new Conversations(this.source,createHmac('sha256',auth.service.config.encryptionKey).update('conversation-pagination-v1').digest());}
  async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
  async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller('conversations')
export class ConversationController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(ConversationRuntime) private readonly runtime:ConversationRuntime){}
  private async respond(req:Request,res:ServerResponse,kind:'detail'|'messages'|'intent'|'notes'|'transition',mutation=false){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];
      if(!uuid(tenant)||Object.values(req.params).some(v=>!uuid(v)))throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
      if(!mutation){const result=await this.runtime.conversations.read(session.account_id,tenant,req.params.id,kind as 'detail'|'messages'|'intent'|'notes',req.query,req.params.intentId);if(!Array.isArray(result.data)&&result.data.version)res.setHeader('ETag',`"${result.data.version}"`);res.end(JSON.stringify({...result,meta:{correlation_id:correlation}}));return;}
      const key=req.headers['idempotency-key'],match=req.headers['if-match'];
      if(Object.keys(req.query).length||typeof key!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||match!==undefined&&(typeof match!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(match)))throw new CommandError(400,'INVALID_REQUEST');
      const result=await this.runtime.conversations.mutate(session.account_id,tenant,req.params.id!,kind as 'messages'|'notes'|'transition',req.body,key,typeof match==='string'?match.slice(1,-1):undefined,correlation);res.statusCode=result.status;if(result.body.data.version)res.setHeader('ETag',`"${result.body.data.version}"`);res.end(JSON.stringify(result.body));
    }catch(e){const f=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=f.status;res.end(JSON.stringify({error:{code:f.code,message:'Không thể hoàn tất yêu cầu.',fields:[],retryable:f.status===503},meta:{correlation_id:correlation}}));}
  }
  @Get() list(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'detail');}
  @Get(':id') detail(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'detail');}
  @Get(':id/messages') messages(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'messages');}
  @Get(':id/outbound-intents/:intentId') intent(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'intent');}
  @Post(':id/messages') send(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'messages',true);}
  @Get(':id/notes') notes(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'notes');}
  @Post(':id/notes') note(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'notes',true);}
  @Post(':id/transition') transition(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'transition',true);}
}
@Module({imports:[AuthModule],controllers:[ConversationController],providers:[ConversationRuntime]})
export class ConversationModule {}
