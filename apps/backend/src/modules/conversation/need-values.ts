import {CommandError} from '../../kernel/reliability/commands.js';
import {object,value,type Property} from '../crm/properties.js';
export const needResource='conversation_need';
import {needBuiltins} from '../crm/need-fields.js';
export {needBuiltins};
export const needDefaults={assessment_status:'unassessed',need_clarity:'none',intent:'other',product_interest:'',unresolved_reason:''};
export function validateNeedValues(input:unknown,defs:Property[]){
 const b=object(input);if(Object.keys(b).length>100||Buffer.byteLength(JSON.stringify(b))>65536)throw new CommandError(422,'INVALID_NEED_VALUES');
 for(const [key,v] of Object.entries(b)){const p=defs.find(d=>d.key===key);if(!p)throw new CommandError(422,'INVALID_NEED_VALUES');if(v!==null)value(p,v);else if(needBuiltins.some(d=>d.key===key))throw new CommandError(422,'INVALID_NEED_VALUES');}
 return b;
}
export function mergeNeedValues(old:Record<string,unknown>,patch:Record<string,unknown>,pins:string[],ai:boolean){
 const result={...old};for(const [key,v] of Object.entries(patch)){if(ai&&pins.includes(key))continue;if(v===null)delete result[key];else result[key]=v;}return result;
}
export function validateProposal(input:unknown,defs:Property[],evidenceIds:string[]){
 const p=object(input,['values','confidence','evidence_ids']);validateNeedValues(p.values,defs);
 if(needBuiltins.some(f=>!Object.hasOwn(p.values,f.key))||p.values.assessment_status==='unassessed'||typeof p.confidence!=='number'||!Number.isFinite(p.confidence)||p.confidence<0||p.confidence>1||!Array.isArray(p.evidence_ids)||p.evidence_ids.length>100||new Set(p.evidence_ids).size!==p.evidence_ids.length||p.evidence_ids.some((id:unknown)=>typeof id!=='string'||!evidenceIds.includes(id))||p.values.assessment_status==='assessed'&&!p.evidence_ids.length)throw new CommandError(422,'INVALID_AI_PROPOSAL');
 return p as {values:Record<string,unknown>;confidence:number;evidence_ids:string[]};
}
export function recoveryReason(values:Record<string,unknown>,pins:string[],proposal:any,minConfidence:number){
 if(values.assessment_status!=='assessed')return 'not_assessed';
 if(values.need_clarity!=='clear'||values.intent!=='buy')return 'need_not_clear';
 if(!String(values.unresolved_reason??'').trim())return 'no_unresolved_reason';
 if(!['assessment_status','need_clarity','intent','unresolved_reason'].every(k=>pins.includes(k))&&(!proposal||typeof proposal.confidence!=='number'||proposal.confidence<minConfidence||!proposal.evidence_ids?.length))return 'confidence_too_low';
 return null;
}
