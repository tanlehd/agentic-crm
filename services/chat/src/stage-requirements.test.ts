import {describe,it,expect} from 'vitest';
import type {PoolConnection} from 'mysql2/promise';
import {hasRequiredValue,stageRequirementsMet,validStageRequirements} from './stage-requirements.js';
const connection=(answers:unknown[])=>({execute:async()=>[answers.shift()]} as unknown as PoolConnection);
describe('stage entry requirements',()=>{
 it('accepts false/zero and rejects missing/null/blank values',()=>{
  expect([false,0,'0',' no '].every(hasRequiredValue)).toBe(true);
  expect([undefined,null,'',' \t'].some(hasRequiredValue)).toBe(false);
 });
 it('preserves unguarded historical definitions without storage reads',async()=>{
  expect(await stageRequirementsMet(connection([]),'t','s')).toBe(true);
 });
 it('requires all configured fields without truthiness or prototype fallback',async()=>{
  expect(await stageRequirementsMet(connection([[{values_json:{approved:false,count:0}}]]),'t','s',{fields:['approved','count']})).toBe(true);
  for(const values of [{approved:''},{approved:null},{}])expect(await stageRequirementsMet(connection([[{values_json:JSON.stringify(values)}]]),'t','s',{fields:['approved']})).toBe(false);
  expect(await stageRequirementsMet(connection([[{values_json:{}}]]),'t','s',{fields:['constructor']})).toBe(false);
 });
 it('does not combine evidence from distinct needs',async()=>{
  const facts=[{need_id:'a',milestone_key:'one'},{need_id:'b',milestone_key:'two'}];
  expect(await stageRequirementsMet(connection([facts]),'t','s',{milestones:['one','two']})).toBe(false);
  expect(await stageRequirementsMet(connection([[...facts,{need_id:'a',milestone_key:'two'}]]),'t','s',{milestones:['one','two']})).toBe(true);
 });
 it('requires a need and rejects absent effective evidence',async()=>{
  expect(await stageRequirementsMet(connection([[]]),'t','s',{need:true})).toBe(false);
  expect(await stageRequirementsMet(connection([[{id:'n'}],[]]),'t','s',{need:true,milestones:['one']})).toBe(false);
 });
 it('keeps intake enterable and rejects dangling milestone references',()=>{
  const d={stages:[{key:'new',label:'New'},{key:'next',label:'Next',requirements:{need:true,milestones:['one']}}],milestones:[{key:'one',label:'One'}]};
  expect(validStageRequirements(d)).toBe(true);
  expect(validStageRequirements({...d,stages:[d.stages[1]!,d.stages[0]!]})).toBe(false);
  expect(validStageRequirements({...d,milestones:[]})).toBe(false);
 });
});
