import { createCipheriv,createDecipheriv,randomBytes,createHmac } from 'node:crypto';
import { CommandError } from '../../kernel/reliability/commands.js';
export interface FacebookConfig {appId:string;secret:string;key:string;origin:string;loginConfig?:string}
export function facebookConfig(env=process.env):FacebookConfig|null{
 if(!env.FACEBOOK_APP_ID&&!env.FACEBOOK_APP_SECRET&&!env.FACEBOOK_TOKEN_ENCRYPTION_KEY)return null;
 try{const origin=new URL(env.APP_ORIGIN??'');if(origin.origin!==env.APP_ORIGIN||origin.username||origin.password||origin.protocol!=='https:'&&!(env.APP_ENV==='development'||env.APP_ENV==='test')||!['https:','http:'].includes(origin.protocol)||origin.protocol==='http:'&&!['localhost','127.0.0.1'].includes(origin.hostname))return null;
 if(!/^\d{1,32}$/.test(env.FACEBOOK_APP_ID??'')||!env.FACEBOOK_APP_SECRET||env.FACEBOOK_APP_SECRET.length<16||!/^[a-f0-9]{64}$/.test(env.FACEBOOK_TOKEN_ENCRYPTION_KEY??'')||env.FACEBOOK_LOGIN_CONFIG_ID&&!/^\d{1,32}$/.test(env.FACEBOOK_LOGIN_CONFIG_ID))return null;
 return {appId:env.FACEBOOK_APP_ID!,secret:env.FACEBOOK_APP_SECRET,key:env.FACEBOOK_TOKEN_ENCRYPTION_KEY!,origin:origin.origin,...(env.FACEBOOK_LOGIN_CONFIG_ID?{loginConfig:env.FACEBOOK_LOGIN_CONFIG_ID}:{})};}catch{return null;}
}
export const callbackPath='/api/v1/admin/channels/facebook/callback';
export const pageId=(v:unknown):v is string=>typeof v==='string'&&/^\d{1,32}$/.test(v);
export const validToken=(v:unknown):v is string=>typeof v==='string'&&v.length>=16&&v.length<=16384&&/^[\x21-\x7e]+$/.test(v);
export class PageTokenCrypto {
 private readonly key:Buffer;
 constructor(key:string){if(!/^[a-f0-9]{64}$/.test(key))throw new Error('FACEBOOK_KEY_INVALID');this.key=Buffer.from(key,'hex');}
 seal(token:string,context:string){if(!validToken(token))throw new CommandError(422,'FACEBOOK_TOKEN_INVALID');const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.key,iv);c.setAAD(Buffer.from(context));const data=Buffer.concat([c.update(token,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64url');}
 open(value:string,context:string){try{const b=Buffer.from(value,'base64url'),d=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));d.setAAD(Buffer.from(context));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8');}catch{throw new CommandError(503,'FACEBOOK_CREDENTIAL_UNAVAILABLE');}}
}
export const credentialContext=(tenant:string,connection:string,app:string,page:string)=>JSON.stringify([tenant,connection,app,page]);
export interface FacebookPage {id:string;name:string;token:string}
export class FacebookGraph {
 constructor(readonly config:FacebookConfig,private readonly request:typeof fetch=fetch){}
 authorization(state:string){const p=new URLSearchParams({client_id:this.config.appId,redirect_uri:this.config.origin+callbackPath,state,response_type:'code'});if(this.config.loginConfig)p.set('config_id',this.config.loginConfig);else p.set('scope','pages_show_list,pages_messaging,pages_manage_metadata,business_management');return 'https://www.facebook.com/v26.0/dialog/oauth?'+p;}
 private async json(path:string,params:URLSearchParams,token?:string):Promise<any>{
  if(token)params.set('appsecret_proof',createHmac('sha256',this.config.secret).update(token).digest('hex'));
  try{const r=await this.request('https://graph.facebook.com/v26.0/'+path+'?'+params,{redirect:'error',signal:AbortSignal.timeout(10000),headers:token?{authorization:'Bearer '+token}:{}});if(!r.ok)throw new Error();const reader=r.body?.getReader();if(!reader)throw new Error();const chunks:Uint8Array[]=[];let size=0;try{for(;;){const c=await reader.read();if(c.done)break;size+=c.value.length;if(size>1048576)throw new Error();chunks.push(c.value);}}finally{await reader.cancel();reader.releaseLock();}const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||typeof body!=='object'||body.error)throw new Error();return body;}catch{throw new CommandError(502,'FACEBOOK_API_UNAVAILABLE');}
 }
 async discover(code:string):Promise<FacebookPage[]>{
  const exchanged=await this.json('oauth/access_token',new URLSearchParams({client_id:this.config.appId,client_secret:this.config.secret,redirect_uri:this.config.origin+callbackPath,code}));
  if(!validToken(exchanged.access_token))throw new CommandError(502,'FACEBOOK_INVALID_RESPONSE');
  const pages=new Map<string,FacebookPage>(),seen=new Set<string>();let after:string|undefined;
  for(let i=0;i<20;i++){
   const p=new URLSearchParams({fields:'id,name,access_token,tasks',limit:'100',...(after?{after}:{})}),body=await this.json('me/accounts',p,exchanged.access_token);
   if(!Array.isArray(body.data)||body.data.length>100)throw new CommandError(502,'FACEBOOK_INVALID_RESPONSE');
   for(const row of body.data){if(!pageId(row?.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>255||!validToken(row.access_token))throw new CommandError(502,'FACEBOOK_INVALID_RESPONSE');pages.set(row.id,{id:row.id,name:row.name,token:row.access_token});}
   if(!body.paging?.next)return [...pages.values()];
   after=body.paging?.cursors?.after;if(typeof after!=='string'||!after||after.length>2048||seen.has(after))throw new CommandError(502,'FACEBOOK_INVALID_RESPONSE');seen.add(after);
  }throw new CommandError(502,'FACEBOOK_PAGE_LIMIT');
 }
 async verifyPage(token:string,expected:string){if(!validToken(token))throw new CommandError(422,'FACEBOOK_TOKEN_INVALID');const body=await this.json('me',new URLSearchParams({fields:'id'}),token);if(body.id!==expected)throw new CommandError(409,'FACEBOOK_PAGE_MISMATCH');}
}
