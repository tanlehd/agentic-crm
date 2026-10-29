// Temporary local diagnostic preload. Never log SQL, parameters, rows or credentials.
import {createRequire,syncBuiltinESMExports} from 'node:module';
import http from 'node:http';
import {dirname,join} from 'node:path';
const require=createRequire('/app/package.json');
const Connection=require(join(dirname(require.resolve('mysql2')),'lib/base/connection.js'));
for(const method of ['query','execute']){
 const original=Connection.prototype[method];
 Connection.prototype[method]=function(...args){
  const index=args.findLastIndex(x=>typeof x==='function');
  if(index>=0){const callback=args[index];args[index]=function(error,...rest){if(error)console.warn(JSON.stringify({diagnostic:'mysql',code:error.code,permission:error.code==='ER_TABLEACCESS_DENIED_ERROR'?error.sqlMessage:undefined}));return callback.call(this,error,...rest);};}
  return original.apply(this,args);
 };
}
const request=http.request;
http.request=function(...args){
 const start=Date.now(),path=args[0] instanceof URL?args[0].pathname:'unknown',out=request.apply(this,args);
 out.on('response',response=>{let body='';if(response.statusCode!==200){response.on('data',chunk=>{if(body.length<8192)body+=chunk;});response.on('end',()=>{let code;try{code=JSON.parse(body).code;}catch{}console.warn(JSON.stringify({diagnostic:'rpc',path,status:response.statusCode,code,ms:Date.now()-start}));});}});
 out.on('error',error=>console.warn(JSON.stringify({diagnostic:'rpc-error',path,code:error.code,ms:Date.now()-start})));
 return out;
};
syncBuiltinESMExports();
