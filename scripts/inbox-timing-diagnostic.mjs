// Opt-in local preload. Never emit SQL, parameters, rows, identifiers or credentials.
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {dirname,join} from 'node:path';
import http from 'node:http';
const require=createRequire('/app/package.json');
const Connection=require(join(dirname(require.resolve('mysql2')),'lib/base/connection.js'));
for(const method of ['query','execute']){
 const original=Connection.prototype[method];
 Connection.prototype[method]=function(...args){
  const index=args.findLastIndex(x=>typeof x==='function'),start=performance.now();
  const sql=typeof args[0]==='string'?args[0]:args[0]?.sql??'';
  const kind=/^\s*(SELECT|INSERT|UPDATE|DELETE|COMMIT|START|SET|ROLLBACK)\b/i.exec(sql)?.[1]?.toUpperCase()??'OTHER';
  const table=/\b(?:FROM|INTO|UPDATE)\s+`?([a-z_]+)`?/i.exec(sql)?.[1];
  if(index>=0){const callback=args[index];args[index]=function(error,...rest){const ms=Math.round(performance.now()-start);if(error||ms>=50)console.warn(JSON.stringify({diagnostic:'sql',kind,table,locking:/FOR (UPDATE|SHARE)/i.test(sql),ms,code:error?.code}));return callback.call(this,error,...rest);};}
  return original.apply(this,args);
 };
}
const request=http.request;
http.request=function(...args){
 const start=performance.now(),url=args[0] instanceof URL?args[0]:null,path=url?.pathname??'unknown',out=request.apply(this,args);
 out.on('response',response=>response.once('end',()=>console.warn(JSON.stringify({diagnostic:'rpc',path,status:response.statusCode,ms:Math.round(performance.now()-start)}))));
 out.on('error',error=>console.warn(JSON.stringify({diagnostic:'rpc-error',path,code:error.code,ms:Math.round(performance.now()-start)})));
 return out;
};
syncBuiltinESMExports();
