import {randomUUID} from 'node:crypto';
import type {OwnerCommandRef} from '@agentic-crm/contracts';
import {OwnerError,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import {CommandError} from '../kernel/reliability/commands.js';
import type {parseAppToken} from '../modules/identity/external-apps.js';
import type {NativeExternalReadAdmissions} from '../modules/identity/external-read-admission.js';

/** Existing external API facade: Identity sees the credential; Chat never does. */
export class ExternalChatReadGateway {
 constructor(private readonly admissions:Pick<NativeExternalReadAdmissions,'admit'>,private readonly prepare:(request:OwnerCommandRequest)=>Promise<OwnerCommandRef>,private readonly execute:(request:OwnerCommandRequest)=>Promise<unknown>){}
 async read(credential:ReturnType<typeof parseAppToken>,kind:'conversations'|'messages',id:string|undefined,messageId:string|undefined,query:Record<string,unknown>){
  const detail=kind==='messages'?!!messageId:!!id;
  if(kind==='messages'&&!id||kind==='conversations'&&messageId||Object.keys(query).some(k=>detail||!['limit','cursor'].includes(k))||query.limit!==undefined&&typeof query.limit!=='string'&&typeof query.limit!=='number')throw new CommandError(400,'INVALID_REQUEST');
  const operation='external-conversations'+(id?'-id':'')+(kind==='messages'?'-messages'+(messageId?'-messageId':''):''),command=randomUUID();
  try{
   const request=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+operation,{schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:credential.tenant,operation,command_id:command,actor:{kind:'app',principal_id:credential.id,delegation_id:command},payload:{...(id?{id}:{}),...(messageId?{messageId}:{}),...(query.limit!==undefined?{limit:Number(query.limit)}:{}),...(query.cursor!==undefined?{cursor:query.cursor}:{})}});
   const ref=validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',await this.prepare(request));if(ref.command_id!==command)throw new CommandError(503,'TEMPORARILY_UNAVAILABLE');
   await this.admissions.admit(credential,ref);
   return await this.execute(request);
  }catch(error){if(error instanceof OwnerError||error instanceof OwnerDomainError)throw new CommandError(error.status,error.code);throw error;}
 }
}
