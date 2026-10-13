import { createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual } from 'node:crypto';
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import { authoritySchema } from './marketing-contract.generated.js';
import { CommandError,canonical } from '../../kernel/reliability/commands.js';
import { PLATFORM_TENANT_ID } from '../../kernel/database/system-scope.js';
import { uuid } from '../identity/admin.js';
const validator=new Ajv({allErrors:false,strict:false});(addFormats as unknown as (a:Ajv)=>void)(validator);validator.addSchema(authoritySchema);
export function validateMarketing(name:string,input:unknown):Record<string,any>{
 const check=validator.getSchema(authoritySchema.$id+'#/definitions/'+name);
 if(!check||!check(input))throw new CommandError(400,'INVALID_REQUEST');
 const b=input as Record<string,any>;
 for(const key of ['fence','expected_version','expected_page_revision','expected_credential_revision'])if(b[key]&&BigInt(b[key])>18446744073709551615n)throw new CommandError(400,'INVALID_REQUEST');
 return b;
}
export const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
export interface MarketingConfig {appId:string;keyId:string;encryptionKey:string;operationKey:string}
export function marketingConfig(env:NodeJS.ProcessEnv=process.env):MarketingConfig|null{
 if(!env.MARKETING_APP_ID&&!env.MARKETING_TOKEN_ENCRYPTION_KEY&&!env.MARKETING_OPERATION_KEY)return null;
 if(!/^[A-Za-z0-9_-]{1,255}$/.test(env.MARKETING_APP_ID??'')||!/^[a-f0-9]{64}$/.test(env.MARKETING_TOKEN_ENCRYPTION_KEY??'')||!/^[a-f0-9]{64}$/.test(env.MARKETING_OPERATION_KEY??'')||!/^[A-Za-z0-9_-]{1,64}$/.test(env.MARKETING_KEY_ID??''))throw new Error('MARKETING_CONFIGURATION_INVALID');
 return {appId:env.MARKETING_APP_ID!,keyId:env.MARKETING_KEY_ID!,encryptionKey:env.MARKETING_TOKEN_ENCRYPTION_KEY!,operationKey:env.MARKETING_OPERATION_KEY!};
}
export class MarketingCrypto {
 constructor(private readonly config:MarketingConfig){}
 private aad(tenant:string,id:string,account:string){return Buffer.from(JSON.stringify(['marketing-account-v1',tenant,id,this.config.appId,account,this.config.keyId]));}
 seal(token:string,tenant:string,id:string,account:string){
  if(!token||token.length>8192||/[\r\n\x00]/.test(token))throw new CommandError(422,'CREDENTIAL_INVALID');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(this.config.encryptionKey,'hex'),iv);cipher.setAAD(this.aad(tenant,id,account));const bytes=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);return 'v1.'+Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64url');
 }
 open(value:string,tenant:string,id:string,account:string,keyId:string){try{if(!value.startsWith('v1.')||keyId!==this.config.keyId)throw new Error();const b=Buffer.from(value.slice(3),'base64url'),cipher=createDecipheriv('aes-256-gcm',Buffer.from(this.config.encryptionKey,'hex'),b.subarray(0,12));cipher.setAAD(this.aad(tenant,id,account));cipher.setAuthTag(b.subarray(12,28));return Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString('utf8');}catch{throw new CommandError(503,'CREDENTIAL_UNAVAILABLE');}}
 commandHash(body:unknown){return createHmac('sha256',Buffer.from(this.config.operationKey,'hex')).update(canonical(body)).digest('hex');}
}
export interface MarketingIntegration {connection_id:string;tenant_id:string;consumer:'marketing';audience:'marketing-authority';credential_ids:string[];token_hashes:string[];active:boolean}
export class MarketingIntegrationAuth {
 private readonly entries:MarketingIntegration[];
 constructor(serialized:string|undefined){try{const rows=JSON.parse(serialized??'[]');if(!Array.isArray(rows)||rows.length>1000)throw new Error();const seen=new Set();for(const r of rows){if(!uuid(r.connection_id)||seen.has(r.connection_id)||!uuid(r.tenant_id)||[PLATFORM_TENANT_ID,'00000000-0000-0000-0000-000000000000'].includes(r.tenant_id)||r.consumer!=='marketing'||r.audience!=='marketing-authority'||typeof r.active!=='boolean'||!Array.isArray(r.credential_ids)||!r.credential_ids.length||!r.credential_ids.every(uuid)||!Array.isArray(r.token_hashes)||r.token_hashes.length<1||r.token_hashes.length>2||!r.token_hashes.every((x:unknown)=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))throw new Error();seen.add(r.connection_id);}this.entries=rows;}catch{throw new Error('MARKETING_INTEGRATIONS_INVALID');}}
 authenticate(headers:Record<string,unknown>):MarketingIntegration{
  if(['cookie','origin','x-tenant-id'].some(k=>headers[k]!==undefined))throw new CommandError(403,'INTEGRATION_FORBIDDEN');
  const auth=headers.authorization,id=headers['x-integration-id'];if(!uuid(id)||typeof auth!=='string'||!/^Bearer [a-f0-9]{64}$/.test(auth))throw new CommandError(401,'INTEGRATION_UNAUTHORIZED');
  const hash=createHash('sha256').update(auth.slice(7)).digest(),row=this.entries.find(x=>x.connection_id===id);
  const matches=(row?.token_hashes??['0'.repeat(64)]).map(x=>timingSafeEqual(Buffer.from(x,'hex'),hash)).some(Boolean);
  if(!row||!matches)throw new CommandError(401,'INTEGRATION_UNAUTHORIZED');if(!row.active)throw new CommandError(403,'INTEGRATION_FORBIDDEN');return row;
 }
}
