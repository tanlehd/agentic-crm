import {Controller,Get,Post,Req,Res,Inject,Module,type OnModuleDestroy} from '@nestjs/common';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {randomUUID} from 'node:crypto';
import {AuthModule,AuthRuntime,cookie} from '../identity/auth/http.js';
import {AuthError} from '../identity/auth/security.js';
import {AccessError} from '../identity/authorization.js';
import {uuid} from '../identity/admin.js';
import {databaseSource} from '../../kernel/database/data-source.js';
import {CommandError} from '../../kernel/reliability/commands.js';
import {HumanRouting,type HumanRoutingCommand} from './human-routing.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class HumanRoutingRuntime implements OnModuleDestroy{
 private readonly source=databaseSource();private initialized?:Promise<unknown>;readonly service=new HumanRouting(this.source);
 async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
 async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller('human-routing')
export class HumanRoutingController{
 constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(HumanRoutingRuntime) private readonly runtime:HumanRoutingRuntime){}
 private async respond(req:Request,res:ServerResponse,kind:'read'|'mine'|HumanRoutingCommand){
  const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const write=kind!=='read'&&kind!=='mine',session=write?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];
   if(!uuid(tenant)||Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
   if(!write){res.end(JSON.stringify({...await this.runtime.service.read(session.account_id,tenant,kind==='mine'),meta:{correlation_id:correlation}}));return;}
   const key=req.headers['idempotency-key'],match=req.headers['if-match'];
   if(typeof key!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||match!==undefined&&(typeof match!=='string'||!/^"(0|[1-9][0-9]{0,19})"$/.test(match)))throw new CommandError(400,'INVALID_REQUEST');
   const result=await this.runtime.service.mutate(session.account_id,tenant,kind as HumanRoutingCommand,req.body,key,typeof match==='string'?match.slice(1,-1):undefined,correlation);res.statusCode=result.status;res.setHeader('ETag',`"${result.body.data.version}"`);res.end(JSON.stringify(result.body));
  }catch(e){const f=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=f.status;res.end(JSON.stringify({error:{code:f.code,message:'Không thể hoàn tất phân bổ hội thoại.',fields:[],retryable:f.status===503},meta:{correlation_id:correlation}}));}
 }
 @Get() read(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'read');}
 @Get('mine') mine(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'mine');}
 @Post('skills') skills(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'skills');}
 @Post('team-skills') teams(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'team-skills');}
 @Post('profiles') profiles(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'profiles');}
 @Post('queues') queues(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'queues');}
 @Post('reroute') reroute(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'reroute');}
}
@Module({imports:[AuthModule],controllers:[HumanRoutingController],providers:[HumanRoutingRuntime]})
export class HumanRoutingModule{}
