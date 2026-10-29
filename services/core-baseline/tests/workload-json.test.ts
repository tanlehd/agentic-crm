import {it,expect} from 'vitest';
import {strictJson} from '../src/kernel/transport/workload-json.js';
it('rejects duplicate decoded keys at any depth and malformed UTF8',()=>{
 for(const value of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','{"a":[{"b":1,"b":2}]}','{"a":1,}','{}garbage','[]','null','{"a":01}','{"a":NaN}','{"a":true false}'])expect(()=>strictJson(Buffer.from(value))).toThrow();
 expect(()=>strictJson(Buffer.from([0x7b,0x22,0xff,0x22,0x3a,0x31,0x7d]))).toThrow();
 expect(()=>strictJson(Buffer.from('{"a":'+ '['.repeat(65)+'1'+']'.repeat(65)+'}'))).toThrow();
});
it('preserves valid JSON escaping, Unicode, nested objects, arrays and exponent numbers',()=>{
 const value={a:'quote" slash\\ newline\n Việt Nam',b:[true,false,null,{},[],1.2e-8],c:{a:1}};
 expect(strictJson(Buffer.from(JSON.stringify(value)))).toEqual(value);
 expect(strictJson(Buffer.from('{"__proto__":{"polluted":true},"a":1}'))).toEqual(JSON.parse('{"__proto__":{"polluted":true},"a":1}'));
 expect(({} as {polluted?:boolean}).polluted).toBeUndefined();
});
