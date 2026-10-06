import type { MessageContent } from '@agentic-crm/contracts';
import { messageContent } from '../conversation/content.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { object } from '../crm/properties.js';
import { messageText } from '../conversation/domain.js';
export interface NormalizedInbound {
  provider_event_id:string;provider_message_id:string;external_subject_id:string;occurred_at:string;
  display_label?:string;message:{type:'text';text:string}|{type:'rich';content:MessageContent};referral?:{source:'ctm';ad_id?:string|null;campaign_id?:string|null};
}
function label(v:unknown):string{if(typeof v!=='string'||!v.trim()||v.length>255||/[\u0000-\u001f\u007f]/.test(v))throw new CommandError(422,'VALIDATION_FAILED');return v;}
export function normalized(input:unknown):NormalizedInbound{
  const b=object(input,['provider_event_id','provider_message_id','external_subject_id','occurred_at','display_label','message','referral']);
  const m=object(b.message,['type','text','content']);if(!['text','rich'].includes(String(m.type))||m.type==='text'&&m.content!==undefined||m.type==='rich'&&m.text!==undefined)throw new CommandError(422,'VALIDATION_FAILED');
  if(typeof b.occurred_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(b.occurred_at)||!Number.isFinite(Date.parse(b.occurred_at)))throw new CommandError(422,'VALIDATION_FAILED');
  const occurred=new Date(b.occurred_at).toISOString();if(occurred.slice(0,19)!==b.occurred_at.slice(0,19))throw new CommandError(422,'VALIDATION_FAILED');
  const result:NormalizedInbound={provider_event_id:label(b.provider_event_id),provider_message_id:label(b.provider_message_id),external_subject_id:label(b.external_subject_id),occurred_at:occurred,message:m.type==='rich'?{type:'rich',content:messageContent(m.content)}:{type:'text',text:messageText(m.text)}};
  if(b.display_label!==undefined)result.display_label=label(b.display_label);
  if(b.referral!==undefined){const r=object(b.referral,['source','ad_id','campaign_id']);if(r.source!=='ctm')throw new CommandError(422,'VALIDATION_FAILED');result.referral={source:'ctm'};for(const k of ['ad_id','campaign_id'] as const)if(r[k]!==undefined)result.referral[k]=r[k]===null?null:label(r[k]);}
  return result;
}
