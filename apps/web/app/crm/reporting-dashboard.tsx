'use client';
import {useEffect,useRef,useState} from 'react';
import type {DashboardDefinition} from './reporting-dashboard-model';
import type {ReportResult,ReportSource} from './reporting-model';
import type {ApiError} from './api';
import {ReportingVisual} from './reporting-visual';

export function ReportingDashboard({definition:d,sources,editable,onChange,post,onAdd}:{definition:DashboardDefinition;sources:ReportSource[];editable:boolean;onChange:(d:DashboardDefinition)=>void;post:(path:string,body:unknown,init?:RequestInit)=>Promise<any>;onAdd:()=>void}){
 const [results,setResults]=useState<Record<string,ReportResult>>({}),[errors,setErrors]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[editing,setEditing]=useState(false);
 const sequence=useRef(0),abort=useRef<AbortController|null>(null);
 useEffect(()=>{sequence.current++;abort.current?.abort();setResults({});setErrors({});setBusy(false);setStatus('Nhấn Làm mới dashboard để tính từ snapshot đã lưu.');return()=>{sequence.current++;abort.current?.abort();};},[d]);
 async function refresh(){
  abort.current?.abort();const controller=new AbortController();abort.current=controller;const seq=++sequence.current;setResults({});setErrors({});setBusy(true);setStatus('Đang tính các widget…');let next=0,denied=false,failed=0;
  const worker=async()=>{while(next<d.widgets.length&&!denied&&seq===sequence.current){const w=d.widgets[next++]!;try{
   const source=sources.find(s=>s.id===w.definition.bindingId);
   if(!source||source.generation!==w.generation)throw Object.assign(new Error(),{code:'SNAPSHOT_PIN_UNAVAILABLE'});
   const r=await post('/api/v1/reporting/query',{definition:w.definition,generation:w.generation},{signal:controller.signal});
   if(seq===sequence.current&&!denied)setResults(old=>({...old,[w.id]:r.data}));
  }catch(e){if(seq!==sequence.current||(e as Error).name==='AbortError')return;const error=e as ApiError;failed++;
   if(error.status===401||error.status===403){denied=true;controller.abort();setResults({});setErrors({});setStatus('Quyền truy cập hoặc phiên đăng nhập đã thay đổi. Đã xóa toàn bộ kết quả; tải lại trang để kiểm tra quyền.');}
   else setErrors(old=>({...old,[w.id]:error.code??'QUERY_FAILED'}));
  }}};
  await Promise.all([worker(),worker()]);if(seq===sequence.current){setBusy(false);if(!denied)setStatus(failed?`Có ${failed} widget chưa tính được; các ô lỗi không phải số 0.`:`Đã tính ${d.widgets.length} widget từ snapshot mô phỏng đã ghim.`);}
 }
 const change=(i:number,patch:Partial<DashboardDefinition['widgets'][number]>)=>onChange({...d,widgets:d.widgets.map((w,n)=>n===i?{...w,...patch}:w)});
 return <section className="rpt-dashboard" aria-label="Dashboard đã lưu">
  <div className="rpt-dashboard-actions"><span className="rpt-badge">DEMO · SNAPSHOT CỐ ĐỊNH</span><button className="ui-primary" disabled={busy||!d.widgets.length} onClick={()=>void refresh()}>Làm mới dashboard</button><button disabled={!editable||busy} onClick={()=>setEditing(!editing)}>{editing?'Xong chỉnh bố cục':'Chỉnh bố cục'}</button>{editing&&<button disabled={!editable||d.widgets.length>=12} onClick={onAdd}>+ Thêm widget</button>}</div>
  {editing?<label>Mô tả dashboard<textarea aria-label="Mô tả dashboard" maxLength={4000} value={d.description} onChange={e=>onChange({...d,description:e.target.value})}/></label>:<p className="rpt-dashboard-description">{d.description}</p>}
  <p role="status" aria-live="polite">{status}</p>
  <div className="rpt-dashboard-grid">{d.widgets.map((w,i)=>{const source=sources.find(s=>s.id===w.definition.bindingId),r=results[w.id];return <article key={w.id} className={'rpt-dashboard-widget '+(!w.definition.dimensions.length||w.definition.visualization.type==='table'?'rpt-dashboard-wide':'')} aria-label={w.title}>
   {editing?<div className="rpt-dashboard-editor"><label>Tiêu đề widget {i+1}<input value={w.title} maxLength={160} onChange={e=>change(i,{title:e.target.value})}/></label><label>Ghi chú widget {i+1}<textarea value={w.note} maxLength={2000} onChange={e=>change(i,{note:e.target.value})}/></label><div><button aria-label={'Đưa widget lên '+w.title} disabled={i===0} onClick={()=>{const widgets=[...d.widgets];[widgets[i-1],widgets[i]]=[widgets[i]!,widgets[i-1]!];onChange({...d,widgets});}}>↑</button><button onClick={()=>onChange({...d,widgets:d.widgets.filter((_,n)=>n!==i)})}>Bỏ widget</button></div></div>:<h3><span>{String(i+1).padStart(2,'0')}</span> {w.title}</h3>}
   <p className="rpt-hint">{w.note}</p>
   <details className="rpt-provenance"><summary>Nguồn và thời gian mô phỏng</summary><p>Snapshot {w.generation}<br/>{w.definition.time.from} → {w.definition.time.to}<br/>Múi giờ: {w.definition.time.timezone}. Đây là dữ liệu mô phỏng, không phải luồng CRM trực tiếp.</p></details>
   {errors[w.id]&&<p role="alert">Chưa có kết quả: {errors[w.id]}{errors[w.id]==='SNAPSHOT_PIN_UNAVAILABLE'&&' · Nguồn đã đổi snapshot hoặc chưa được tải. Kiểm tra quyền/nguồn trước khi thay bản ghim.'}</p>}
   {r&&source?<><ReportingVisual result={r} definition={!w.definition.dimensions.length?{...w.definition,visualization:{type:'kpi'}}:w.definition} catalog={source.catalog}/>{r.warnings.length>0&&<p role="alert">Cảnh báo dữ liệu: {r.warnings.join(', ')}</p>}</>:!errors[w.id]&&<p className="rpt-hint">{busy?'Đang chờ kết quả…':'Chưa tính.'}</p>}
  </article>;})}</div>
  {!d.widgets.length&&<p>Dashboard chưa có widget. Chọn Chỉnh bố cục → Thêm widget để chọn nguồn và chỉ số.</p>}
  <p className="rpt-hint">“—” là chưa có dữ liệu hoặc không tính được. Tổng tỷ lệ và chi phí được tính lại trên backend.</p>
 </section>;
}
