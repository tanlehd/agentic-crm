'use client';
import {useState} from 'react';
import {can,type Context} from './api';
import {Administration} from './administration';
import {ObjectProperties} from './object-properties';
import {FacebookSettings} from './facebook-settings';
import {HumanRoutingWorkspace} from './human-routing';
import {TenantApps} from '../developer/private-apps';
import {InboxViews,type InboxFilter} from './inbox-views';
import {Icon} from './ui-icon';
import '../developer/portal.css';
import './settings-workspace.css';

const accountAccess=(c:Context)=>['membership','team','role','agent'].some(r=>can(c,r,'read'));
const chatAccess=(c:Context)=>c.capabilities.includes('configure')&&c.capabilities.includes('chat')&&can(c,'conversation','read');
const schemaAccess=(c:Context)=>can(c,'schema','read');
export const settingsItems=[
 {id:'users',label:'User & Team',group:'Account Management',icon:'team',description:'Tài khoản agent, nhóm làm việc và phân quyền truy cập.',allowed:accountAccess},
 {id:'integrations',label:'Integration',group:'Account Management',icon:'flow',description:'Quản lý private apps, API tokens và các tích hợp với CRM.',allowed:(c:Context)=>c.capabilities.includes('configure')},
 {id:'objects',label:'Objects',group:'Data Management',icon:'contact',description:'Thiết lập các đối tượng và cách tổ chức dữ liệu CRM.',allowed:schemaAccess},
 {id:'fields',label:'Fields',group:'Data Management',icon:'filter',description:'Quản lý các trường dữ liệu của từng đối tượng.',allowed:schemaAccess},
 {id:'custom-objects',label:'Custom Objects',group:'Data Management',icon:'plus',description:'Tạo và cấu hình đối tượng riêng cho nghiệp vụ của bạn.',allowed:schemaAccess},
 {id:'data-model',label:'Data Model Builder',group:'Data Management',icon:'flow',description:'ERD · Khám phá cấu trúc dữ liệu và quan hệ giữa các đối tượng.',allowed:schemaAccess},
 {id:'channels',label:'Channels',group:'Tools',icon:'inbox',description:'Quản lý các kênh kết nối với khách hàng.',allowed:(c:Context)=>can(c,'integration','read')},
 {id:'inbox-center',label:'Inbox Center',group:'Tools',icon:'inbox',description:'Thiết lập không gian làm việc Agent Chat cho đội ngũ của bạn.',allowed:chatAccess},
 {id:'inbox-queues',label:'Inbox Queue Customization',group:'Tools',icon:'filter',description:'Danh sách hội thoại mặc định và các hộp thư tùy chỉnh.',allowed:chatAccess,nested:true},
 {id:'conversation-context',label:'Conversation Sidebar Context',group:'Tools',icon:'contact',description:'Bố cục thông tin chi tiết của hội thoại và view theo team.',allowed:chatAccess,nested:true},
 {id:'routing',label:'Conversation Routing',group:'Tools',icon:'team',description:'Thiết lập phân bổ hội thoại, năng lực và hàng chờ của đội ngũ.',allowed:(c:Context)=>can(c,'routing','read')},
];

export function SettingsWorkspace({tenant,context,section,onNavigate,onBack,onDirty,onOpen,onConversation}:{tenant:string;context:Context;section:string;onNavigate:(section:string)=>void;onBack:()=>void;onDirty:(value:boolean)=>void;onOpen:(key:string)=>void;onConversation:(id:string)=>void}){
 const items=settingsItems.filter(i=>i.allowed(context)),current=items.find(i=>i.id===section);
 const [mobileMenu,setMobileMenu]=useState(false);
 const select=(id:string)=>{onNavigate(id);setMobileMenu(false);};
 return <div className="settings-workspace">
  <aside className={'settings-sidebar'+(mobileMenu?' is-open':'')} aria-label="Settings navigation">
   <button className="settings-back" onClick={onBack}><Icon name="back"/>Quay lại workspace</button>
   <div className="settings-brand"><span><Icon name="settings"/></span><h1>Settings</h1></div>
   <nav aria-label="Settings">{['Account Management','Data Management','Tools'].map(group=>{const rows=items.filter(i=>i.group===group);return rows.length>0&&<section className="settings-nav-group" key={group}><h2>{group}</h2>{rows.map(i=><button className={'settings-nav-item'+('nested' in i?' is-nested':'')} key={i.id} aria-current={section===i.id?'page':undefined} onClick={()=>select(i.id)}><Icon name={i.icon}/><span>{i.label}</span></button>)}</section>;})}</nav>
   <p className="settings-sidebar-note">Cấu hình cho tổ chức hiện tại</p>
  </aside>
  <section className="settings-content" aria-label="Settings content">
   <button className="settings-mobile-toggle" aria-expanded={mobileMenu} onClick={()=>setMobileMenu(v=>!v)}><Icon name="menu"/>Danh mục Settings</button>
   {current?<><header className="settings-heading"><div className="settings-breadcrumb">Settings <span>/</span> {current.group}{'nested' in current&&<> <span>/</span> Inbox Center</>}</div><h1>{current.label}</h1><p>{current.description}</p></header>
    <div className="settings-surface" key={tenant+':'+section} onChangeCapture={e=>{if((e.target as HTMLElement).closest('form'))onDirty(true);}}>
     {section==='users'&&<Administration tenant={tenant} context={context} onDirty={onDirty}/>}
     {section==='integrations'&&<><div className="settings-section-title"><div><h2>Private apps & API tokens</h2><p>Cấp quyền theo ứng dụng. Chỉ tenant super admin được quản lý private apps.</p></div><a className="settings-doc-link" href="/developer" target="_blank" rel="noreferrer">Developer API ↗</a></div><TenantApps tenant={tenant} onDirty={onDirty}/></>}
     {['objects','fields','custom-objects','data-model'].includes(section)&&<ObjectProperties embedded view={section as 'objects'|'fields'|'custom-objects'|'data-model'} tenant={tenant} context={context} onDirty={onDirty} onOpen={onOpen}/>}
     {section==='channels'&&<><div className="settings-providers"><div><strong>Facebook Messenger</strong><span>Cấu hình bên dưới</span></div><div><strong>WhatsApp</strong><span>Chưa khả dụng</span></div><div><strong>Các kênh khác</strong><span>Sẽ bổ sung</span></div></div><FacebookSettings tenant={tenant} context={context}/></>}
     {section==='inbox-center'&&<InboxCenter onNavigate={select}/>}
     {section==='inbox-queues'&&<QueueSettings tenant={tenant} context={context}/>}
     {section==='conversation-context'&&<ConversationContext/>}
     {section==='routing'&&<HumanRoutingWorkspace tenant={tenant} context={context} open={onConversation}/>}
    </div></>:<div className="settings-empty"><Icon name="lock"/><h1>Không có quyền truy cập mục Settings này</h1><p>Chọn một mục được phép trong danh mục hoặc liên hệ quản trị viên.</p><button onClick={onBack}>Quay lại workspace</button></div>}
  </section>
 </div>;
}

function InboxCenter({onNavigate}:{onNavigate:(section:string)=>void}){
 return <><div className="settings-callout"><Icon name="inbox"/><div><h2>Một không gian làm việc rõ ràng cho mỗi team</h2><p>Tổ chức danh sách hội thoại và thông tin agent cần thấy khi hỗ trợ khách hàng.</p></div></div><div className="settings-cards">
  <button className="settings-card" onClick={()=>onNavigate('inbox-queues')}><span className="settings-card-icon"><Icon name="filter"/></span><h2>Inbox Queue Customization</h2><p>Danh sách mặc định, bộ lọc và các hộp thư tùy chỉnh cho đội ngũ.</p><span className="settings-card-link">Quản lý danh sách <span>→</span></span></button>
  <button className="settings-card" onClick={()=>onNavigate('conversation-context')}><span className="settings-card-icon"><Icon name="contact"/></span><h2>Conversation Sidebar Context</h2><p>Sắp xếp thông tin chi tiết hội thoại và thiết lập view theo team.</p><span className="settings-card-link">Thiết lập sidebar <span>→</span></span></button>
 </div><div className="settings-rule"><Icon name="team"/><p>Mỗi team tối đa <strong>1 conversation view</strong>. Team chưa có view riêng sẽ dùng Default view.</p></div></>;
}

function QueueSettings({tenant,context}:{tenant:string;context:Context}){
 const [selected,setSelected]=useState<string|null>(null);
 const predicate:InboxFilter={scope:'all',status:['open','pending'],snooze:'exclude',unread:'any'};
 return <div className="settings-two-columns"><section className="settings-panel"><div className="settings-panel-heading"><h2>Default queues</h2><span className="settings-tag">Mặc định</span></div><p>Các danh sách sẵn có trong Agent Chat workspace.</p><ul className="settings-queue-list">{[['Tất cả hội thoại','Hội thoại trong phạm vi được cấp quyền'],['Của tôi','Hội thoại được giao cho bạn'],['Chưa phân công','Hội thoại chưa có người phụ trách'],['Theo team','Hội thoại trong nhóm được phép']].map(([name,description])=><li key={name}><Icon name="inbox"/><div><strong>{name}</strong><small>{description}</small></div><Icon name="lock"/></li>)}</ul><p className="settings-preview-note">Khung bố cục · Chỉnh sửa và sắp xếp danh sách mặc định sẽ được bổ sung sau.</p></section><section className="settings-panel"><h2>Custom queues</h2><p>Tạo bộ lọc và chia sẻ hộp thư bằng quyền hiện có. Chia sẻ không mở rộng quyền đọc hội thoại.</p><InboxViews tenant={tenant} enabled={context.capabilities.includes('chat')&&can(context,'conversation','read')} active selected={selected} current={{name:'',predicate,sort:'latest_message_desc'}} counts={[]} onSelect={inbox=>setSelected(inbox.id)} onArchive={id=>{if(selected===id)setSelected(null);}}/></section></div>;
}

function ConversationContext(){
 const [tab,setTab]=useState('default');
 return <><div className="settings-preview-note"><strong>Bản xem trước bố cục</strong> · Chưa áp dụng vào Agent Chat. Chỉnh sửa layout và gán view cho team sẽ được bổ sung ở bước tiếp theo.</div><div className="settings-local-tabs" aria-label="Conversation views"><button aria-pressed={tab==='default'} onClick={()=>setTab('default')}>Default view</button><button aria-pressed={tab==='teams'} onClick={()=>setTab('teams')}>Team views</button></div>
 {tab==='default'?<div className="settings-context-layout"><section className="settings-panel"><div className="settings-panel-heading"><h2>Default view</h2><span className="settings-tag">Bố cục mẫu</span></div><p>Thông tin tổng quan dành cho team chưa có view riêng.</p><ol className="settings-context-sections">{['Thông tin liên hệ','Chi tiết hội thoại','Phiên xử lý hiện tại','Hồ sơ liên quan'].map((label,i)=><li key={label}><span>{String(i+1).padStart(2,'0')}</span><strong>{label}</strong><Icon name="menu"/></li>)}</ol><p className="settings-preview-note">Quyền xem dữ liệu vẫn tuân theo quyền của từng agent.</p></section><section className="settings-context-preview" aria-label="Conversation sidebar preview"><div className="settings-preview-heading">CONVERSATION SIDEBAR <span>Preview</span></div><div className="settings-preview-profile"><span className="ui-avatar"><Icon name="user"/></span><strong>Thông tin liên hệ</strong><small>Tên · Email · Số điện thoại</small></div>{[['Chi tiết hội thoại','Kênh kết nối','Agent phụ trách','Team'],['Phiên xử lý hiện tại','Trạng thái','Thời điểm mở phiên'],['Hồ sơ liên quan','Contact · Lead · Deal']].map(([title,...fields])=><section key={title}><h3>{title}</h3>{fields.map(f=><div className="settings-preview-field" key={f}><span>{f}</span><i/></div>)}</section>)}</section></div>:<section className="settings-panel settings-team-placeholder"><Icon name="team"/><h2>Conversation views theo team</h2><p>Mỗi team được gán tối đa <strong>1 conversation view</strong>.</p><p>Team chưa được gán dùng Default view. Việc gán view không cấp thêm quyền truy cập dữ liệu.</p><span className="settings-tag">Bố cục mẫu · Chưa có cấu hình team được lưu</span></section>}
 </>;
}
