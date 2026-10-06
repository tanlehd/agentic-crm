import { Ajv } from 'ajv';
import { messageContentSchema,type MessageContent } from '@agentic-crm/contracts';
import { CommandError } from '../../kernel/reliability/commands.js';
const validate=new Ajv({strict:true}).compile<MessageContent>(messageContentSchema);
export function messageContent(value:unknown):MessageContent {
  if(!validate(value)||Buffer.byteLength(JSON.stringify(value),'utf8')>65536)throw new CommandError(422,'MESSAGE_CONTENT_INVALID');
  return JSON.parse(JSON.stringify(value)) as MessageContent;
}
export function legacyContentText(content:MessageContent):string {
  if(content.message_type==='text')return content.text;
  if(content.text!==null)return content.text;
  let preview:string;
  if(content.message_type==='media')preview='[Media] '+content.attachment.items.map(item=>item.name??item.media_type).join(' | ');
  else if(content.message_type==='template')preview=content.attachment.kind==='gallery'?'[Gallery] '+content.attachment.cards.map(card=>[card.title,card.subtitle].filter(Boolean).join(' — ')).join(' | '):'[CSAT] '+content.attachment.title+': '+content.attachment.prompt;
  else preview='[Unsupported message] '+content.attachment.label;
  return preview.slice(0,4000);
}
