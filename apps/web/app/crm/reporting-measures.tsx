'use client';
import {useState} from 'react';
import {reportOptions,type ReportDefinition,type ReportMetric,type ReportSource,type ReportMeasureOption} from './reporting-model';

export const aggregationLabel=(operation:string)=>({count:'COUNT · Đếm giá trị có dữ liệu',count_distinct:'COUNT DISTINCT · Đếm không trùng',sum:'SUM · Tổng',avg:'AVG · Trung bình',min:'MIN · Nhỏ nhất',max:'MAX · Lớn nhất',p95:'P95 · Phân vị 95',ratio:'Công thức tỷ lệ'}[operation]??operation);
const ref=(m:{id:string;version:number})=>m.id+'@'+m.version;
const fieldKey=(m:ReportMeasureOption)=>JSON.stringify([m.field,m.population]);

export function ReportingMeasures({source,definition:d,onChange}:{source:ReportSource;definition:ReportDefinition;onChange:(metrics:ReportDefinition['metrics'])=>void}){
 const [mode,setMode]=useState(source.measureOptions?'field':'preset'),[field,setField]=useState(''),[operation,setOperation]=useState(''),[choice,setChoice]=useState('');
 const available=reportOptions(source,d).metrics,model=ref(d.model),catalog=source.catalog;
 const options=(source.measureOptions??[]).filter(o=>o.model===model&&available.some(m=>ref(m)===ref(o)));
 const fields=[...new Map(options.filter(o=>o.field).map(o=>[fieldKey(o),o])).values()];
 const selectedField=fields.find(o=>fieldKey(o)===field)??fields[0];
 const operations=options.filter(o=>o.field&&selectedField&&fieldKey(o)===fieldKey(selectedField));
 const selectedOperation=operations.find(o=>o.operation===operation)??operations[0];
 const choices=available.filter(m=>mode==='formula'?m.aggregation==='ratio':true);
 const selectedChoice=choices.find(m=>ref(m)===choice)??choices[0];
 const pending=mode==='field'?available.find(m=>selectedOperation&&ref(m)===ref(selectedOperation)):selectedChoice;
 const pendingOption=options.find(o=>pending&&ref(o)===ref(pending));
 const selected=d.metrics.map(m=>catalog.metrics.find(c=>ref(c)===ref(m))??{...m,label:m.id,unit:'',formula:'Phiên bản chỉ số chưa khả dụng.',grain:'',aggregation:'',inputs:[],requires:[],models:[],dimensions:[]});
 const duplicate=!!pending&&d.metrics.some(m=>ref(m)===ref(pending));
 function detail(m:ReportMetric,o?:ReportMeasureOption){
  const dependencies=m.requires.map(dep=>catalog.metrics.find(x=>ref(x)===ref(dep))).filter((x):x is ReportMetric=>!!x);
  return <div className="rpt-measure-detail"><code>{m.formula}</code>{o?.field&&<p>Field: <strong>{o.field}</strong></p>}<p>Đơn vị: {m.unit} · Grain: {m.grain}</p>{o&&<p>Phạm vi: {o.population}</p>}
   {o?.nullPolicy==='ratio'?<><p>Tính từ tử số và mẫu số đã tổng hợp trong từng nhóm. Mẫu số bằng 0 → —. Dòng tổng tính lại tỷ lệ.</p><ul>{dependencies.map(dep=><li key={ref(dep)}><strong>{dep.label}</strong><code>{dep.formula}</code></li>)}</ul></>:o&&<p>{o.nullPolicy==='propagate'?'Thiếu giá trị → — và cảnh báo; không coi dữ liệu thiếu là 0.':'Bỏ qua giá trị trống. COUNT đếm số bản ghi có dữ liệu; COUNT DISTINCT đếm giá trị duy nhất.'}</p>}
  </div>;
 }
 return <section className="rpt-measures" aria-label="Chỉ số báo cáo"><h4>Chỉ số / Trục Y <small>{d.metrics.length}/8</small></h4><p className="rpt-hint">Chọn field và cách tính, hoặc dùng công thức KPI đã định nghĩa.</p>
  <div className="rpt-measure-compose"><label>Loại chỉ số<select aria-label="Loại chỉ số" value={mode} onChange={e=>{setMode(e.target.value);setChoice('');}}>{source.measureOptions&&<option value="field">Tổng hợp theo field</option>}<option value="formula">Công thức KPI</option><option value="preset">KPI có sẵn</option></select></label>
   {mode==='field'?<><label>Field cần đo<select aria-label="Field cần đo" value={selectedField?fieldKey(selectedField):''} onChange={e=>{setField(e.target.value);setOperation('');}}>{!fields.length&&<option value="">Không có field phù hợp</option>}{fields.map(o=><option key={fieldKey(o)} value={fieldKey(o)}>{o.field}</option>)}</select></label><label>Phép tổng hợp<select aria-label="Phép tổng hợp" value={selectedOperation?.operation??''} onChange={e=>setOperation(e.target.value)}>{!operations.length&&<option value="">Không có phép tính phù hợp</option>}{operations.map(o=><option key={ref(o)} value={o.operation}>{aggregationLabel(o.operation)}</option>)}</select></label></>:<label>{mode==='formula'?'Công thức KPI':'Chỉ số có sẵn'}<select aria-label={mode==='formula'?'Công thức KPI':'Chỉ số có sẵn'} value={selectedChoice?ref(selectedChoice):''} onChange={e=>setChoice(e.target.value)}>{!choices.length&&<option value="">Không có chỉ số phù hợp</option>}{choices.map(m=><option key={ref(m)} value={ref(m)}>{m.label} · {m.unit}</option>)}</select></label>}
   {pending&&<details className="rpt-calculation"><summary>Xem cách tính: {pending.label}</summary>{detail(pending,pendingOption)}</details>}
   <button className="ui-primary" disabled={!pending||duplicate||d.metrics.length>=8} onClick={()=>{if(pending)onChange([...d.metrics,{id:pending.id,version:pending.version}]);}}>{duplicate?'Đã có trong báo cáo':'+ Thêm chỉ số'}</button>
   <p className="rpt-hint">Các lựa chọn theo model, snapshot, chiều và bộ lọc hiện tại. Công thức tự nhập chưa được hỗ trợ.</p>
  </div>
  <ol className="rpt-selected-measures">{selected.map((m,i)=>{
   const o=options.find(x=>ref(x)===ref(m)),alternatives=o?.field?options.filter(x=>x.field&&fieldKey(x)===fieldKey(o)):[];
   return <li className="rpt-measure-card" key={ref(m)}><div className="rpt-measure-title"><strong>{m.label}</strong><span className="rpt-measure-actions"><button aria-label={'Đưa chỉ số lên '+m.id} disabled={i===0} onClick={()=>{const next=[...d.metrics];[next[i-1],next[i]]=[next[i]!,next[i-1]!];onChange(next);}}>↑</button><button aria-label={'Bỏ chỉ số '+m.id} onClick={()=>onChange(d.metrics.filter(x=>ref(x)!==ref(m)))}>×</button></span></div>
    {alternatives.length>1?<label>Cách tính<select aria-label={'Cách tính '+m.id} value={ref(m)} onChange={e=>{const next=alternatives.find(x=>ref(x)===e.target.value);if(next)onChange(d.metrics.map((x,n)=>n===i?{id:next.id,version:next.version}:x));}}>{alternatives.map(x=><option key={ref(x)} value={ref(x)} disabled={ref(x)!==ref(m)&&d.metrics.some(y=>ref(x)===ref(y))}>{aggregationLabel(x.operation)}</option>)}</select></label>:<span className="rpt-aggregation">{aggregationLabel(o?.operation??m.aggregation)}</span>}
    <small>{m.unit} · {o?.field??m.grain} · v{m.version}</small><details><summary>Công thức & phạm vi</summary>{detail(m,o)}</details>
   </li>;
  })}</ol>
  {!selected.length&&<p className="rpt-message">Thêm ít nhất một chỉ số để chạy báo cáo.</p>}
  <p className="rpt-hint">AVG, distinct và tỷ lệ ở dòng tổng được tính lại từ dữ liệu gốc, không cộng các ô trong bảng.</p>
 </section>;
}
