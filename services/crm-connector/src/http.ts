import 'reflect-metadata';
import { Controller,Get,Post,Req,Res,Inject,Module,type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { MessengerStore } from './messenger-store.js';
import { MessengerAuth,parseMessenger,metaApps } from './messenger.js';
import { Store } from './store.js';
import { ready } from './schema.js';
import { BridgeError } from './validation.js';
interface Request extends IncomingMessage {body:unknown;rawBody?:Buffer;query:Record<string,unknown>;params:Record<string,string>}
@Controller('connector/v1')
export class ConnectorController {
 constructor(@Inject(Store) private readonly store:Store,@Inject(MessengerAuth) private readonly messengerAuth:MessengerAuth,@Inject(MessengerStore) private readonly messengerStore:MessengerStore){}
 private async respond(req:Request,res:ServerResponse,action:'accept'|'read'){
  const correlation_id=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   if(Object.keys(req.query).length)throw new BridgeError(400,'INVALID_REQUEST');
   if(['cookie','origin','x-tenant-id'].some(h=>req.headers[h]!==undefined))throw new BridgeError(403,'INTEGRATION_FORBIDDEN');
   if(action==='accept'&&!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new BridgeError(400,'INVALID_REQUEST');
   const data=action==='accept'?await this.store.accept(req.headers['x-connection-id'],req.headers.authorization,req.body):await this.store.read(req.headers['x-connection-id'],req.headers.authorization,req.params.id);
   res.statusCode=action==='accept'?202:200;res.end(JSON.stringify({data,meta:{correlation_id}}));
  }catch(e){const error=e instanceof BridgeError?e:new BridgeError(503,'TEMPORARILY_UNAVAILABLE');res.statusCode=error.status;res.end(JSON.stringify({error:{code:error.code,retryable:error.status===503},meta:{correlation_id}}));}
 }
 @Post('deliveries') accept(@Req() req:Request,@Res() res:ServerResponse){return this.respond(req,res,'accept');}
 @Get('deliveries/:id') read(@Req() req:Request,@Res() res:ServerResponse){return this.respond(req,res,'read');}
 private async webhook(req:Request,res:ServerResponse,verify:boolean){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','text/plain; charset=utf-8');
  try{
   if(['cookie','origin','x-tenant-id'].some(h=>req.headers[h]!==undefined))throw new BridgeError(403,'WEBHOOK_FORBIDDEN');
   if(verify){res.statusCode=200;res.end(this.messengerAuth.challenge(req.params.appId!,req.query));return;}
   if(Object.keys(req.query).length||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||req.headers['content-encoding']&&req.headers['content-encoding']!=='identity')throw new BridgeError(400,'INVALID_WEBHOOK');
   const bytes=this.messengerAuth.verify(req.params.appId!,req.rawBody,req.headers['x-hub-signature-256']);
   await this.messengerStore.capture(req.params.appId!,parseMessenger(bytes));res.statusCode=200;res.end('EVENT_RECEIVED');
  }catch(e){const error=e instanceof BridgeError?e:new BridgeError(503,'TEMPORARILY_UNAVAILABLE');res.statusCode=error.status;res.end(error.code);}
 }
 @Get('messenger/:appId/webhook') verifyWebhook(@Req() req:Request,@Res() res:ServerResponse){return this.webhook(req,res,true);}
 @Post('messenger/:appId/webhook') receiveWebhook(@Req() req:Request,@Res() res:ServerResponse){return this.webhook(req,res,false);}
 @Get('health/live') live(){return {status:'ok',service:'crm-connector'};}
 @Get('health/ready') async readiness(@Res() res:ServerResponse){try{await ready(this.store.pool);res.statusCode=200;}catch{res.statusCode=503;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:res.statusCode===200?'ready':'unavailable'}));}
}
export async function createApi(store:Store,env:NodeJS.ProcessEnv=process.env):Promise<INestApplication>{
 @Module({controllers:[ConnectorController],providers:[{provide:Store,useValue:store},{provide:MessengerAuth,useValue:new MessengerAuth(metaApps(env.CONNECTOR_META_APPS),env)},{provide:MessengerStore,useValue:new MessengerStore(store.pool)}]}) class ConnectorModule {}
 const app=await NestFactory.create<NestExpressApplication>(ConnectorModule,{logger:false,bodyParser:false,rawBody:true});
 app.useBodyParser('json',{limit:'64kb',inflate:false});
 // Express parser errors must not disclose the submitted payload or stack.
 app.use((error:unknown,_req:unknown,res:ServerResponse,_next:unknown)=>{if(error){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:{code:'INVALID_REQUEST',retryable:false},meta:{correlation_id:randomUUID()}}));}});
 return app;
}
