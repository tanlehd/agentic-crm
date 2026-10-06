import { uuid } from './validation.js';
export interface ContactMapping {tenant_id:string;connection_id:string;external_subject_id:string;crm_contact_id:string;crm_identity_id:string;mapping_revision:'1'}
export function checkedMapping(value:unknown,tenant:string,connection:string,subject:string):ContactMapping {
 const m=value as ContactMapping|null;
 if(!m||m.tenant_id!==tenant||m.connection_id!==connection||m.external_subject_id!==subject||!uuid(m.crm_contact_id)||!uuid(m.crm_identity_id)||m.mapping_revision!=='1')throw new Error('INVALID_CONTACT_MAPPING');
 return {tenant_id:tenant,connection_id:connection,external_subject_id:subject,crm_contact_id:m.crm_contact_id,crm_identity_id:m.crm_identity_id,mapping_revision:'1'};
}
export class ConnectorContactCache {
 private entries=new Map<string,{mapping:ContactMapping;expires:number}>();
 constructor(private readonly now=Date.now,private readonly ttl=300000){}
 key(tenant:string,connection:string,subject:string){return JSON.stringify([tenant,connection,subject]);}
 get(key:string){const item=this.entries.get(key);if(!item)return null;if(item.expires<=this.now()){this.entries.delete(key);return null;}return {...item.mapping};}
 put(key:string,mapping:ContactMapping){if(this.entries.size>=1000)this.entries.delete(this.entries.keys().next().value!);this.entries.set(key,{mapping:{...mapping},expires:this.now()+this.ttl});}
 clear(){this.entries.clear();}
}
