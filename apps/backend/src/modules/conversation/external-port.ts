import {createHmac,timingSafeEqual} from 'node:crypto';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError,canonical} from '../../kernel/reliability/commands.js';
import type {ExternalObject} from '../crm/external-port.js';
import {stamp} from '../crm/core.js';
import {RecordRegistry} from '../crm/registry.js';
import {permits,type Access} from '../identity/domain/authorization.js';
import {uuid} from '../identity/admin.js';

const property=(key:string,type='string',sensitive=false)=>({key,label:key,type,sensitive});
export const conversationExternalCatalog:ExternalObject[]=[
  {key:'conversation',label:'Conversation',scope:'conversations.read',properties:[property('status'),property('opened_at','datetime'),property('closed_at','datetime'),property('contact_id','reference'),property('team_id','reference'),property('owner_principal_id','reference')]},
  {key:'conversation.messages',label:'Conversation messages',scope:'conversations.messages.read',properties:[property('direction'),property('status'),property('occurred_at','datetime'),property('received_at','datetime'),property('text','string',true)]},
];
export type ConversationReadKind='conversations'|'messages';
// Chat-owned application port. Registry access is the defined monolith CRM port.
// Callers supply independently verified app and (for messages) parent grants.
export class ExternalConversations {
  constructor(private readonly secret:string|Buffer){}
  async read(s:TransactionScope,accesses:Access[],kind:ConversationReadKind,id:string|undefined,messageId:string|undefined,q:Record<string,unknown>,fields:string[],policy:string){
    if(accesses.length!==(kind==='messages'?2:1)||accesses.some(a=>a.tenantId!==s.context.tenantId||a.superAdmin||!a.capabilities.includes('read')||!a.grants.some(g=>g.resource==='conversation'&&g.action==='read')))throw new CommandError(403,'FORBIDDEN');
    if(id!==undefined&&!uuid(id)||messageId!==undefined&&!uuid(messageId)||kind==='messages'&&!id)throw new CommandError(400,'INVALID_REQUEST');
    const detail=kind==='messages'?!!messageId:!!id;
    const limit=q.limit===undefined?50:Number(q.limit);
    if(Object.keys(q).some(k=>detail||!['limit','cursor'].includes(k))||typeof q.limit==='object'||!Number.isInteger(limit)||limit<1||limit>100)throw new CommandError(400,'INVALID_REQUEST');
    const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation' AND archived_at IS NULL",[s.context.tenantId]);
    if(!type)throw new CommandError(404,'NOT_FOUND');
    const registry=new RecordRegistry();
    if(id){const r=await registry.get(s,id);if(r.objectKey!=='conversation'||r.archived||accesses.some(a=>!permits(a,'conversation','read',r)))throw new CommandError(404,'NOT_FOUND');const [parent]=await s.query('SELECT record_id FROM conversation WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);if(!parent)throw new CommandError(404,'NOT_FOUND');}
    const binding={tenant:s.context.tenantId,policy,kind,parent:kind==='messages'?id:null};
    let position:{time:string;id:string}|undefined;
    if(q.cursor!==undefined){try{
      if(typeof q.cursor!=='string'||q.cursor.length>4096)throw Error();
      const [payload,sig,...extra]=q.cursor.split('.'),expected=createHmac('sha256',this.secret).update(payload!).digest('base64url');
      if(extra.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();
      const parsed=JSON.parse(Buffer.from(payload!,'base64url').toString());
      if(canonical(parsed.binding)!==canonical(binding)||!uuid(parsed.position.id)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(parsed.position.time))throw Error();position=parsed.position;
    }catch{throw new CommandError(400,'INVALID_CURSOR');}}
    const params:unknown[]=[s.context.tenantId,type.id];let where='';
    // Both grants must independently authorize the parent; sharing with distinct
    // approved teams is valid. No OR of the two grant policies.
    for(const a of accesses){if(a.grants.some(g=>g.resource==='conversation'&&g.action==='read'&&g.scope==='all'))continue;
      if(!a.teamIds.length){where+=' AND 1=0';continue;}
      const marks=a.teamIds.map(()=>'?').join(',');
      where+=` AND (r.team_id IN (${marks}) OR EXISTS(SELECT 1 FROM record_team_access ra WHERE ra.tenant_id=r.tenant_id AND ra.record_id=r.id AND ra.team_id IN (${marks})))`;
      params.push(...a.teamIds,...a.teamIds);
    }
    if(id){where+=' AND c.record_id=?';params.push(id);}
    if(messageId){where+=' AND m.id=?';params.push(messageId);}
    const message=kind==='messages',time=message?'m.received_at':'c.opened_at',key=message?'m.id':'c.record_id';
    if(position){where+=` AND (${time}>? OR (${time}=? AND ${key}>?))`;params.push(position.time,position.time,position.id);}
    const columns=message?'m.id,m.conversation_id,m.direction,m.status,m.occurred_at,m.received_at,m.text':'c.record_id id,r.version,c.status,c.opened_at,c.closed_at,c.contact_id,r.team_id,r.owner_principal_id';
    const rows=await s.query(`SELECT ${columns},DATE_FORMAT(${time},'%Y-%m-%d %H:%i:%s.%f') position_time FROM conversation c JOIN crm_record r ON r.tenant_id=c.tenant_id AND r.id=c.record_id${message?' JOIN message m ON m.tenant_id=c.tenant_id AND m.conversation_id=c.record_id':''} WHERE c.tenant_id=? AND r.object_type_id=? AND r.archived_at IS NULL${where} ORDER BY ${time},${key} LIMIT ${detail?1:limit+1}`,params);
    if(detail&&!rows.length)throw new CommandError(404,'NOT_FOUND');
    const allowed=conversationExternalCatalog[message?1:0]!.properties.filter(p=>fields.includes(p.key));
    const shape=(row:any)=>({id:row.id,...(message?{conversation_id:row.conversation_id}:{version:String(row.version)}),properties:Object.fromEntries(allowed.map(p=>[p.key,p.type==='datetime'?stamp(row[p.key]):row[p.key]]))});
    if(detail)return {data:shape(rows[0])};
    let cursor:string|null=null;
    if(rows.length>limit){const row=rows[limit-1],payload=Buffer.from(JSON.stringify({binding,position:{time:row.position_time,id:row.id}})).toString('base64url');cursor=`${payload}.${createHmac('sha256',this.secret).update(payload).digest('base64url')}`;}
    return {data:rows.slice(0,limit).map(shape),next_cursor:cursor};
  }
}
