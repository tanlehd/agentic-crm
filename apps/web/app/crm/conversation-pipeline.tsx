'use client';
import {useEffect,useState} from 'react';
import {conversationSystemStages,isTypedConversationPipeline,upgradeConversationPipeline,validConversationStageTypes,type ConversationPipelineDefinition,type ConversationStage,type ConversationStageType,type ObjectPlatformObject} from '@agentic-crm/contracts';
import {PipelineRuleDialog} from './pipeline-rule-dialog';
import {Button} from '../../components/ui/button';
import {useApi,useCommand,ErrorNotice,can,type Context} from './api';
import './conversation-pipeline.css';

type Requirements={fields?:string[];need?:boolean;milestones?:string[]};
type Stage=ConversationStage;
type Definition=ConversationPipelineDefinition;
type Process={version:string;current_version:string;definition:Definition};
type Property=Pick<ObjectPlatformObject['properties'][number],'key'|'label'>;
const colors=['#2563eb','#f59e0b','#7c3aed','#0d9488','#64748b'];
const keyPattern=/^[a-z][a-z0-9_]{0,63}$/;
const reserved=new Set(['won','lost','revenue','consent']);
const hasRules=(r?:Requirements)=>Boolean(r?.need||r?.fields?.length||r?.milestones?.length);
export function pipelineErrors(d:Definition):string[]{
 const errors:string[]=[];
 for(const [rows,max,label] of [[d.stages,20,'Giai đoạn'],[d.milestones,12,'Mốc bằng chứng']] as const){
  if(!rows.length||rows.length>max)errors.push(`${label}: cần từ 1 đến ${max} mục.`);
  if(rows.some(r=>!r.label.trim()||!keyPattern.test(r.key)||reserved.has(r.key)))errors.push(`${label}: nhập tên và mã hợp lệ; không dùng won, lost, revenue, consent.`);
  if(new Set(rows.map(r=>r.key)).size!==rows.length)errors.push(`${label}: mã không được trùng.`);
 }
 if(hasRules(d.stages[0]?.requirements))errors.push('Giai đoạn đầu không được có điều kiện đầu vào. Hãy bỏ ràng buộc trước khi chuyển lên đầu.');
 if(!validConversationStageTypes(d))errors.push('Cần đủ bốn giai đoạn hệ thống với đúng Type; Mới phải là giai đoạn đầu.');
 if(d.stages.some(s=>s.requirements?.milestones?.some(k=>!d.milestones.some(m=>m.key===k))))errors.push('Có ràng buộc tham chiếu mốc đã xóa. Hãy cập nhật ràng buộc trước khi lưu.');
 return errors;
}
export function ConversationPipeline({tenant,context,onDirty,properties}:{tenant:string;context:Context;onDirty:(v:boolean)=>void;properties?:Property[]}){
 const query=useApi(tenant,'/api/v1/session-process',can(context,'conversation','read'));
 const catalog=useApi(tenant,'/api/v1/crm/object-catalog',!properties&&can(context,'schema','read'));
 const available:Property[]=properties??catalog.data?.data.objects.find((o:ObjectPlatformObject)=>o.key==='conversation_session')?.properties.filter((p:{id:string})=>!p.id.startsWith('standard:'))??[];
 if(!can(context,'conversation','read'))return <p className="op-note">Cần quyền đọc Conversation để xem pipeline.</p>;
 if(query.isPending)return <p role="status">Đang tải pipeline…</p>;
 if(query.error||!query.data)return <ErrorNotice error={query.error} reload={()=>void query.refetch()}/>;
 return <PipelineEditor {...{tenant,onDirty}} properties={available} process={query.data.data} editable={context.capabilities.includes('configure')&&context.grants.some(g=>g.resource==='schema'&&g.action==='update'&&g.scope==='all')} reload={async()=>{const r=await query.refetch();return r.error?null:r.data?.data;}}/>;
}
function PipelineEditor({tenant,process,editable,properties,onDirty,reload}:{tenant:string;process:Process;editable:boolean;properties:Property[];onDirty:(v:boolean)=>void;reload:()=>Promise<Process|null>}){
 const [draft,setDraft]=useState<Definition>(()=>upgradeConversationPipeline(process.definition)),[version,setVersion]=useState(process.current_version),[dirty,setDirty]=useState(editable&&!isTypedConversationPipeline(process.definition)),[saved,setSaved]=useState(false),[section,setSection]=useState<'stages'|'automations'>('stages'),[selected,setSelected]=useState<number|null>(null),command=useCommand(tenant);
 useEffect(()=>onDirty(dirty),[dirty,onDirty]);
 const change=(d:Definition)=>{setDraft(d);setDirty(true);setSaved(false);onDirty(true);};
 const update=(index:number,patch:Partial<Stage>)=>change({...draft,stages:draft.stages.map((s,i)=>i===index?{...s,...patch}:s)});
 const errors=pipelineErrors(draft),stale=version!==process.current_version,stage=selected===null?null:draft.stages[selected];
 const reset=async()=>{if(dirty&&!confirm('Bỏ thay đổi pipeline chưa lưu và tải cấu hình mới?'))return;const fresh=await reload();if(fresh){const upgraded=editable&&!isTypedConversationPipeline(fresh.definition);setDraft(upgradeConversationPipeline(fresh.definition));setVersion(fresh.current_version);setDirty(upgraded);onDirty(upgraded);setSaved(false);setSelected(null);command.setError(null);}};
 const move=(i:number,delta:number)=>{const rows=[...draft.stages];[rows[i],rows[i+delta]]=[rows[i+delta]!,rows[i]!];change({...draft,stages:rows});setSelected(null);};
 const summary=(s:Stage)=>{const r=s.requirements;return hasRules(r)?[r?.fields?.length?`${r.fields.length} thuộc tính`:null,r?.need?'Có nhu cầu':null,r?.milestones?.length?`${r.milestones.length} mốc bằng chứng`:null].filter(Boolean).join(' · '):'Không có điều kiện đầu vào';};
 return <section className="pipeline" aria-label="Conversation Pipeline">
  <div className="pipeline-heading"><div><div className="pipeline-eyebrow">CONVERSATION / PIPELINE</div><h2>Quy trình hội thoại</h2><p>Sắp xếp giai đoạn và quy định thông tin cần có trước khi chuyển bước.</p></div><span className="pipeline-version">Phiên bản {version}</span></div>
  <div className="pipeline-notice">Cấu hình mới áp dụng cho lượt hội thoại mới. Lượt đang xử lý giữ nguyên phiên bản đã bắt đầu.</div>
  {!isTypedConversationPipeline(process.definition)&&!saved&&<p className="pipeline-notice">Bản nháp đã bổ sung các giai đoạn hệ thống và quy tắc tự động hóa. Công bố phiên bản mới để áp dụng.</p>}
  <div className="pipeline-toolbar"><div className="pipeline-subtabs" aria-label="Cấu hình pipeline"><button aria-pressed={section==='stages'} onClick={()=>setSection('stages')}>Giai đoạn <span>{draft.stages.length}</span></button><button aria-pressed={section==='automations'} onClick={()=>setSection('automations')}>Tự động hóa <span>2</span></button></div><span className="op-muted">{!editable?'Chỉ xem':dirty?'Có thay đổi chưa công bố':'Cấu hình đang áp dụng'}</span></div>
  <fieldset className="pipeline-fields" disabled={command.busy}>
  {section==='stages'?<><div className="pipeline-flow" aria-label="Thứ tự giai đoạn">{draft.stages.map((s,i)=><span key={i}><i style={{background:s.color??colors[i%colors.length]}}/>{s.label||'Giai đoạn mới'}{i<draft.stages.length-1&&<b>→</b>}</span>)}</div>
   <div className="pipeline-table-scroll"><table className="pipeline-table"><thead><tr><th>Thứ tự</th><th>Tên giai đoạn</th><th>Mô tả</th><th>Màu</th><th>Type</th><th>Conditional logic rules</th><th>Stage ID</th><th>Thao tác</th></tr></thead><tbody>{draft.stages.map((s,i)=><tr key={i} className={selected===i?'is-selected':''}><td><span className="pipeline-position">{String(i+1).padStart(2,'0')}</span></td><td><input disabled={!editable} aria-label={`Tên giai đoạn ${i+1}`} maxLength={120} value={s.label} onChange={e=>update(i,{label:e.target.value})}/>{conversationSystemStages.some(v=>v.key===s.key)&&<small>Hệ thống · Không thể xóa</small>}{i===0&&<small>Giai đoạn bắt đầu</small>}</td><td><input disabled={!editable} aria-label={`Mô tả giai đoạn ${i+1}`} placeholder="Thêm mô tả" maxLength={500} value={s.description??''} onChange={e=>update(i,{description:e.target.value})}/></td><td><input disabled={!editable} aria-label={`Màu giai đoạn ${i+1}`} type="color" value={s.color??colors[i%colors.length]} onChange={e=>update(i,{color:e.target.value})}/></td><td><select className="pipeline-stage-type" aria-label={`Type giai đoạn ${i+1}`} disabled={!editable||conversationSystemStages.some(v=>v.key===s.key)} value={s.type??'open'} onChange={e=>update(i,{type:e.target.value as ConversationStageType})}><option value="open">Open</option><option value="converted">Converted</option><option value="unqualified">Unqualified</option></select></td><td><div className="pipeline-condition-cell"><span className="pipeline-rule-summary">{hasRules(s.requirements)?summary(s):'—'}</span><button type="button" className="pipeline-rule-link" aria-label={`${editable?hasRules(s.requirements)?'Edit rule':'Add rule':'View rule'} · ${s.label}`} onClick={()=>setSelected(i)} aria-haspopup="dialog">{editable?hasRules(s.requirements)?'Edit rule':'Add rule':'View rule'}</button></div></td><td><input aria-label={`Mã giai đoạn ${i+1}`} disabled={!editable||conversationSystemStages.some(v=>v.key===s.key)} value={s.key} maxLength={64} onChange={e=>update(i,{key:e.target.value})}/></td><td><div className="pipeline-row-actions"><button title="Chuyển lên" aria-label={`Chuyển giai đoạn ${i+1} lên`} disabled={!editable||i<=1} onClick={()=>move(i,-1)}>↑</button><button title="Chuyển xuống" aria-label={`Chuyển giai đoạn ${i+1} xuống`} disabled={!editable||i===0||i===draft.stages.length-1} onClick={()=>move(i,1)}>↓</button><button aria-label={`Xóa giai đoạn ${i+1}`} disabled={!editable||conversationSystemStages.some(v=>v.key===s.key)} onClick={()=>{change({...draft,stages:draft.stages.filter((_,n)=>n!==i)});setSelected(null);}}>×</button></div></td></tr>)}</tbody></table></div>
   <Button variant="outline" disabled={!editable||draft.stages.length>=20} onClick={()=>{let n=draft.stages.length+1;while(draft.stages.some(s=>s.key===`stage_${n}`))n++;change({...draft,stages:[...draft.stages,{key:`stage_${n}`,label:'Giai đoạn mới',type:'open',color:colors[draft.stages.length%colors.length]}]});setSelected(draft.stages.length);}}>+ Thêm giai đoạn</Button>
  </>:<div className="pipeline-automations"><p>Quy tắc hệ thống chạy khi hội thoại chuyển giai đoạn thành công.</p>{([
   ['set_convert_time','Thiết lập convert time của Conversation là thời điểm hiện tại khi stage chuyển sang Converted'],
   ['clear_convert_time','Xóa convert time của Conversation khi stage chuyển sang Open hoặc Unqualified'],
  ] as const).map(([key,label])=><div className="pipeline-automation-row" key={key}><div><span className="pipeline-system-badge">Hệ thống</span><p id={'pipeline-rule-'+key}>{label}</p></div><button type="button" role="switch" aria-checked={draft.automations?.[key]??false} aria-labelledby={'pipeline-rule-'+key} disabled={!editable} onClick={()=>change({...draft,automations:{set_convert_time:draft.automations?.set_convert_time??false,clear_convert_time:draft.automations?.clear_convert_time??false,[key]:!draft.automations?.[key]}})}><span aria-hidden="true"/>{draft.automations?.[key]?'Bật':'Tắt'}</button></div>)}<p className="op-muted">Tắt rule sẽ giữ nguyên convert time hiện có. Các mốc bằng chứng vẫn được giữ cho điều kiện chuyển giai đoạn.</p></div>}
  </fieldset>
  {stage&&selected!==null&&<PipelineRuleDialog stage={stage} index={selected} stages={draft.stages} properties={properties} milestones={draft.milestones} editable={editable&&!command.busy} onDraftChange={value=>onDirty(dirty||value)} onSave={requirements=>update(selected,{requirements})} onClose={()=>setSelected(null)}/>}
  <p className="pipeline-footnote">Chuyển giai đoạn luôn cần lý do. Converted và Unqualified là type kết thúc của pipeline; không tự đóng kênh chat hoặc xác nhận kết quả Lead/Deal.</p>
  {errors.length>0&&<div className="crm-error" role="alert">{errors.map(e=><p key={e}>{e}</p>)}</div>}
  {stale&&<p className="crm-error" role="alert">Pipeline đã có phiên bản mới. Bản nhập của bạn vẫn được giữ; tải cấu hình mới trước khi chỉnh sửa tiếp.</p>}
  <ErrorNotice error={command.error}/>
  <div className="pipeline-footer"><span role="status">{saved?'Đã công bố pipeline.':dirty?'Bản nháp chưa được áp dụng.':`Đang xem phiên bản ${version}`}</span><div className="crm-actions"><Button variant="outline" disabled={command.busy} onClick={()=>void reset()}>{stale?'Tải cấu hình mới':'Bỏ thay đổi / tải lại'}</Button>{editable&&<Button disabled={command.busy||!dirty||stale||errors.length>0} onClick={async()=>{const r=await command.run('/api/v1/session-process',draft,'POST',version);if(r){setDraft(structuredClone(r.data.definition));setVersion(r.data.current_version);setDirty(false);onDirty(false);setSaved(true);}}}>{command.busy?'Đang công bố…':'Công bố phiên bản mới'}</Button>}</div></div>
 </section>;
}
