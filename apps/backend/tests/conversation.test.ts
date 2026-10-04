import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe,it,expect } from 'vitest';
import { messageText,revision } from '../src/modules/conversation/domain.js';
const schema=JSON.parse(readFileSync('packages/contracts/schemas/conversation.json','utf8'));
const ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);
describe('Conversation wire validation',()=>{
  it('rejects whitespace, oversize text, spoofed fields and nondecimal revision',()=>{
    const validate=ajv.compile({$ref:`${schema.$id}#/definitions/conversation-send`});
    expect(validate({text:'Synthetic',owner_revision:'1'})).toBe(true);
    for(const input of [{text:' ',owner_revision:'1'},{text:'x'.repeat(4001),owner_revision:'1'},{text:'Synthetic',owner_revision:1},{text:'Synthetic',owner_revision:'1',actor_id:'spoof'}])expect(validate(input)).toBe(false);
    for(const value of ['',null,' ',3,'x'.repeat(4001)])expect(()=>messageText(value)).toThrow('VALIDATION_FAILED');
    for(const value of [null,0,'0','-1','1.2','01'])expect(()=>revision(value)).toThrow('INVALID_REQUEST');
  });
  it('generated response contract keeps unknown distinct from sent and failed',()=>{
    const validate=ajv.compile({$ref:`${schema.$id}#/definitions/conversation-intent`});
    const base={id:'10000000-0000-4000-8000-000000000001',conversation_id:'10000000-0000-4000-8000-000000000002',message_id:'10000000-0000-4000-8000-000000000003',provider_message_id:null,error_code:'DELIVERY_UNKNOWN'};
    expect(validate({...base,status:'unknown'})).toBe(true);expect(validate({...base,status:'delivered'})).toBe(false);
  });
});
