import type {Definition} from './types.js';
import {digest} from './registry.js';
import {stageMetrics} from './stage-catalog.js';
export function stageTemplate(){
 const recipes=['conversation','lead','deal'].flatMap(kind=>['funnel','table'].map(display=>{
  const stages=kind==='conversation'?['received','consulting','next_step']:kind==='lead'?['new','qualifying','qualified','handed_off','accepted']:['open','qualified','proposal','won'];
  const definition:Definition={schemaVersion:1,model:{id:'sf_'+kind,version:1},bindingId:'11111111-1111-4111-8111-111111111111',relations:[],dimensions:['sf_subject.stage'],metrics:stageMetrics.map(([id])=>({id,version:1})),filters:[],time:{mode:'activity',from:'2026-01-01T00:00:00.000Z',to:'2026-10-18T00:00:00.000Z',asOf:'2026-10-18T00:00:00.000Z',timezone:'Asia/Ho_Chi_Minh',bucket:'day',rollingDays:30},stageFunnel:{processVersion:'1',stages,mode:'entry_cohort'},visualization:{type:display as 'funnel'|'table'}};
  return {key:kind+'_'+display,label:(display==='funnel'?'Funnel · ':'Vào/ra và thời gian · ')+kind,note:'Stage bắt buộc theo thứ tự. Thiếu lịch sử được công bố; chưa qua bước kế không đồng nghĩa lost. Phiên bản quy trình 1; chỉnh report để chọn quy trình khác.',definition,layout:{x:0,y:0,w:6,h:8}};
 }));
 const manifest={key:'stage_funnels_v1',version:1,name:'Funnel theo stage',description:'Conversation, Lead và Deal: funnel sự kiện vào stage, lưu lượng vào/ra và thời gian lưu stage.',category:'Hiệu suất kinh doanh',environment:'connected',sourceSlot:'stage',recipes};return {...manifest,contentHash:digest(manifest),reportCount:recipes.length};
}
