import { DeliveryError,type Consumer } from '../../kernel/reliability/delivery.js';
import { uuid } from '../identity/admin.js';
// Polling reads the committed marker directly. This versioned notification
// subscriber validates/acknowledges the durable event; it never reapplies it.
export const workspaceReadConsumer:Consumer={name:'chat.read-marker.v1',type:'chat.read_marker.updated',async handle(scope,event){
  const d=event.data;
  if(event.tenant_id!==scope.context.tenantId||event.aggregate_type!=='conversation_read_state'||!uuid(event.aggregate_id)||!uuid(d.conversation_id)||!uuid(d.principal_id)||event.actor.kind!=='human'||event.actor.id!==d.principal_id||typeof d.through_inbound_seq!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(d.through_inbound_seq)||typeof d.read_state_revision!=='string'||!/^[1-9][0-9]{0,19}$/.test(d.read_state_revision)||event.aggregate_version!==d.read_state_revision||Object.keys(d).some(k=>!['conversation_id','principal_id','through_inbound_seq','read_state_revision'].includes(k)))throw new DeliveryError('INVALID_EVENT');
}};

const catalogNotifications=[
  ['chat.inbox.changed','chat_inbox','inbox_id',['created','updated','shared','archived','transferred']],
  ['chat.snippet.changed','chat_snippet','snippet_id',['created','updated','archived']],
  ['chat.tag_definition.changed','conversation_tag','tag_id',['created','updated','archived']],
] as const;
export const workspaceCatalogConsumers:Consumer[]=catalogNotifications.map(([type,aggregate,key,operations])=>({name:type+'.v1',type,async handle(s,e){
  if(e.tenant_id!==s.context.tenantId||e.aggregate_type!==aggregate||!uuid(e.aggregate_id)||e.data[key]!==e.aggregate_id||e.actor.kind!=='human'||!uuid(e.actor.id)||!operations.some(op=>op===e.data.operation)||Object.keys(e.data).some(k=>![key,'operation'].includes(k)))throw new DeliveryError('INVALID_EVENT');
}}));
workspaceCatalogConsumers.push({name:'chat.conversation-tag.v1',type:'chat.conversation_tag.changed',async handle(s,e){
  if(e.tenant_id!==s.context.tenantId||e.aggregate_type!=='conversation'||e.data.conversation_id!==e.aggregate_id||!uuid(e.aggregate_id)||!uuid(e.data.tag_id)||!['attached','detached'].includes(String(e.data.operation))||e.actor.kind!=='human'||!uuid(e.actor.id)||typeof e.data.tag_set_revision!=='string'||!/^[1-9][0-9]{0,19}$/.test(e.data.tag_set_revision)||Object.keys(e.data).some(k=>!['conversation_id','tag_id','operation','tag_set_revision'].includes(k)))throw new DeliveryError('INVALID_EVENT');
}});
