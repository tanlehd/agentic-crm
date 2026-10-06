import { createHmac, timingSafeEqual } from 'node:crypto';
import { BridgeError, canonical, hash } from './validation.js';
export interface MetaApp { id:string; secret_env:string; verify_env:string }
export const providerId = (v:unknown):v is string => typeof v==='string' && /^\d{1,32}$/.test(v);
const object = (v:unknown):v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const invalid = ():never => { throw new BridgeError(400,'INVALID_WEBHOOK'); };
const denied = ():never => { throw new BridgeError(403,'WEBHOOK_FORBIDDEN'); };
function opaque(v:unknown,limit=255):string { if(typeof v!=='string'||!v.trim()||v.length>limit||/[\u0000-\u001f\u007f]/.test(v))return invalid();return v; }
function idOf(v:unknown):string { if(!object(v))return invalid();return opaque(v.id); }
export function metaApps(value:string|undefined):MetaApp[] {
 if(!value)return [];
 const parsed:unknown=JSON.parse(value);
 if(!Array.isArray(parsed)||parsed.length>100)throw new Error('INVALID_META_CONFIG');
 const ids=new Set<string>();
 for(const app of parsed){if(!object(app)||Object.keys(app).sort().join(',')!=='id,secret_env,verify_env'||!providerId(app.id)||ids.has(app.id)||![app.secret_env,app.verify_env].every(v=>typeof v==='string'&&/^CONNECTOR_META_[A-Z0-9_]{1,100}$/.test(v)))throw new Error('INVALID_META_CONFIG');ids.add(app.id);}
 return parsed as MetaApp[];
}
export class MessengerAuth {
 constructor(private readonly apps:MetaApp[],private readonly env:NodeJS.ProcessEnv){}
 private secret(appId:string,field:'secret_env'|'verify_env'):string {
  const app=this.apps.find(a=>a.id===appId),value=app?this.env[app[field]]:undefined;
  if(!value||value.length<32||value.length>4096)return denied();return value;
 }
 challenge(appId:string,query:Record<string,unknown>):string {
  if(Object.keys(query).sort().join(',')!=='hub.challenge,hub.mode,hub.verify_token'||query['hub.mode']!=='subscribe'||typeof query['hub.challenge']!=='string'||!/^\d{1,128}$/.test(query['hub.challenge'])||typeof query['hub.verify_token']!=='string')return invalid();
  const expected=Buffer.from(hash(this.secret(appId,'verify_env')),'hex'),actual=Buffer.from(hash(query['hub.verify_token']),'hex');
  if(!timingSafeEqual(expected,actual))return denied();return query['hub.challenge'];
 }
 verify(appId:string,body:unknown,signature:unknown):Buffer {
  const secret=this.secret(appId,'secret_env');
  if(!Buffer.isBuffer(body)||body.length>65536||typeof signature!=='string'||!/^sha256=[a-fA-F0-9]{64}$/.test(signature))return denied();
  const expected=createHmac('sha256',secret).update(body).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature.slice(7),'hex')))return denied();return body;
 }
}
export interface CapturedEvent { page_id:string; event_key:string; digest:string; stream:'messaging'|'standby'; kind:string; status:'captured'|'attention'; normalized:Record<string,unknown> }
export function parseMessenger(raw:Buffer):CapturedEvent[] {
 let body:unknown;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{return invalid();}
 if(!object(body)||body.object!=='page'||Object.keys(body).some(k=>!['object','entry'].includes(k))||!Array.isArray(body.entry)||!body.entry.length||body.entry.length>100)return invalid();
 const result:CapturedEvent[]=[];
 for(const entry of body.entry){
  if(!object(entry)||!providerId(entry.id)||entry.time!==undefined&&(!Number.isSafeInteger(entry.time)||Number(entry.time)<0)||Object.keys(entry).some(k=>!['id','time','messaging','standby'].includes(k)))return invalid();
  let count=0;
  for(const stream of ['messaging','standby'] as const){
   const events=entry[stream];if(events===undefined)continue;
   if(!Array.isArray(events)||!events.length||events.length>100)return invalid();
   for(const event of events){
    if(!object(event)||!Number.isSafeInteger(event.timestamp)||Number(event.timestamp)<0||Number(event.timestamp)>253402300799999)return invalid();
    const sender=idOf(event.sender),recipient=idOf(event.recipient),digest=hash(canonical(event));
    let kind='unsupported',mid:string|null=null,text:string|null=null,reply:string|null=null;
    let attachments:Record<string,unknown>[]=[];
    const message=event.message;
    if(message!==undefined){
     if(!object(message))return invalid();mid=opaque(message.mid);
     if(message.is_echo!==undefined&&typeof message.is_echo!=='boolean')return invalid();
     const echo=message.is_echo===true;
     if((echo?sender:recipient)!==entry.id)return invalid();
     kind=echo?'echo':'inbound';
     if(message.text!==undefined){if(typeof message.text!=='string'||message.text.length>4000)return invalid();text=message.text;}
     if(message.reply_to!==undefined){if(!object(message.reply_to))return invalid();reply=opaque(message.reply_to.mid);}
     if(message.attachments!==undefined){
      if(!Array.isArray(message.attachments)||message.attachments.length>20)return invalid();
      attachments=message.attachments.map((a:unknown)=>{
       if(!object(a))return invalid();const type=opaque(a.type,64),p=object(a.payload)?a.payload:{};
       let url:string|null=null;
       if(p.url!==undefined){if(typeof p.url!=='string'||p.url.length>8192)return invalid();try{const u=new URL(p.url);if(u.protocol!=='https:'||u.username||u.password)return invalid();url=p.url;}catch{return invalid();}}
       if(!['image','audio','video','file','sticker'].includes(type))kind='unsupported';
       return {type,url,provider_id:typeof p.attachment_id==='string'?opaque(p.attachment_id):null};
      });
     }
     if(Object.keys(message).some(k=>!['mid','text','reply_to','attachments','is_echo','app_id','metadata','quick_reply'].includes(k)))kind='unsupported';
     if(!text&&!attachments.length)kind='unsupported';
    }else{
     if(sender!==entry.id&&recipient!==entry.id)return invalid();
     const kinds=[['delivery','delivery'],['read','read'],['pass_thread_control','control'],['take_thread_control','control'],['request_thread_control','control'],['postback','postback']].filter(([key])=>event[key!]!==undefined);
     if(kinds.length===1)kind=kinds[0]![1]!;
    }
    // Preserve minimized known content; hash unknown extensions without exposing them.
    if(message!==undefined&&['delivery','read','pass_thread_control','take_thread_control','request_thread_control','postback'].some(k=>event[k]!==undefined))kind='unsupported';
    if(Object.keys(event).some(k=>!['sender','recipient','timestamp','message','delivery','read','pass_thread_control','take_thread_control','request_thread_control','postback','referral'].includes(k)))kind='unsupported';
    const referral=object(event.referral)?Object.fromEntries(['source','type','ref','ad_id'].filter(k=>typeof event.referral==='object'&&event.referral!==null&&typeof (event.referral as Record<string,unknown>)[k]==='string').map(k=>[k,opaque((event.referral as Record<string,unknown>)[k],255)])):null;
    // Message identity does not change if new extensions change classification.
    const event_key=hash(canonical([stream,mid?(object(message)&&message.is_echo===true?'echo':'message'):kind,mid??digest]));
    result.push({page_id:entry.id,event_key,digest,stream,kind,status:kind==='inbound'&&stream==='messaging'?'captured':'attention',normalized:{version:1,platform:'messenger',stream,kind,page_id:entry.id,sender_id:sender,recipient_id:recipient,occurred_at:new Date(Number(event.timestamp)).toISOString(),external_msg_id:mid,text,text_source:text!==null?'original':null,reply_to:reply?{external_msg_id:reply}:null,attachments,referral}});
    count++;if(result.length>100)return invalid();
   }
  }
  if(!count)return invalid();
 }
 return result;
}
