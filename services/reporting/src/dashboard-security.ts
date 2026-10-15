import {createHmac,timingSafeEqual} from 'node:crypto';
import {Ajv} from 'ajv';
import {dashboardSchema} from './dashboard-schema.generated.js';
import {StorageError,hash,systemTenant,type Scope} from './storage-security.js';
export interface DashboardAdmission {audience:'reporting-dashboard-v1';tenantId:string;principalId:string;authRevision:string;readScope:Scope;designScope:Scope;canRun:boolean;bodyHash:string;issuedAt:number;expiresAt:number}
export interface Widget {id:string;reportId:string;reportVersion:string;bindingId:string;generationId:string;titleOverride:string|null;note:string;layout:{x:number;y:number;w:number;h:number}}
export const mutations=new Set(['create','update','archive','duplicate','from_template','convert_legacy']);
const ajv=new Ajv({strict:true});ajv.addSchema(dashboardSchema);
export function assertDashboard(a:DashboardAdmission){if(!ajv.getSchema(dashboardSchema.$id+'#/definitions/admission')!(a)||a.tenantId===systemTenant||a.tenantId==='00000000-0000-0000-0000-000000000000'||a.expiresAt<=Date.now()||a.issuedAt>Date.now()+250||a.expiresAt-a.issuedAt>5000||a.expiresAt<=a.issuedAt)throw new StorageError(401,'ADMISSION_EXPIRED_OR_INVALID');}
export function dashboardOperation(v:unknown):Record<string,any>{if(!ajv.getSchema(dashboardSchema.$id+'#/definitions/operation')!(v))throw new StorageError(400,'INVALID_REQUEST');const op=v as Record<string,any>;if(op.body?.name!==undefined&&(!op.body.name.trim()||op.body.name!==op.body.name.trim()))throw new StorageError(400,'INVALID_REQUEST');return op;}
export function validateLayout(widgets:Widget[]){
 if(!ajv.getSchema(dashboardSchema.$id+'#/definitions/content')!({name:'layout',description:'',widgets})||new Set(widgets.map(w=>w.id)).size!==widgets.length)throw new StorageError(422,'INVALID_LAYOUT');
 for(let i=0;i<widgets.length;i++){const w=widgets[i]!,a=w.layout;if(a.x+a.w>12||a.y+a.h>120||w.titleOverride!==null&&!w.titleOverride.trim())throw new StorageError(422,'INVALID_LAYOUT');for(const b of widgets.slice(0,i).map(w=>w.layout))if(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h)throw new StorageError(422,'INVALID_LAYOUT');}
}
export class DashboardVerifier {
 constructor(private readonly key:string){if(!/^[a-f0-9]{64}$/.test(key))throw Error('REPORTING_ADMISSION_KEY_REQUIRED');}
 verify(token:unknown,raw:string){if(typeof token!=='string'||token.length>4096)throw new StorageError(401,'UNAUTHORIZED');const [p,s,...extra]=token.split('.');const sig=createHmac('sha256',Buffer.from(this.key,'hex')).update(p??'').digest('hex');if(extra.length||!s||!/^[a-f0-9]{64}$/.test(s)||!timingSafeEqual(Buffer.from(s,'hex'),Buffer.from(sig,'hex')))throw new StorageError(401,'UNAUTHORIZED');let a:DashboardAdmission;try{a=JSON.parse(Buffer.from(p!,'base64url').toString());}catch{throw new StorageError(401,'UNAUTHORIZED');}assertDashboard(a);if(a.bodyHash!==hash(raw))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');return a;}
 cursor(value:unknown){const p=Buffer.from(JSON.stringify(value)).toString('base64url');return p+'.'+createHmac('sha256',Buffer.from(this.key,'hex')).update('cursor:'+p).digest('hex');}
 readCursor(token:string){const [p,s,...rest]=token.split('.'),sig=createHmac('sha256',Buffer.from(this.key,'hex')).update('cursor:'+(p??'')).digest('hex');if(rest.length||!s||!/^[a-f0-9]{64}$/.test(s)||!timingSafeEqual(Buffer.from(s,'hex'),Buffer.from(sig,'hex')))throw new StorageError(400,'INVALID_CURSOR');try{return JSON.parse(Buffer.from(p!,'base64url').toString());}catch{throw new StorageError(400,'INVALID_CURSOR');}}
}
