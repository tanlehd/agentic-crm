import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { normalized } from '../src/modules/channels/normalized.js';
const schema=JSON.parse(readFileSync('packages/contracts/schemas/intake.json','utf8')),ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);const wire=ajv.compile({$ref:`${schema.$id}#/definitions/intake-request`});
const body={provider_event_id:'synthetic-event',provider_message_id:'synthetic-message',external_subject_id:'synthetic-subject',occurred_at:'2026-10-04T00:00:00Z',message:{type:'text',text:'Synthetic'}};
describe('SRC-015 normalized fixture validation',()=>{
  it('canonical UTC normalization and missing/null opaque attribution',()=>{expect(normalized(body).occurred_at).toBe('2026-10-04T00:00:00.000Z');expect(wire(body)).toBe(true);expect(normalized({...body,referral:{source:'ctm',ad_id:null}}).referral).toEqual({source:'ctm',ad_id:null});});
  it('rejects unknown fields, invalid calendar dates, oversized/nontext and spoofed metadata',()=>{
    for(const candidate of [{...body,tenant_id:'spoof'},{...body,message:{type:'image',text:'x'}},{...body,message:{type:'text',text:' '}},{...body,message:{type:'text',text:'x'.repeat(4001)}},{...body,provider_event_id:'x'.repeat(256)},{...body,occurred_at:'2026-02-30T00:00:00Z'},{...body,referral:{source:'ctm',secret:'hidden'}},{...body,display_label:'bad\nlabel'}]){expect(()=>normalized(candidate)).toThrow();expect(wire(candidate)).toBe(false);}
  });
});
