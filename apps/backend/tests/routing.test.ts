import { describe,it,expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { assignmentInput } from '../src/modules/agents/routing.js';
describe('SRC-017 exact ownership input contract',()=>{
  const schema=JSON.parse(readFileSync(new URL('../../../packages/contracts/schemas/routing.json',import.meta.url),'utf8')),ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);
  it('accepts explicit queue owner and omitted team; takeover is a separate permission command',()=>{for(const [value,takeover] of [[{owner_principal_id:null,reason:'manual'},false],[{owner_principal_id:null,team_id:null,reason:'handoff'},false],[{reason:'human_takeover'},true]] as const){expect(assignmentInput(value,takeover)).toEqual(value);expect(ajv.validate({$ref:schema.$id+'#/definitions/routing-'+(takeover?'takeover':'assignment')},value)).toBe(true);}});
  it('rejects arbitrary reason/policy/owner input before command persistence',()=>{for(const value of [{reason:'manual'},{owner_principal_id:'bad',reason:'manual'},{owner_principal_id:null,team_id:'bad',reason:'manual'},{owner_principal_id:null,reason:'customer transcript'},{owner_principal_id:null,reason:'manual',tenant_id:'extra'}]){expect(()=>assignmentInput(value)).toThrow();expect(ajv.validate({$ref:schema.$id+'#/definitions/routing-assignment'},value)).toBe(false);}expect(()=>assignmentInput({reason:'human_takeover',owner_principal_id:null},true)).toThrow();});
});
