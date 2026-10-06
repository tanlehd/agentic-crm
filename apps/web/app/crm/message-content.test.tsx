import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect } from 'vitest';
import { MessageContentView } from './message-content';
import type { ConversationMessageEnvelopeV3 } from '../../../../packages/contracts/src/generated/conversation-message-envelope-v3';
const base:ConversationMessageEnvelopeV3={id:'synthetic',conversation_id:'synthetic',connection_id:'synthetic',schema_version:3,platform:'mock_messenger',message_type:'text',text:'[Preview]',text_source:'preview',external_msg_id:null,outbound_intent_id:null,direction:'inbound',status:'received',occurred_at:'2026-10-06T00:00:00Z',received_at:'2026-10-06T00:00:00Z'};
const render=(fields:Partial<ConversationMessageEnvelopeV3>)=>renderToStaticMarkup(<MessageContentView message={{...base,...fields}}/>);
describe('SRC-027 passive rich renderer',()=>{
  it('escapes text and gallery labels without actions or external resources',()=>{
    const html=render({message_type:'template',attachment:{version:1,kind:'gallery',cards:[{title:'<script>alert(1)</script>',subtitle:'Synthetic',buttons:[{label:'<img src=x>'}]}]}});
    expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img');expect(html).not.toMatch(/<(script|img|button|a)\b/);
  });
  it('renders media metadata, historical CSAT and unresolved reply without URLs',()=>{
    const media=render({message_type:'media',reply_to:{external_msg_id:'external',internal_message_id:null},attachment:{version:1,kind:'media',items:[{media_type:'image',external_media_id:'https://untrusted.invalid/image',name:'Synthetic.png'}]}});
    expect(media).toContain('Synthetic.png');expect(media).toContain('chưa có trong hội thoại');expect(media).not.toContain('https://');expect(media).not.toContain('<img');
    const csat=render({message_type:'template',attachment:{version:1,kind:'csat',title:'Synthetic',prompt:'Đánh giá'}});expect(csat).toContain('không thể gửi đánh giá');expect(csat).not.toContain('<input');
  });
  it('hides all content on field denial, falls back for unsupported content',()=>{
    expect(render({text:undefined,attachment:{version:1,kind:'unsupported',label:'Private'}})).not.toContain('Private');
    expect(render({message_type:'unsupported',attachment:{version:1,kind:'unsupported',label:'Chưa hỗ trợ'}})).toContain('Chưa hỗ trợ');
  });
});

// Render the actual component for a separate browser layout/security smoke check.
mkdirSync('artifacts/verify',{recursive:true});
writeFileSync('artifacts/verify/rich-renderer.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rich message renderer — synthetic fixtures</title><style>'+readFileSync('apps/web/app/style.css','utf8').replace(/@import[^;]+;/g,'')+'</style><body><main style="max-width:720px;margin:24px auto;padding:16px"><h1>Hội thoại mẫu</h1>'+[
  render({text:'Tin nhắn gốc của khách'}),
  render({text:'[Media] Tài liệu mẫu',message_type:'media',attachment:{version:1,kind:'media',items:[{media_type:'image',external_media_id:'synthetic',name:'Hình ảnh mẫu'},{media_type:'file',external_media_id:'synthetic2',name:'Tài liệu mẫu'}]},reply_to:{external_msg_id:'synthetic',internal_message_id:null}}),
  render({text:'[Gallery] Gói dịch vụ mẫu',message_type:'template',attachment:{version:1,kind:'gallery',cards:[{title:'Gói dịch vụ A',subtitle:'Nội dung mẫu để kiểm thử giao diện',buttons:[{label:'Xem thông tin'}]},{title:'Gói dịch vụ B',subtitle:'Nội dung mẫu thứ hai',buttons:[]}]}}),
  render({text:'[CSAT] Khảo sát mẫu',message_type:'template',attachment:{version:1,kind:'csat',title:'Khảo sát mẫu',prompt:'Bạn đánh giá trải nghiệm như thế nào?'}}),
  render({text:undefined}),
].join('<hr>')+'</main></body></html>');
