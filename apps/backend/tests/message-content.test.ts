import { describe,it,expect } from 'vitest';
import { messageContent,legacyContentText } from '../src/modules/conversation/content.js';
import { normalized } from '../src/modules/channels/normalized.js';
const text={version:1,message_type:'text',text:'Synthetic',reply_to:{external_msg_id:'opaque'},attachment:null};
const gallery={version:1,message_type:'template',text:null,reply_to:null,attachment:{version:1,kind:'gallery',cards:[{title:'Synthetic',subtitle:null,buttons:[{label:'View'}]}]}};
describe('SRC-027 normalized content validation',()=>{
  it('accepts text/reply and gallery with exact legacy fallback',()=>{expect(messageContent(text)).toEqual(text);expect(legacyContentText(messageContent(gallery))).toBe('[Gallery] Synthetic');});
  it('rejects unknown versions, unsafe payload shapes, oversized content and type mismatch',()=>{
    for(const invalid of [{...gallery,text_source:'extracted'},{...text,version:2},{...text,secret:'bad'},{...text,text:null},{...text,reply_to:{external_msg_id:'opaque',internal_message_id:'spoof'}},{...gallery,attachment:{...gallery.attachment,cards:[{title:'Synthetic',subtitle:null,buttons:[{label:'View',url:'javascript:alert(1)'}]}]}},{...text,text:'x'.repeat(4001)},{...gallery,attachment:{...gallery.attachment,cards:Array(11).fill(gallery.attachment.cards[0])}}])expect(()=>messageContent(invalid)).toThrow('MESSAGE_CONTENT_INVALID');
  });
  it('requires explicit rich discriminator and never accepts platform spoofing',()=>{
    const base={provider_event_id:'synthetic',provider_message_id:'synthetic',external_subject_id:'synthetic',occurred_at:'2026-10-06T01:00:00Z'};
    expect(normalized({...base,message:{type:'rich',content:gallery}}).message).toEqual({type:'rich',content:gallery});
    for(const message of [{type:'text',text:'Synthetic',content:gallery},{type:'rich',text:'Synthetic',content:gallery},{type:'rich',content:{...gallery,platform:'messenger'}}])expect(()=>normalized({...base,message})).toThrow();
  });
});
