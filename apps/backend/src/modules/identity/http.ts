import { Controller, Get, Post, Patch, Req, Res, Inject, Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { AuthModule, AuthRuntime, cookie } from './auth/http.js';
import { AuthError } from './auth/security.js';
import { databaseSource } from '../../kernel/database/data-source.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { AccessError } from './authorization.js';
import { IdentityAdmin, resource, uuid } from './admin.js';
interface Request extends IncomingMessage {query:Record<string,unknown>;params:Record<string,string>;body:unknown}
export class IdentityRuntime implements OnModuleDestroy {
  private readonly source=databaseSource();
  private initialized: Promise<unknown> | undefined;
  readonly admin: IdentityAdmin;
  constructor(@Inject(AuthRuntime) auth:AuthRuntime){
    this.admin=new IdentityAdmin(this.source,createHmac('sha256',auth.service.config.encryptionKey).update('identity-pagination-v1').digest());
  }
  async ready(){if(!this.initialized)this.initialized=this.source.initialize().catch(error=>{this.initialized=undefined;throw error;});await this.initialized;}
  async onModuleDestroy(){await this.initialized?.catch(()=>{});if(this.source.isInitialized)await this.source.destroy();}
}
@Controller()
export class IdentityController {
  constructor(@Inject(AuthRuntime) private readonly auth:AuthRuntime,@Inject(IdentityRuntime) private readonly runtime:IdentityRuntime){}
  private async respond(req:Request,res:ServerResponse,mutation:boolean,mine=false){
    const correlation=randomUUID();
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const session=mutation?await this.auth.service.requireMutation(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']):await this.auth.service.session(cookie(req,'crm_session'),true);
      for(const key of Object.keys(req.query))if(!['limit','cursor',...(mine?[]:['status'])].includes(key))throw new CommandError(400,'INVALID_REQUEST');
      if(mutation && !/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new CommandError(400,'INVALID_REQUEST');
      if(mutation&&Object.keys(req.query).length)throw new CommandError(400,'INVALID_REQUEST');
      const tenant=req.headers['x-tenant-id'];
      if(!mine&&!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');
      await this.runtime.ready();
      if(mine){res.end(JSON.stringify({...await this.runtime.admin.mine(session.account_id,req.query),meta:{correlation_id:correlation}}));return;}
      const route=resource(req.params.resource!);
      if(!mutation){res.end(JSON.stringify({...await this.runtime.admin.list(session.account_id,tenant as string,route,req.query),meta:{correlation_id:correlation}}));return;}
      const match=req.headers['if-match'];
      if(req.params.id&&match===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');
      if(match!==undefined&&(typeof match!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(match)))throw new CommandError(400,'INVALID_REQUEST');
      const key=req.headers['idempotency-key'];if(typeof key!=='string')throw new CommandError(400,'INVALID_REQUEST');
      const result=await this.runtime.admin.mutate(session.account_id,tenant as string,route,req.params.id,req.body,key,typeof match==='string'?match.slice(1,-1):undefined,correlation);
      res.statusCode=result.status;res.setHeader('ETag',`"${result.body.data.version}"`);res.end(JSON.stringify(result.body));
    }catch(error){
      const failure=error instanceof CommandError||error instanceof AuthError?error:error instanceof AccessError?new CommandError(403,error.code):new CommandError(503,'TEMPORARILY_UNAVAILABLE');
      res.statusCode=failure.status;
      if(failure.code==='REQUEST_IN_PROGRESS')res.setHeader('Retry-After','1');
      res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất yêu cầu.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));
    }
  }
  @Get('me/memberships') mine(@Req() req:Request,@Res() res:ServerResponse){return this.respond(req,res,false,true);}
  @Get('admin/:resource') list(@Req() req:Request,@Res() res:ServerResponse){return this.respond(req,res,false);}
  @Post('admin/:resource') create(@Req() req:Request,@Res() res:ServerResponse){return this.respond(req,res,true);}
  @Patch('admin/:resource/:id') patch(@Req() req:Request,@Res() res:ServerResponse){return this.respond(req,res,true);}
}
@Module({imports:[AuthModule],controllers:[IdentityController],providers:[IdentityRuntime]})
export class IdentityModule {}
