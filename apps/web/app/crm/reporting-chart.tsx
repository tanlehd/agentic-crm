import {exactValue,visualLabels,type ReportCatalog,type ReportDefinition,type ReportResult} from './reporting-model';
export type Chart=Extract<ReportDefinition['visualization'],{x:string}>;
const colors=['#5167dd','#128779','#b16a16','#9658b4','#d05b77','#357896','#667047','#815249'];
const key=(v:unknown)=>JSON.stringify(v);
const numeric=(v:unknown):v is string=>typeof v==='string'&&/^-?\d+(\.\d+)?$/.test(v)&&Number.isFinite(Number(v))&&Math.abs(Number(v))<=Number.MAX_SAFE_INTEGER;
// Compare sums exactly; geometry is the only place decimal strings become floating-point.
function partsMatch(values:string[],total:string|null|undefined){
 if(typeof total!=='string')return false;
 const all=[...values,total],scale=Math.max(...all.map(v=>(v.split('.')[1]??'').length));
 const integer=(v:string)=>{const [a,b='']=v.split('.');return BigInt(a!+b.padEnd(scale,'0'));};
 return values.reduce((sum,v)=>sum+integer(v),0n)===integer(total);
}
export function chartIssue(r:ReportResult,c:Chart,catalog:ReportCatalog):string{
 const selected=r.metrics.map(id=>catalog.metrics.find(m=>m.id===id));
 if(!r.rows.length)return 'Không có dữ liệu để vẽ biểu đồ.';
 if(selected.some(m=>!m)||new Set(selected.map(m=>m?.unit)).size!==1||r.rows.length>80||r.rows.some(row=>r.metrics.some(m=>row.metrics[m]!==null&&!numeric(row.metrics[m]))))return 'Biểu đồ cần các KPI cùng đơn vị, tối đa 80 nhóm và giá trị trong giới hạn hiển thị.';
 if(['pie','donut','stacked_bar'].includes(c.type)){
  if(selected.length!==1||!selected.every(m=>m&&['sum','count'].includes(m.aggregation)))return 'Biểu đồ thành phần cần một chỉ số SUM hoặc COUNT.';
  const m=r.metrics[0]!,values=r.rows.map(row=>row.metrics[m]);
  if(r.warnings.length||values.some(v=>!numeric(v)||Number(v)<0)||!numeric(r.totals[m])||!partsMatch(values as string[],r.totals[m]))return 'Dữ liệu thành phần thiếu, âm hoặc không khớp tổng tính lại. Xem bảng số chính xác.';
  if(c.type==='stacked_bar'){
   const xi=r.dimensions.indexOf(c.x),si=r.dimensions.indexOf(c.series!);
   if(!c.series||new Set(r.rows.map(row=>key(row.dimensions[xi]))).size*new Set(r.rows.map(row=>key(row.dimensions[si]))).size!==r.rows.length)return 'Cột chồng cần đầy đủ dữ liệu cho từng nhóm và series; dữ liệu thiếu không được coi là 0.';
  }else if(r.rows.length>12||Number(r.totals[m])===0)return 'Pie/Donut cần tổng dương và tối đa 12 nhóm; không tự gộp hoặc bỏ nhóm.';
 }
 return '';
}
export function consecutive(a:unknown,b:unknown,bucket:ReportDefinition['time']['bucket']){
 if(typeof a!=='string'||typeof b!=='string')return false;
 const date=new Date(a+(bucket==='month'?'-01':'')+'T00:00:00Z');
 if(!Number.isFinite(date.getTime()))return false;
 if(bucket==='month')date.setUTCMonth(date.getUTCMonth()+1);else date.setUTCDate(date.getUTCDate()+(bucket==='week'?7:1));
 return date.toISOString().slice(0,bucket==='month'?7:10)===b;
}
export function CommonReportChart({result:r,chart:c,catalog,definition:d}:{result:ReportResult;chart:Chart;catalog:ReportCatalog;definition:ReportDefinition}){
 const xi=r.dimensions.indexOf(c.x),si=c.series?r.dimensions.indexOf(c.series):-1,temporal=c.type==='line'||c.type==='area';
 const categories=[...new Set(r.rows.map(row=>key(row.dimensions[xi])))];if(temporal)categories.sort();
 const groups=si<0?['']:[...new Set(r.rows.map(row=>key(row.dimensions[si])))];
 const metricLabel=(id:string)=>catalog.metrics.find(m=>m.id===id)?.label??id;
 const label=(v:unknown)=>v===null?'Chưa xác định':exactValue(v);
 const unit=catalog.metrics.find(m=>m.id===r.metrics[0])?.unit==='currency'?d.currency:catalog.metrics.find(m=>m.id===r.metrics[0])?.unit;
 const series=r.metrics.flatMap(metric=>groups.map(group=>({metric,group,label:metricLabel(metric)+(si>=0?' · '+label(JSON.parse(group)):'')})));
 const rows=new Map(r.rows.map(row=>[key([row.dimensions[xi],si<0?'':row.dimensions[si]]),row]));
 const value=(category:string,s:typeof series[number])=>rows.get(key([JSON.parse(category),si<0?'':JSON.parse(s.group)]))?.metrics[s.metric];
 const aria=visualLabels[c.type]+', dữ liệu đầy đủ trong bảng bên dưới';
 if(c.type==='pie'||c.type==='donut'){
  const total=Number(r.totals[r.metrics[0]!]!),radius=c.type==='donut'?78:55,width=c.type==='donut'?35:110;let offset=0;
  return <><svg viewBox="0 0 420 270" role="img" aria-label={aria}>{r.rows.map((row,i)=>{const v=row.metrics[r.metrics[0]!]!,fraction=Number(v)/total,start=offset;offset+=fraction;return <circle key={i} cx="210" cy="130" r={radius} fill="none" stroke={colors[i%colors.length]} strokeWidth={width} pathLength="1" strokeDasharray={`${fraction} ${1-fraction}`} strokeDashoffset={-start} transform="rotate(-90 210 130)"><title>{`${label(row.dimensions[xi])}: ${exactValue(v)} ${unit} · ${(fraction*100).toFixed(1)}%`}</title></circle>;})}{c.type==='donut'&&<text x="210" y="134" textAnchor="middle" fontSize="14">{exactValue(r.totals[r.metrics[0]!])}</text>}</svg><p className="rpt-hint">Tỷ trọng trên tổng các nhóm hiển thị · {unit}</p><div className="rpt-legend">{r.rows.map((row,i)=><span key={i}><i style={{background:colors[i%colors.length]}}/>{label(row.dimensions[xi])}: {exactValue(row.metrics[r.metrics[0]!])} ({(Number(row.metrics[r.metrics[0]!])/total*100).toFixed(1)}%)</span>)}</div></>;
 }
 const stacked=c.type==='stacked_bar',horizontal=c.type==='horizontal_bar';
 const values=stacked?categories.map(cat=>series.reduce((sum,s)=>sum+Number(value(cat,s)),0)):r.rows.flatMap(row=>r.metrics.map(m=>Number(row.metrics[m]??0)));
 const max=Math.max(1,...values),min=Math.min(0,...values),height=horizontal?Math.max(280,categories.length*series.length*24+60):300;
 const y=(v:number)=>230-(v-min)/(max-min)*195,x=(v:number)=>180+(v-min)/(max-min)*570,step=720/Math.max(1,categories.length),bar=step/(series.length+1);
 return <><svg viewBox={`0 0 800 ${height}`} role="img" aria-label={aria}><line x1={horizontal?x(0):50} x2={horizontal?x(0):780} y1={horizontal?25:y(0)} y2={horizontal?height-35:y(0)} stroke="#ccd3df"/><text x={horizontal?180:0} y="20" fontSize="12">{exactValue(min)} — {exactValue(max)} {unit}</text>
 {horizontal?categories.map((cat,i)=><g key={cat}><text x="5" y={40+i*series.length*24+12} fontSize="12">{label(JSON.parse(cat)).slice(0,22)}</text>{series.map((s,j)=>{const v=value(cat,s);if(v===null||v===undefined)return null;const n=Number(v);return <rect key={j} x={Math.min(x(0),x(n))} y={32+(i*series.length+j)*24} width={Math.abs(x(n)-x(0))} height="18" fill={colors[j%colors.length]}><title>{`${label(JSON.parse(cat))}: ${s.label} = ${exactValue(v)} ${unit}`}</title></rect>;})}</g>):series.map((s,j)=>{
  const points=categories.map((cat,i)=>{const v=value(cat,s);return v===null||v===undefined?null:{x:50+i*step+step/2,y:y(Number(v)),v,i};});
  const segments:NonNullable<typeof points[number]>[][]=[];
  points.forEach((p,i)=>{if(!p)return;if(!i||!points[i-1]||!consecutive(JSON.parse(categories[i-1]!),JSON.parse(categories[i]!),d.time.bucket))segments.push([]);segments.at(-1)!.push(p);});
  return <g key={s.metric+s.group}>{temporal&&segments.map((segment,i)=><g key={i}>{c.type==='area'&&<polygon points={`${segment[0]!.x},${y(0)} ${segment.map(p=>`${p.x},${p.y}`).join(' ')} ${segment.at(-1)!.x},${y(0)}`} fill={colors[j%colors.length]} opacity=".18"/>}<polyline data-segment="trend" points={segment.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke={colors[j%colors.length]} strokeWidth="2"/></g>)}{points.map(p=>{if(!p)return null;const title=`${label(JSON.parse(categories[p.i]!))}: ${s.label} = ${exactValue(p.v)} ${unit}`;if(temporal)return <circle key={p.i} cx={p.x} cy={p.y} r="4" fill={colors[j%colors.length]}><title>{title}</title></circle>;const base=stacked?series.slice(0,j).reduce((sum,prior)=>sum+Number(value(categories[p.i]!,prior)),0):0;return <rect key={p.i} x={50+p.i*step+(stacked?step*.15:j*bar)} y={Math.min(y(base+Number(p.v)),y(base))} width={Math.max(1,stacked?step*.65:bar-2)} height={Math.abs(y(base)-y(base+Number(p.v)))} fill={colors[j%colors.length]}><title>{title}</title></rect>;})}</g>;
 })}
 {!horizontal&&categories.map((cat,i)=>i%Math.max(1,Math.ceil(categories.length/6))===0?<text key={cat} x={50+i*step} y="265" fontSize="11">{label(JSON.parse(cat)).slice(0,22)}</text>:null)}</svg><div className="rpt-legend">{series.map((s,i)=><span key={s.metric+s.group}><i style={{background:colors[i%colors.length]}}/>{s.label}</span>)}</div></>;
}
