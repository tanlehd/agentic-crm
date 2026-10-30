export type ConversationStageType='open'|'converted'|'unqualified';
export type ConversationStageRequirements={fields?:string[];need?:boolean;milestones?:string[]};
export type ConversationStage={key:string;label:string;type?:ConversationStageType;description?:string;color?:string;requirements?:ConversationStageRequirements};
export type ConversationAutomations={set_convert_time:boolean;clear_convert_time:boolean};
export type ConversationPipelineDefinition={stages:ConversationStage[];milestones:{key:string;label:string}[];automations?:ConversationAutomations};
export const conversationSystemStages:readonly ConversationStage[]=[
 {key:'new',label:'Mới',type:'open',color:'#94a3b8'},
 {key:'received',label:'Tiếp nhận',type:'open',color:'#2563eb'},
 {key:'converted',label:'Converted',type:'converted',color:'#0d9488'},
 {key:'unqualified',label:'Unqualified',type:'unqualified',color:'#64748b'},
];
export const isTypedConversationPipeline=(d:ConversationPipelineDefinition)=>d.automations!==undefined||d.stages.some(s=>s.type!==undefined);
export function validConversationStageTypes(d:ConversationPipelineDefinition,previous?:ConversationPipelineDefinition):boolean{
 if(!isTypedConversationPipeline(d))return !previous||!isTypedConversationPipeline(previous);
 return Boolean(d.automations)&&d.stages[0]?.key==='new'&&
  d.stages.every(s=>['open','converted','unqualified'].includes(s.type??''))&&
  conversationSystemStages.every(system=>d.stages.some(s=>s.key===system.key&&s.type===system.type));
}
/** Produces an unpublished draft; never mutates a stored process version. */
export function upgradeConversationPipeline(definition:ConversationPipelineDefinition):ConversationPipelineDefinition{
 const d=structuredClone(definition);if(isTypedConversationPipeline(d))return d;
 const stages=d.stages.map(s=>({...s,type:conversationSystemStages.find(v=>v.key===s.key)?.type??'open' as ConversationStageType}));
 for(const system of conversationSystemStages)if(!stages.some(s=>s.key===system.key))stages.push({...system,type:system.type!});
 const first=stages.find(s=>s.key==='new')!;const remaining=stages.filter(s=>s.key!=='new');
 return {...d,stages:[first,...remaining],automations:{set_convert_time:true,clear_convert_time:true}};
}
