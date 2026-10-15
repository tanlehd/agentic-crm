import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

it('compiles every Customer360 wire definition, including nested merge previews',()=>{
 const schema=JSON.parse(readFileSync(new URL('../../../packages/contracts/schemas/customer360.json',import.meta.url),'utf8'));
 const ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);
 // Compiling the unused root alone does not discover dangling refs in definitions.
 for(const key of Object.keys(schema.definitions))expect(ajv.getSchema(`customer360#/definitions/${key}`)).toBeTypeOf('function');
 const validate=ajv.getSchema('customer360#/definitions/sales-session-input')!;
 expect(validate({conversation_id:'not-a-uuid',conversation_session_id:'not-a-uuid'})).toBe(false);
 expect(validate({conversation_id:'9b777ea0-d09d-4005-97ca-8cacb9130f38',conversation_session_id:'bc7563bd-3fd2-4c79-94ae-2ca9d544670d',source_ad_id:'spoof'})).toBe(false);
});
