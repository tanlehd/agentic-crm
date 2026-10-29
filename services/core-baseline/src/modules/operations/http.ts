import { AgentOperations } from '../agents/operations-port.js';
import { Controller,Get,Post,Req,Res,Inject,Module,type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { AuthModule,AuthRuntime,cookie } from '../identity/auth/http.js';
import { AuthError } from '../identity/auth/security.js';
import { AccessError } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
import { SalesWorkspace } from '../sales/workspace.js';
import { MessengerIntake } from '../channels/intake.js';
import { Workflows } from '../workflow/application.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class OperationsRuntime implements OnModuleDestroy {
 private readonly source=databaseSource();private initialized?:Promise<unknown>;readonly agents=new AgentOperations(this.source);readonly sales=new SalesWorkspace(this.source);readonly intake=new MessengerIntake(this.source);readonly workflows=new Workflows(this.source);
 async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(e=>{this.initialized=undefined;throw e;});await this.initialized;}
 async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller()
export class OperationsController {
 constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(OperationsRuntime) private readonly runtime:OperationsRuntime){}
 private async respond(req:Request,res:ServerResponse,kind:'sales'|'deliveries'|'retry'|'runs'|'agents'){
  const correlation=randomUUID();res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{const session=kind==='retry'?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true),tenant=req.headers['x-tenant-id'];if(!uuid(tenant)||req.params.id!==undefined&&!uuid(req.params.id))throw new CommandError(400,'INVALID_REQUEST');await this.runtime.ready();
   if(kind==='retry'){const key=req.headers['idempotency-key'];if(typeof key!=='string'||Object.keys(req.query).length||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');const result=await this.runtime.intake.retry(session.account_id,tenant,req.params.id!,req.body,key,correlation,true);res.statusCode=result.status;res.end(JSON.stringify(result.body));return;}
   const result=kind==='agents'?await this.runtime.agents.list(session.account_id,tenant,req.query):kind==='sales'?await this.runtime.sales.read(session.account_id,tenant,req.params.id,req.query):kind==='deliveries'?await this.runtime.intake.failedDeliveries(session.account_id,tenant,req.query):await this.runtime.workflows.listRuns(session.account_id,tenant,req.query);res.end(JSON.stringify({...result,meta:{correlation_id:correlation}}));
  }catch(e){const f=e instanceof CommandError||e instanceof AuthError?e:new CommandError(e instanceof AccessError?403:503,e instanceof AccessError?'FORBIDDEN':'TEMPORARILY_UNAVAILABLE');res.statusCode=f.status;res.end(JSON.stringify({error:{code:f.code,message:'Không thể tải hoặc cập nhật workspace.',fields:[],retryable:f.status===503},meta:{correlation_id:correlation}}));}
 }
 @Get('sales/leads') sales(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'sales');}
 @Get('sales/leads/:id') lead(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'sales');}
 @Get('operations/failed-deliveries') deliveries(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'deliveries');}
 @Post('operations/deliveries/:id/retry') retry(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'retry');}
 @Get('operations/agent-executions') agents(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'agents');}
 @Get('operations/workflow-runs') runs(@Req() q:Request,@Res() s:ServerResponse){return this.respond(q,s,'runs');}
}
@Module({imports:[AuthModule],controllers:[OperationsController],providers:[OperationsRuntime]})
export class OperationsModule {}
