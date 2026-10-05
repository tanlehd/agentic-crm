import { Controller,Get,Post,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { MessengerIntake } from './intake.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class ChannelsRuntime implements OnModuleDestroy {
  private readonly source=databaseSource();private initialized?:Promise<unknown>;readonly intake=new MessengerIntake(this.source);
  async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
  async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller('integrations')
export class ChannelsController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(ChannelsRuntime) private readonly runtime:ChannelsRuntime){}
  private async respond(req:Request,res:ServerResponse,action:'accept'|'read'|'retry'){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      if(Object.keys(req.query).length||req.params.id!==undefined&&!uuid(req.params.id))throw new CommandError(400,'INVALID_REQUEST');
      const credential=action==='accept'||req.headers.authorization!==undefined||req.headers['x-connection-id']!==undefined;
      if(action!=='read'&&!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');
      await this.runtime.ready();
      if(credential){
        if(action==='retry'||req.headers['x-tenant-id']!==undefined||req.headers.cookie!==undefined||req.headers.origin!==undefined)throw new CommandError(403,'INTEGRATION_FORBIDDEN');
        if(action==='accept'){const response=await this.runtime.intake.accept(req.headers['x-connection-id'],req.headers.authorization,req.body,correlation);res.statusCode=202;res.end(JSON.stringify(response));return;}
        const data=await this.runtime.intake.readCredential(req.headers['x-connection-id'],req.headers.authorization,req.params.id!);res.end(JSON.stringify({data,meta:{correlation_id:correlation}}));return;
      }
      const session=action==='retry'?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];if(!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');
      if(action==='read'){const data=await this.runtime.intake.readHuman(session.account_id,tenant,req.params.id!);res.end(JSON.stringify({data,meta:{correlation_id:correlation}}));return;}
      const key=req.headers['idempotency-key'];if(typeof key!=='string')throw new CommandError(400,'INVALID_REQUEST');const result=await this.runtime.intake.retry(session.account_id,tenant,req.params.id!,req.body,key,correlation);res.statusCode=result.status;res.end(JSON.stringify(result.body));
    }catch(e){const f=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'INTEGRATION_FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=f.status;res.end(JSON.stringify({error:{code:f.code,message:'Không thể hoàn tất intake.',fields:[],retryable:f.status===503},meta:{correlation_id:correlation}}));}
  }
  @Post('mock-messenger/deliveries') accept(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'accept');}
  @Get('deliveries/:id') read(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'read');}
  @Post('deliveries/:id/retry') retry(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'retry');}
}
@Module({imports:[AuthModule],controllers:[ChannelsController],providers:[ChannelsRuntime]})
export class ChannelsModule {}
