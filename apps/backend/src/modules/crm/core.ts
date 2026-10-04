import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { RecordRegistry,type RegistryRecord } from './registry.js';
import type { RecordDomain } from './records.js';
import { object,value,fieldError,json,type Property } from './properties.js';
export type ArchiveGuard=(scope:TransactionScope,record:RegistryRecord)=>Promise<void>;
export interface ContactReferencePort { requireActive(scope:TransactionScope,access:Access,id:string):Promise<void> }
export const contactReferences:ContactReferencePort={requireActive:async(s,a,id)=>{
  if(!uuid(id))fieldError('contact_id');const r=await new RecordRegistry().get(s,id);new RecordRegistry().read(a,r);
  if(r.objectKey!=='contact'||r.archived||!(await s.query('SELECT record_id FROM contact WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]))[0])throw new CommandError(404,'NOT_FOUND');
}};
export function phone(v:unknown):string|null{if(v===null)return null;if(typeof v!=='string')fieldError('normalized_phone');const p=v.trim().replace(/[ ()-]/g,'');if(!/^\+[1-9]\d{7,14}$/.test(p))fieldError('normalized_phone');return p;}
const text=(v:unknown,key:string,max=255)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fieldError(key);return v.trim();};
const nullable=(v:unknown,key:string,max:number)=>{if(v===null)return null;if(typeof v!=='string'||v.length>max)fieldError(key);return v;};
export const stamp=(v:any)=>v===null?null:v instanceof Date?v.toISOString():new Date(v).toISOString();
export const standardProperty=(key:string,type:string,options:string[]|null=null):Property=>({id:`standard:${key}`,key,label:key,type,required:false,default_value:null,options,indexed:true,sensitive:false,version:'1'});
export const standardQueries:Record<string,Property[]>={contact:['display_name','normalized_phone','normalized_email'].map(k=>standardProperty(k,'string')),company:['name','domain'].map(k=>standardProperty(k,'string')),activity:[standardProperty('kind','enum',['note','task','call']),standardProperty('subject','string'),standardProperty('due_at','datetime')],lead:[standardProperty('status','enum',['new','qualifying','qualified','handed_off','accepted','disqualified']),standardProperty('qualified_at','datetime')]};
export const standardFields:Record<string,Property[]>={
  contact:[...standardQueries.contact!,{...standardProperty('contact_preference','text'),indexed:false}],
  company:standardQueries.company!,
  activity:[...standardQueries.activity!,{...standardProperty('body','text'),indexed:false},{...standardProperty('related_record_id','string'),indexed:false}],
  lead:[...standardQueries.lead!,{...standardProperty('qualification','text'),indexed:false}],
};
export function coreDomains():Map<string,RecordDomain>{
  const domains=new Map<string,RecordDomain>();
  for(const kind of ['contact','company','activity']){
    const validate=async(s:TransactionScope,a:Access,input:unknown,create:boolean)=>{
      const allowed=kind==='contact'?['display_name','normalized_phone','normalized_email','contact_preference']:kind==='company'?['name','domain']:create?['kind','subject','body','due_at','related_record_id']:['subject','body','due_at'];
      const b=object(input,allowed),out:Record<string,unknown>={};
      for(const [k,v] of Object.entries(b)){
        if(['display_name','name','subject'].includes(k))out[k]=text(v,k);
        else if(k==='normalized_phone')out[k]=phone(v);
        else if(k==='normalized_email'){const email=nullable(v,k,254)?.trim().toLowerCase()??null;if(email!==null&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fieldError(k);out[k]=email;}
        else if(k==='domain'){const domain=nullable(v,k,253)?.trim().toLowerCase()??null;if(domain!==null&&!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain))fieldError(k);out[k]=domain;}
        else if(k==='contact_preference'){const p=object(v,['preferred_contact_method']);if(p.preferred_contact_method!==undefined&&!['messenger','phone','email'].includes(p.preferred_contact_method))fieldError(k);out[k]=JSON.stringify(p);}
        else if(k==='body')out[k]=nullable(v,k,4000);
        else if(k==='due_at')out[k]=v===null?null:(value({key:k,type:'datetime',options:null},v) as string).replace('T',' ').replace('Z','');
        else if(k==='kind'){if(!['note','task','call'].includes(String(v)))fieldError(k);out[k]=v;}
        else if(k==='related_record_id'){if(!uuid(v))fieldError(k);const r=await new RecordRegistry().get(s,v);new RecordRegistry().read(a,r);if(r.archived)throw new CommandError(409,'INVALID_TRANSITION');out[k]=v;}
      }
      if(create)for(const k of kind==='contact'?['display_name']:kind==='company'?['name']:['kind','subject','related_record_id'])if(out[k]===undefined)fieldError(k);
      return out;
    };
    domains.set(kind,{
      adapter:{insert:async(s,id,input,a,correlation)=>{
        const fields=await validate(s,a,input,true),keys=Object.keys(fields);
        await s.query(`INSERT INTO ${kind}(tenant_id,record_id,${keys.join(',')}) VALUES (?,?,${keys.map(()=>'?').join(',')})`,[s.context.tenantId,id,...keys.map(k=>fields[k])]);
        if(kind==='contact')await new DurableCommands().domainEvent(s,a.principalId,correlation,'contact.created',id,'1',{contact_id:id});
      },exists:async(s,id)=>!!(await s.query(`SELECT record_id FROM ${kind} WHERE tenant_id=? AND record_id=?`,[s.context.tenantId,id]))[0],eligible:async()=>{},assigned:async()=>{}},
      read:async(s,r)=>{const [row]=await s.query(`SELECT * FROM ${kind} WHERE tenant_id=? AND record_id=?`,[s.context.tenantId,r.id]);if(!row)throw new CommandError(404,'NOT_FOUND');const {tenant_id,record_id,...fields}=row;
        if(kind==='contact'){fields.contact_preference=json(fields.contact_preference);fields.customer_since=stamp(fields.customer_since);}if(kind==='activity')fields.due_at=stamp(fields.due_at);return fields;},
      update:async(s,r,input,a)=>{const fields=await validate(s,a,input,false),keys=Object.keys(fields);if(keys.length)await s.query(`UPDATE ${kind} SET ${keys.map(k=>`${k}=?`).join(',')} WHERE tenant_id=? AND record_id=?`,[...keys.map(k=>fields[k]),s.context.tenantId,r.id]);},
      archive:async()=>{},
    });
  }
  return domains;
}
