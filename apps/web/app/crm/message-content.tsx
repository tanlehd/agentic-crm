import React from 'react';
import type { ConversationMessageEnvelopeV3 } from '../../../../packages/contracts/src/generated/conversation-message-envelope-v3';
export function MessageContentView({message:m}:{message:ConversationMessageEnvelopeV3}) {
  if(m.text===undefined)return <p>Nội dung không nằm trong quyền đọc.</p>;
  if(m.schema_version!==3||m.platform!=='mock_messenger')return <p>{m.text??'Nội dung chưa được hỗ trợ.'}</p>;
  const attachment=m.attachment;
  return <div className="message-content">
    {m.reply_to&&<small className="message-reply">{m.reply_to.internal_message_id?'Trả lời một tin nhắn trong hội thoại':'Trả lời tin nhắn chưa có trong hội thoại'}</small>}
    {m.text!==null&&<p>{m.text}</p>}
    {m.message_type==='media'&&attachment?.kind==='media'?<ul aria-label="Tệp đính kèm">{attachment.items.map((item,i)=><li key={i}>{item.name??({image:'Hình ảnh',audio:'Âm thanh',video:'Video',file:'Tệp'}[item.media_type])} <small>— Chưa có bản xem trước</small></li>)}</ul>:
    m.message_type==='template'&&attachment?.kind==='gallery'?<div className="message-gallery" aria-label="Bộ sưu tập">{attachment.cards.map((card,i)=><article className="message-card" key={i}><strong>{card.title}</strong>{card.subtitle&&<p>{card.subtitle}</p>}{card.buttons.map((button,j)=><span className="crm-badge" key={j}>{button.label}</span>)}</article>)}</div>:
    m.message_type==='template'&&attachment?.kind==='csat'?<section className="message-card" aria-label="Khảo sát trong lịch sử"><strong>{attachment.title}</strong><p>{attachment.prompt}</p><small>Khảo sát trong lịch sử — không thể gửi đánh giá tại đây.</small></section>:
    m.message_type==='unsupported'&&attachment?.kind==='unsupported'?<p>{attachment.label}</p>:
    m.message_type!=='text'?<p>Nội dung chưa được hỗ trợ.</p>:null}
  </div>;
}
