'use client';
import {useState} from 'react';
import {Dialog} from './dialog';
import {Button} from '../../components/ui/button';
import './pipeline-rule-dialog.css';

export type PipelineRequirements={fields?:string[];need?:boolean;milestones?:string[]};
type Entry={key:string;label:string};
export function PipelineRuleDialog({stage,index,stages,properties,milestones,editable,onSave,onClose,onDraftChange}:{stage:Entry&{requirements?:PipelineRequirements};index:number;stages:Entry[];properties:Entry[];milestones:Entry[];editable:boolean;onSave:(r:PipelineRequirements)=>void;onClose:()=>void;onDraftChange:(dirty:boolean)=>void}){
 const [draft,setDraft]=useState<PipelineRequirements>(()=>structuredClone(stage.requirements??{})),[preview,setPreview]=useState(stage.key);
 const dirty=JSON.stringify(draft)!==JSON.stringify(stage.requirements??{}),fields=draft.fields??[],active=preview===stage.key,canConfigure=editable&&index!==0;
 const update=(next:PipelineRequirements)=>{setDraft(next);onDraftChange(JSON.stringify(next)!==JSON.stringify(stage.requirements??{}));};
 const close=()=>{if(dirty&&!confirm('Bỏ thay đổi rule chưa lưu?'))return;onDraftChange(false);onClose();};
 const options=[...properties,...fields.filter(key=>key&&!properties.some(p=>p.key===key)).map(key=>({key,label:`${key} (không có trong danh mục)`}))];
 const invalid=fields.some(k=>!k)||new Set(fields).size!==fields.length||index===0&&(fields.length>0||draft.need||(draft.milestones?.length??0)>0);
 const save=()=>{if(!invalid){onSave(draft);onClose();}};
 const toggle=(key:string,checked:boolean)=>update({...draft,milestones:checked?[...(draft.milestones??[]),key]:(draft.milestones??[]).filter(k=>k!==key)});
 const configured=fields.length>0||draft.need||(draft.milestones?.length??0)>0;
 return <Dialog wide title="Edit conditional logic" onClose={close} actions={<div className="pipeline-logic-actions">{editable&&<Button disabled={!dirty||Boolean(invalid)} onClick={save}>Save rule</Button>}</div>}>
  <div className="pipeline-logic-editor">
   <section className="pipeline-logic-config">
    <p className="pipeline-logic-object">Conversation <span>/</span> {stage.label}</p>
    <p>Thiết lập thông tin và bằng chứng cần có khi hội thoại chuyển vào giai đoạn này.</p>
    <h3>Set conditions</h3><p className="pipeline-logic-help">Rule áp dụng khi điều kiện giai đoạn bên dưới đúng.</p>
    <div className="pipeline-condition-group"><div className="pipeline-condition-title">Group 1</div><div className="pipeline-condition"><strong>Lifecycle Stage</strong><span>is equal to:</span><b>“{stage.label}”</b></div></div>
    {index===0&&<p className="pipeline-logic-notice">Giai đoạn đầu tiếp nhận hội thoại mới, chưa yêu cầu thông tin hoặc bằng chứng.</p>}
    <div className="pipeline-logic-section"><h3>Required properties <span>({fields.length})</span></h3><p className="pipeline-logic-help">Chọn các thuộc tính phải có giá trị trước khi chuyển giai đoạn.</p></div>
    <fieldset disabled={!canConfigure}>
     {fields.map((key,i)=><div className="pipeline-property-rule" key={i}><div className="pipeline-property-title"><strong>{options.find(p=>p.key===key)?.label??'Chọn thuộc tính'}</strong><button type="button" aria-label={`Xóa thuộc tính rule ${i+1}`} onClick={()=>update({...draft,fields:fields.filter((_,n)=>n!==i)})}>×</button></div><div className="pipeline-property-body"><label><span>Property *</span><select aria-label={`Thuộc tính rule ${i+1}`} value={key} onChange={e=>update({...draft,fields:fields.map((v,n)=>i===n?e.target.value:v)})}><option value="">Chọn thuộc tính…</option>{options.filter(p=>p.key===key||!fields.includes(p.key)).map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></label><div className="pipeline-required-mark"><span aria-hidden="true">✓</span> Bắt buộc có giá trị</div><small>Không thể chuyển giai đoạn khi thuộc tính này còn trống.</small></div></div>)}
     {properties.length===0&&<p className="pipeline-logic-help">Chưa có thuộc tính tùy chỉnh. Thêm tại tab Thuộc tính của Conversation.</p>}
     <Button variant="outline" disabled={fields.includes('')||fields.length>=100||!properties.some(p=>!fields.includes(p.key))} onClick={()=>update({...draft,fields:[...fields,'']})}>+ Add property</Button>
     <div className="pipeline-logic-section"><h3>Nhu cầu & bằng chứng</h3><p className="pipeline-logic-help">Các mốc phải có bằng chứng còn hiệu lực trên cùng một nhu cầu.</p></div>
     <label className="pipeline-logic-check"><input type="checkbox" checked={draft.need??false} onChange={e=>update({...draft,need:e.target.checked})}/><span>Đã ghi nhận ít nhất một nhu cầu</span></label>
     {milestones.map(m=><label className="pipeline-logic-check" key={m.key}><input type="checkbox" checked={draft.milestones?.includes(m.key)??false} onChange={e=>toggle(m.key,e.target.checked)}/><span>{m.label}</span></label>)}
    </fieldset>
    {editable&&configured&&<button className="pipeline-delete-rule" type="button" onClick={()=>update({})}>Xóa rule của giai đoạn</button>}
    <p className="pipeline-logic-save-note">Save rule lưu vào bản nháp. Chọn “Công bố phiên bản mới” trên Pipeline để áp dụng.</p>
   </section>
   <section className="pipeline-logic-preview" aria-label="Preview rule"><div className="pipeline-preview-content"><h3>Preview</h3><p>Đổi giai đoạn để xem các yêu cầu của rule này.</p><label>Lifecycle Stage<select aria-label="Preview Lifecycle Stage" value={preview} onChange={e=>setPreview(e.target.value)}>{stages.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
    <div className="pipeline-preview-card" key={preview}>{!active||!configured?<p className="pipeline-preview-empty">Không có thuộc tính phụ thuộc cho lựa chọn này.</p>:<><h4>Thông tin cần có</h4>{fields.filter(Boolean).map(key=><label key={key}><span>{options.find(p=>p.key===key)?.label??key} *</span><input aria-label={`Preview ${options.find(p=>p.key===key)?.label??key}`} placeholder="Nhập giá trị xem trước"/></label>)}{draft.need&&<p className="pipeline-preview-requirement">✓ Đã ghi nhận ít nhất một nhu cầu</p>}{draft.milestones?.map(key=><p className="pipeline-preview-requirement" key={key}>✓ {milestones.find(m=>m.key===key)?.label??key}</p>)}<small>Minh họa yêu cầu · Không thay đổi dữ liệu hội thoại.</small></>}</div>
   </div></section>
  </div>
 </Dialog>;
}
