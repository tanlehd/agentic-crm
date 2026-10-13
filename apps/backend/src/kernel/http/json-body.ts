import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ServerResponse } from 'node:http';
// Parser errors can contain fragments of the submitted credential. Never serialize them.
export function safeJsonBody(app:NestExpressApplication){
 app.useBodyParser('json',{limit:'100kb',inflate:false});
 app.use((error:unknown,_request:unknown,response:ServerResponse,_next:unknown)=>{
  if(error){response.statusCode=400;response.setHeader('Content-Type','application/json');response.setHeader('Cache-Control','no-store');response.end(JSON.stringify({error:{code:'INVALID_REQUEST',retryable:false}}));}
 });
}
