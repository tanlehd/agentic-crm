import {conversionTemplate} from './conversion-template.js';
import {operationsTemplate} from './operations-template.js';
import {inboxDemoDashboards} from './inbox-demo.js';
import {digest} from './registry.js';
const slot='11111111-1111-4111-8111-111111111111';
const catalog=inboxDemoDashboards(slot,'a'.repeat(64)).map((item,i)=>{
 const recipes=item.definition.widgets.map((w,n)=>({key:w.id,label:w.title,note:w.note,definition:w.definition,layout:{x:0,y:n*4,w:12,h:4}}));
 const manifest={key:i===0?'inbox_operations_v1':'ad_inbox_quality_v1',version:1,name:item.name,description:item.definition.description,category:i===0?'Vận hành inbox':'Marketing',environment:'mock',sourceSlot:'demo',recipes};
 return {...manifest,contentHash:digest(manifest),reportCount:recipes.length};
});
export function dashboardTemplates(){return structuredClone([...catalog,operationsTemplate(),conversionTemplate()]);}
