import {CommandError} from '../../kernel/reliability/commands.js';
import {ExternalApps,parseAppToken} from '../identity/external-apps.js';
import type {CrmRecords} from '../crm/records.js';
import type {Access} from '../identity/domain/authorization.js';
import {AccessError} from '../identity/authorization.js';
import type {ExternalConversations,ConversationReadKind} from '../conversation/external-port.js';
import type {AppGrant} from '../identity/external-apps.js';

export class ExternalData {
  constructor(readonly apps:ExternalApps,readonly records:CrmRecords,readonly conversations?:ExternalConversations){}
  async readConversation(header:unknown,tenantHeader:unknown,kind:ConversationReadKind,id:string|undefined,messageId:string|undefined,query:Record<string,unknown>){
    const credential=parseAppToken(header);
    if(tenantHeader!==undefined&&tenantHeader!==credential.tenant)throw new CommandError(401,'INVALID_TOKEN');
    await this.apps.admit(credential);
    return this.apps.uow.run({tenantId:credential.tenant},async s=>{
      const app=await this.apps.verify(s,credential),grants:AppGrant[]=typeof app.grants==='string'?JSON.parse(app.grants):app.grants;
      const parent=grants.find(g=>g.object==='conversation'&&g.scope==='conversations.read'),message=grants.find(g=>g.object==='conversation.messages'&&g.scope==='conversations.messages.read');
      if(!parent||kind==='messages'&&!message)throw new CommandError(403,'MISSING_SCOPE');
      const active=(await s.query('SELECT id FROM team WHERE tenant_id=? AND active=1',[credential.tenant])).map((t:any)=>t.id);
      const access=(g:AppGrant):Access=>({tenantId:credential.tenant,principalId:credential.id,revision:String(app.version),capabilities:['read'],grants:[{resource:'conversation',action:'read',scope:g.record_scope==='all'?'all':'team'}],teamIds:g.team_ids.filter(t=>active.includes(t)),fieldDenies:[]});
      if(!this.conversations)throw new CommandError(503,'TEMPORARILY_UNAVAILABLE');
      return this.conversations.read(s,kind==='messages'?[access(parent),access(message!)]:[access(parent)],kind,id,messageId,query,(kind==='messages'?message!:parent).properties,`${credential.id}:${app.version}`);
    });
  }
  async read(header:unknown,tenantHeader:unknown,kind:'scopes'|'properties'|'records',object:string|undefined,id:string|undefined,query:Record<string,unknown>){
    const credential=parseAppToken(header);
    if(tenantHeader!==undefined&&tenantHeader!==credential.tenant)throw new CommandError(401,'INVALID_TOKEN');
    if(Object.keys(query).some(k=>kind!=='records'||id||!['limit','cursor'].includes(k)))throw new CommandError(400,'INVALID_REQUEST');
    await this.apps.admit(credential);
    return this.apps.uow.run({tenantId:credential.tenant},async s=>{
      const app=await this.apps.verify(s,credential),grants=typeof app.grants==='string'?JSON.parse(app.grants):app.grants;
      if(kind==='scopes')return {data:grants};
      const grant=grants.find((g:any)=>g.object===object&&g.scope===`crm.objects.${object}.read`);
      if(!grant)throw new CommandError(403,'MISSING_SCOPE');
      const definition=(await this.apps.catalog(s)).find(x=>x.key===object);
      if(!definition)throw new CommandError(404,'NOT_FOUND');
      const fields=definition.properties.filter(p=>grant.properties.includes(p.key));
      if(kind==='properties')return {data:fields};
      const teams=grant.record_scope==='teams'?(await s.query('SELECT id FROM team WHERE tenant_id=? AND active=1',[credential.tenant])).map((t:any)=>t.id).filter((t:string)=>grant.team_ids.includes(t)):[];
      const access:Access={tenantId:credential.tenant,principalId:credential.id,revision:String(app.version),capabilities:['read'],grants:[{resource:object!,action:'read',scope:grant.record_scope==='all'?'all':'team'}],teamIds:teams,fieldDenies:definition.properties.filter(p=>!grant.properties.includes(p.key)).map(p=>({resource:object!,field:p.key,actions:['read','write','filter','export']}))};
      try{
        const result=await this.records.readForService(s,access,object!,id,query,`${credential.id}:${app.version}`);
        const shape=(r:any)=>({id:r.id,object_key:r.object_key,version:r.version,properties:Object.fromEntries(Object.entries({...r.fields,...r.custom_values}).filter(([key])=>fields.some(p=>p.key===key)))});
        return {...result,data:Array.isArray(result.data)?result.data.map(shape):shape(result.data)};
      }catch(e){if(e instanceof AccessError||e instanceof CommandError&&e.status===403)throw new CommandError(id?404:403,id?'NOT_FOUND':'FORBIDDEN');throw e;}
    });
  }
}
