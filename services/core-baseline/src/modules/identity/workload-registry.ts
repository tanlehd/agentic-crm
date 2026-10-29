import type {DataSource,EntityManager} from 'typeorm';
import {PLATFORM_TENANT_ID} from '../../kernel/database/system-scope.js';
import {workloadServices,workloadIdentity,type TlsMaterial,type ServiceName} from '@agentic-crm/workload-transport';

export type WorkloadService=ServiceName;
export class WorkloadError extends Error{
 constructor(readonly code:'INVALID_REQUEST'|'FORBIDDEN'|'CONFLICT'|'DEPENDENCY_UNAVAILABLE'){super(code);}
}
const fail=(code:WorkloadError['code']):never=>{throw new WorkloadError(code);};
const validService=(s:string):s is WorkloadService=>(workloadServices as readonly string[]).includes(s);
const validFingerprint=(s:string)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const validTenant=(s:string)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)&&s!==PLATFORM_TENANT_ID;
const clock='FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000)';
export const workloadAdmissionSql=`SELECT s.version FROM identity_workload_service s
 JOIN identity_workload_certificate c ON c.tenant_id=s.tenant_id AND c.service=s.service
 JOIN identity_workload_admission a ON a.service=s.service AND a.tenant_id=?
 JOIN tenant t ON t.id=a.tenant_id AND t.tenant_id=t.id AND t.kind='business' AND t.status='active'
 JOIN tenant sys ON sys.id=s.tenant_id AND sys.tenant_id=sys.id AND sys.kind='system' AND sys.status='active'
 WHERE s.tenant_id=? AND s.service=? AND s.enabled=1 AND a.enabled=1 AND c.fingerprint=? AND c.revoked=0
 AND c.not_before_ms<=${clock} AND c.not_after_ms>${clock} AND c.accept_until_ms>${clock}`;

// Identity local authority only. TLS uses CA-verified DER fingerprints; explicit local HTTP uses configured key fingerprints.
export class NativeWorkloadRegistry{
 constructor(private readonly source:DataSource,private readonly localMaterial?:TlsMaterial){}
 async authorize(service:WorkloadService,fingerprint:string,tenant:string):Promise<void>{
  if(!validService(service)||!validFingerprint(fingerprint)||!validTenant(tenant))fail('FORBIDDEN');
  let rows:unknown[];
  try{
   if(this.localMaterial?.localHttp){
    if(workloadIdentity({...this.localMaterial,service}).fingerprint!==fingerprint)fail('FORBIDDEN');
    rows=await this.source.query(`SELECT s.version FROM identity_workload_service s
      JOIN identity_workload_admission a ON a.service=s.service AND a.tenant_id=?
      JOIN tenant t ON t.id=a.tenant_id AND t.tenant_id=t.id AND t.kind='business' AND t.status='active'
      JOIN tenant sys ON sys.id=s.tenant_id AND sys.tenant_id=sys.id AND sys.kind='system' AND sys.status='active'
      WHERE s.tenant_id=? AND s.service=? AND s.enabled=1 AND a.enabled=1`,[tenant,PLATFORM_TENANT_ID,service]);
   }else rows=await this.source.query(workloadAdmissionSql,[tenant,PLATFORM_TENANT_ID,service,fingerprint]);
  }
  catch(error){if(error instanceof WorkloadError)throw error;throw new WorkloadError('DEPENDENCY_UNAVAILABLE');}
  if(rows.length!==1)fail('FORBIDDEN');
 }
}

// Operator-only application port, never registered as a public or private dispatch route.
export class WorkloadRegistryOperator{
 constructor(private readonly source:DataSource){}
 private async tenant(m:EntityManager,tenant:string,kind:'system'|'business'){
  const [row]=await m.query('SELECT kind,status FROM tenant WHERE tenant_id=? AND id=? FOR SHARE',[tenant,tenant]);
  if(!row||row.kind!==kind||row.status!=='active')fail('FORBIDDEN');
 }
 private async audit(m:EntityManager,service:WorkloadService,version:string,operation:string,tenant:string|null=null,fingerprint:string|null=null){
  await m.query('INSERT INTO identity_workload_event(tenant_id,service,version,operation,target_tenant_id,fingerprint,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))',[PLATFORM_TENANT_ID,service,version,operation,tenant,fingerprint]);
 }
 async initialize(service:WorkloadService):Promise<string>{
  if(!validService(service))fail('INVALID_REQUEST');
  return this.source.transaction('READ COMMITTED',async m=>{
   await this.tenant(m,PLATFORM_TENANT_ID,'system');
   await m.query('INSERT INTO identity_workload_service(tenant_id,service,enabled,version,created_at,updated_at) VALUES(?,?,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE service=service',[PLATFORM_TENANT_ID,service]);
   const [row]=await m.query('SELECT version FROM identity_workload_service WHERE tenant_id=? AND service=? FOR UPDATE',[PLATFORM_TENANT_ID,service]);
   const [event]=await m.query('SELECT version FROM identity_workload_event WHERE tenant_id=? AND service=? AND version=1',[PLATFORM_TENANT_ID,service]);
   if(!event)await this.audit(m,service,'1','initialize');
   return String(row.version);
  });
 }
 private async mutate(service:WorkloadService,expected:string,operation:string,tenant:string|null,fingerprint:string|null,work:(m:EntityManager,now:number)=>Promise<void>):Promise<string>{
  if(!validService(service)||typeof expected!=='string'||!/^[1-9][0-9]{0,19}$/.test(expected))fail('INVALID_REQUEST');
  return this.source.transaction('READ COMMITTED',async m=>{
   await this.tenant(m,PLATFORM_TENANT_ID,'system');
   if(tenant)await this.tenant(m,tenant,'business');
   const [row]=await m.query('SELECT version FROM identity_workload_service WHERE tenant_id=? AND service=? FOR UPDATE',[PLATFORM_TENANT_ID,service]);
   if(!row||String(row.version)!==expected)fail('CONFLICT');
   const [time]=await m.query(`SELECT ${clock} now_ms`);
   await work(m,Number(time.now_ms));
   const version=(BigInt(expected)+1n).toString();
   await m.query('UPDATE identity_workload_service SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND service=?',[version,PLATFORM_TENANT_ID,service]);
   await this.audit(m,service,version,operation,tenant,fingerprint);
   return version;
  });
 }
 async setEnabled(service:WorkloadService,expected:string,enabled:boolean){
  if(typeof enabled!=='boolean')fail('INVALID_REQUEST');
  return this.mutate(service,expected,enabled?'enable':'disable',null,null,async m=>{
   await m.query('UPDATE identity_workload_service SET enabled=? WHERE tenant_id=? AND service=?',[enabled,PLATFORM_TENANT_ID,service]);
  });
 }
 async admit(service:WorkloadService,expected:string,tenant:string,enabled:boolean){
  if(!validTenant(tenant)||typeof enabled!=='boolean')fail('INVALID_REQUEST');
  return this.mutate(service,expected,enabled?'admit':'deny',tenant,null,async m=>{
   await m.query('INSERT INTO identity_workload_admission(tenant_id,service,enabled,updated_at) VALUES(?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE enabled=?,updated_at=UTC_TIMESTAMP(6)',[tenant,service,enabled,enabled]);
  });
 }
 async rotate(service:WorkloadService,expected:string,input:{fingerprint:string;notBeforeMs:number;notAfterMs:number},overlapMs:number){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('INVALID_REQUEST');
  const {fingerprint,notBeforeMs,notAfterMs}=input;
  if(Object.keys(input).sort().join(',')!=='fingerprint,notAfterMs,notBeforeMs'||!validFingerprint(fingerprint)||![notBeforeMs,notAfterMs,overlapMs].every(Number.isSafeInteger)||notBeforeMs<0||notAfterMs<=notBeforeMs||notAfterMs-notBeforeMs>86400000||overlapMs<0||overlapMs>3600000)fail('INVALID_REQUEST');
  return this.mutate(service,expected,'rotate',null,fingerprint,async(m,now)=>{
   if(notBeforeMs>now||notAfterMs<=now)fail('INVALID_REQUEST');
   const [old]=await m.query('SELECT fingerprint FROM identity_workload_certificate WHERE tenant_id=? AND service=? AND fingerprint=?',[PLATFORM_TENANT_ID,service,fingerprint]);
   if(old)fail('CONFLICT');
   await m.query('UPDATE identity_workload_certificate SET accept_until_ms=LEAST(accept_until_ms,?) WHERE tenant_id=? AND service=? AND revoked=0',[now+overlapMs,PLATFORM_TENANT_ID,service]);
   await m.query('INSERT INTO identity_workload_certificate(tenant_id,service,fingerprint,not_before_ms,not_after_ms,accept_until_ms,revoked,created_at) VALUES(?,?,?,?,?,?,0,UTC_TIMESTAMP(6))',[PLATFORM_TENANT_ID,service,fingerprint,notBeforeMs,notAfterMs,notAfterMs]);
  });
 }
 async revoke(service:WorkloadService,expected:string,fingerprint:string){
  if(!validFingerprint(fingerprint))fail('INVALID_REQUEST');
  return this.mutate(service,expected,'revoke',null,fingerprint,async m=>{
   const [row]=await m.query('SELECT revoked FROM identity_workload_certificate WHERE tenant_id=? AND service=? AND fingerprint=?',[PLATFORM_TENANT_ID,service,fingerprint]);
   if(!row||row.revoked)fail('CONFLICT');
   await m.query('UPDATE identity_workload_certificate SET revoked=1 WHERE tenant_id=? AND service=? AND fingerprint=?',[PLATFORM_TENANT_ID,service,fingerprint]);
  });
 }
}
