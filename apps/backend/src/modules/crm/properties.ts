import { CommandError } from '../../kernel/reliability/commands.js';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { fieldAllowed,type Access } from '../identity/domain/authorization.js';
export const propertyTypes=['string','text','integer','decimal','boolean','date','datetime','enum'] as const;
export interface Property {id:string;key:string;label:string;type:string;required:boolean;default_value:unknown;options:string[]|null;indexed:boolean;sensitive:boolean;version:string}
export const json=(v:any)=>typeof v==='string'?JSON.parse(v):v;
export function object(v:unknown,allowed?:string[]):Record<string,any>{
  if(!v||typeof v!=='object'||Array.isArray(v)||allowed&&Object.keys(v).some(k=>!allowed.includes(k)))throw new CommandError(400,'INVALID_REQUEST');return v as Record<string,any>;
}
export const validKey=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][a-z0-9_]{0,63}$/.test(v);
export function fieldError(field:string,code='VALIDATION_FAILED'):never {throw new FieldError(code==='FIELD_FORBIDDEN'?403:422,code,field);}
export class FieldError extends CommandError {constructor(status:number,code:string,readonly field:string){super(status,code);}}
export function checkField(access:Access,key:string,field:string,action:'read'|'write'|'filter'){if(!fieldAllowed(access,key,field,action))fieldError(field,'FIELD_FORBIDDEN');}
export function value(p:Pick<Property,'key'|'type'|'options'>,v:unknown):unknown{
  let ok=false;
  switch(p.type){
    case 'string':case 'text':ok=typeof v==='string'&&v.length<=(p.type==='text'?4000:255);break;
    case 'enum':ok=typeof v==='string'&&!!p.options?.includes(v);break;
    case 'integer':ok=Number.isSafeInteger(v);break;
    case 'decimal':ok=typeof v==='string'&&/^-?(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/.test(v);break;
    case 'boolean':ok=typeof v==='boolean';break;
    case 'date':ok=typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='1000-01-01'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;break;
    case 'datetime':ok=typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)&&v>='1000-01-01'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19);break;
  }
  if(!ok)fieldError(p.key);return p.type==='datetime'?new Date(v as string).toISOString():v;
}
const reserved=new Set(['id','tenant_id','object_key','version','owner_revision','owner_principal_id','team_id','archived','fields','custom_values','created_at','updated_at','status','owner','tenant','display_name','normalized_phone','normalized_email','lifecycle','customer_since','contact_preference','name','domain','kind','subject','body','due_at','related_record_id','contact_id','conversation_id','qualification_session_id','source_touchpoint_id','qualification','qualified_at','accepted_at']);
export function propertyInput(input:unknown){
  const b=object(input,['key','label','type','required','default_value','options','indexed','sensitive']);
  if(!validKey(b.key)||reserved.has(b.key)||typeof b.label!=='string'||!b.label.trim()||b.label.length>255||!propertyTypes.includes(b.type)||['required','indexed','sensitive'].some(k=>typeof b[k]!=='boolean'))throw new CommandError(400,'INVALID_REQUEST');
  if(b.type==='text'&&b.indexed)fieldError(b.key);
  if(b.type==='enum'){if(!Array.isArray(b.options)||!b.options.length||b.options.length>100||new Set(b.options).size!==b.options.length||b.options.some((v:any)=>typeof v!=='string'||!v.trim()||v.length>255))fieldError(b.key);}
  else if(b.options!==undefined&&b.options!==null)fieldError(b.key);
  if(b.default_value!==undefined&&b.default_value!==null)b.default_value=value(b as Property,b.default_value);
  if(b.required&&b.default_value===null)fieldError(b.key);
  return {...b,default_value:b.default_value??null,options:b.options??null} as unknown as Property;
}
export async function properties(scope:TransactionScope,typeId:string):Promise<Property[]>{
  const rows=await scope.query('SELECT *,CAST(default_value AS CHAR) default_json FROM property_definition WHERE tenant_id=? AND object_type_id=? AND archived_at IS NULL ORDER BY created_at,id',[scope.context.tenantId,typeId]);
  return rows.map((p:any)=>({id:p.id,key:p.key,label:p.label,type:p.type,required:!!p.required,default_value:p.default_json===null?null:JSON.parse(p.default_json),options:p.options===null?null:json(p.options),indexed:!!p.indexed,sensitive:!!p.sensitive,version:String(p.version)}));
}
export function mergeValues(defs:Property[],old:Record<string,unknown>,patch:unknown,access:Access,key:string,create=false){
  const input=object(patch),result={...old};
  for(const k of Object.keys(input)){
    const p=defs.find(p=>p.key===k);if(!p)fieldError(k);checkField(access,key,k,'write');
    if(input[k]===null){if(p.required)fieldError(k);delete result[k];}else result[k]=value(p,input[k]);
  }
  for(const p of defs){
    if(create&&!Object.hasOwn(input,p.key)&&p.default_value!==null){checkField(access,key,p.key,'write');result[p.key]=p.default_value;}
    if(p.required&&(result[p.key]===undefined||result[p.key]===null))fieldError(p.key);
  }
  return result;
}
export const column=(p:Property)=>`${p.type==='enum'?'string':p.type}_value`;
export const sqlValue=(p:Property,v:unknown)=>p.type==='datetime'?(v as string).replace('T',' ').replace('Z',''):p.type==='boolean'?(v?1:0):v;
export async function project(scope:TransactionScope,id:string,defs:Property[],values:Record<string,unknown>){
  await scope.query('DELETE FROM property_index_value WHERE tenant_id=? AND record_id=?',[scope.context.tenantId,id]);
  for(const p of defs)if(p.indexed&&values[p.key]!==undefined&&values[p.key]!==null){
    await scope.query(`INSERT INTO property_index_value(tenant_id,record_id,property_id,value_kind,${column(p)}) VALUES (?,?,?,?,?)`,[scope.context.tenantId,id,p.id,p.type==='enum'?'string':p.type,sqlValue(p,values[p.key])]);
  }
}
export interface Predicate {field:string;op:'eq'|'in'|'gte'|'lte';value:unknown}
export interface Sort {field:string;direction:'asc'|'desc'}
export function queryPlan(defs:Property[],access:Access,key:string,filter:unknown=[],sort:unknown=null){
  if(!Array.isArray(filter)||filter.length>10)throw new CommandError(400,'INVALID_REQUEST');
  const find=(keyName:string)=>{checkField(access,key,keyName,'filter');const p=defs.find(p=>p.key===keyName);if(!p?.indexed)fieldError(keyName,'FIELD_NOT_QUERYABLE');return p;};
  const predicates=filter.map(raw=>{const f=object(raw,['field','op','value']);if(typeof f.field!=='string'||!['eq','in','gte','lte'].includes(f.op)||!Object.hasOwn(f,'value'))throw new CommandError(400,'INVALID_REQUEST');const p=find(f.field);
    if(f.op==='in'){if(!Array.isArray(f.value)||!f.value.length||f.value.length>50)fieldError(f.field);return {...f,value:f.value.map((v:unknown)=>value(p,v))} as Predicate;}
    return {...f,value:value(p,f.value)} as Predicate;
  });
  let order:Sort|null=null;
  if(sort!==null){const s=object(sort,['field','direction']);if(typeof s.field!=='string'||!['asc','desc'].includes(s.direction))throw new CommandError(400,'INVALID_REQUEST');find(s.field);order=s as Sort;}
  return {predicates,order,find};
}
