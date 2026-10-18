import {describe,it,expect} from 'vitest';
import {validateAppConfig} from '../identity/external-apps.js';
import {conversationExternalCatalog,ExternalConversations} from '../conversation/external-port.js';
import {externalOpenApi} from './openapi.js';
const parent={object:'conversation',scope:'conversations.read',properties:['status'],record_scope:'all',team_ids:[]};
const message={object:'conversation.messages',scope:'conversations.messages.read',properties:['text'],record_scope:'all',team_ids:[]};
const config=(grants:unknown[])=>({name:'Synthetic',description:'',status:'active',grants});
describe('external Conversation grant boundary',()=>{
  it('accepts metadata alone and explicit dependent content grants',()=>{expect(validateAppConfig(config([parent]),conversationExternalCatalog,[]).grants).toHaveLength(1);expect(validateAppConfig(config([parent,message]),conversationExternalCatalog,[]).grants).toHaveLength(2);});
  it('denies standalone content scope',()=>expect(()=>validateAppConfig(config([message]),conversationExternalCatalog,[])).toThrow('MISSING_PARENT_GRANT'));
  for(const field of ['text','latest_message','contact','provider_message_id','attachment','attribution'])it('metadata scope cannot authorize '+field,()=>expect(()=>validateAppConfig(config([{...parent,properties:[field]}]),conversationExternalCatalog,[])).toThrow());
  it('denies implicit rich content and provider fields',()=>{for(const field of ['attachment','provider_message_id','outbound_intent_id'])expect(()=>validateAppConfig(config([parent,{...message,properties:[field]}]),conversationExternalCatalog,[])).toThrow();});
  it('message fields can exclude text',()=>expect(validateAppConfig(config([parent,{...message,properties:['status']}]),conversationExternalCatalog,[]).grants[1]!.properties).toEqual(['status']));
  it('publishes read-only paths with two required scopes for message access',()=>{for(const p of ['/external/conversations/{id}/messages','/external/conversations/{id}/messages/{messageId}'] as const){expect(Object.keys(externalOpenApi.paths[p])).toEqual(['get']);expect(externalOpenApi.paths[p].get['x-required-scopes']).toEqual(['conversations.read','conversations.messages.read']);}});
  it('owner port rejects absent/mismatched tenant/service access before querying',async()=>{const port=new ExternalConversations('synthetic'),s:any={context:{tenantId:'t'},query:()=>{throw Error('unexpected SQL');}},a:any={tenantId:'foreign',capabilities:['read'],grants:[{resource:'conversation',action:'read',scope:'all'}]};for(const access of [[],[a],[{...a,tenantId:'t',superAdmin:true}]])await expect(port.read(s,access,'conversations',undefined,undefined,{},['status'],'p')).rejects.toMatchObject({status:403});});
});
