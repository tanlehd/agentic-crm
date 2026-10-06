import type { ContactMapping } from '../crm/contact-identity.js';
// Hints only. Authorization and Contact lifecycle checks remain authoritative.
export class ChatContactCache {
 private readonly entries=new Map<string,{mapping:ContactMapping;expires:number}>();
 constructor(private readonly now=Date.now,private readonly ttl=300000){}
 key(tenant:string,connection:string,subject:string){return JSON.stringify([tenant,connection,subject]);}
 get(key:string){const hit=this.entries.get(key);if(!hit)return null;if(hit.expires<=this.now()){this.entries.delete(key);return null;}return {...hit.mapping};}
 put(key:string,mapping:ContactMapping){if(this.entries.size>=1000)this.entries.delete(this.entries.keys().next().value!);this.entries.set(key,{mapping:{...mapping},expires:this.now()+this.ttl});}
 clear(){this.entries.clear();}
}
