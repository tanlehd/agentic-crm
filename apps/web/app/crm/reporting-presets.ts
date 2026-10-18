import {encodeReport,reportOptions,type ReportDefinition,type ReportSource,type ReportVisualization} from './reporting-model';

export function visualizationError(d:ReportDefinition,s:ReportSource):string {
 const v=d.visualization;
 if(d.model.id.startsWith('sf_'))return !d.stageFunnel||d.stageFunnel.stages.length<2?'Chọn ít nhất hai stage.':!['table','funnel'].includes(v.type)?'Nguồn stage hỗ trợ Funnel hoặc bảng.':'';
 if(v.type==='funnel')return 'Funnel cần nguồn Tiến trình stage.';
 if(v.type==='kpi'&&(d.dimensions.length||d.metrics.length!==1))return 'KPI card cần một metric và không có group by.';
 if(!('x' in v))return '';
 if(d.dimensions.length<1||d.dimensions.length>2||d.dimensions.length===2&&!v.series||v.x===v.series)return 'Biểu đồ cần một trục X và tối đa một chiều Series khác X.';
 if(['line','area'].includes(v.type)&&s.catalog.fields.find(f=>f.id===v.x)?.type!=='datetime')return 'Trend cần trục X là thời gian.';
 if(['pie','donut','stacked_bar'].includes(v.type)){
  if(d.metrics.length!==1||!d.metrics.every(ref=>s.catalog.metrics.some(m=>m.id===ref.id&&m.version===ref.version&&['sum','count'].includes(m.aggregation))))return 'Biểu đồ thành phần cần một chỉ số SUM hoặc COUNT; không cộng tỷ lệ, trung bình hay distinct.';
  if(v.type==='stacked_bar'?!v.series:!!v.series||d.dimensions.length!==1)return v.type==='stacked_bar'?'Cột chồng cần chọn chiều Series.':'Pie/Donut cần một chiều và không chia Series.';
 }
 return '';
}

export function reportPreset(source:ReportSource,d:ReportDefinition,type:ReportVisualization['type']):{definition?:ReportDefinition;reason?:string}{
 if(d.stageFunnel)return ['funnel','table'].includes(type)?{definition:encodeReport(d,type)}:{reason:'Nguồn stage dùng Funnel hoặc bảng.'};
 if(type==='funnel')return {reason:'Chọn nguồn Tiến trình stage.'};
 if(type==='table')return {definition:encodeReport(d,type)};
 const additive=['pie','donut','stacked_bar'].includes(type),base={...d,dimensions:[],metrics:[]};
 const available=reportOptions(source,base).metrics.filter(m=>!additive||['sum','count'].includes(m.aggregation));
 const metric=available.find(m=>d.metrics.some(ref=>ref.id===m.id&&ref.version===m.version))??available[0];
 if(!metric)return {reason:additive?'Nguồn này chưa có chỉ số SUM/COUNT phù hợp bộ lọc.':'Chưa có chỉ số phù hợp bộ lọc.'};
 const next={...d,dimensions:[],metrics:[{id:metric.id,version:metric.version}]} as ReportDefinition;
 const options=reportOptions(source,next),fields=options.dimensions;
 const temporal=fields.find(f=>f.id===options.model?.timeField),category=fields.find(f=>d.dimensions.includes(f.id)&&f.type!=='datetime')??fields.find(f=>f.type==='enum')??fields.find(f=>f.type!=='datetime');
 if(type==='kpi')return {definition:encodeReport(next,type)};
 const x=['line','area'].includes(type)?temporal:category??temporal;
 if(!x)return {reason:'Chưa có chiều phân tích phù hợp; thêm đối tượng liên quan.'};
 next.dimensions=[x.id];let series:string|undefined;
 if(type==='stacked_bar'||type==='pivot'){
  const second=fields.find(f=>f.id!==x.id&&d.dimensions.includes(f.id))??fields.find(f=>f.id!==x.id&&f.type==='datetime')??fields.find(f=>f.id!==x.id);
  if(!second)return {reason:'Cần hai chiều phân tích khả dụng.'};
  series=second.id;next.dimensions.push(series);
 }
 return {definition:encodeReport(next,type,type==='pivot'?series:undefined,type==='stacked_bar'?series:undefined)};
}
