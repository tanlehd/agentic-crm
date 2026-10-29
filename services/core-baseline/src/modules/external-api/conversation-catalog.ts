import type {ExternalObject} from '../crm/external-port.js';

const property=(key:string,type='string',sensitive=false)=>({key,label:key,type,sensitive});
export const conversationExternalCatalog:ExternalObject[]=[
  {key:'conversation',label:'Conversation',scope:'conversations.read',properties:[property('status'),property('opened_at','datetime'),property('closed_at','datetime'),property('contact_id','reference'),property('team_id','reference'),property('owner_principal_id','reference')]},
  {key:'conversation.messages',label:'Conversation messages',scope:'conversations.messages.read',properties:[property('direction'),property('status'),property('occurred_at','datetime'),property('received_at','datetime'),property('text','string',true)]},
];
export type ConversationReadKind='conversations'|'messages';
