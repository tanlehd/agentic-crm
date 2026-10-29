import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalJSON,parseExact,canonical,chunkHash,rowHash,keyset} from '../lib/chat-exact.mjs';
test('lossless JSON keeps integers beyond2^53 and exact decimal tokens',()=>{
 assert.equal(canonicalJSON('{"z":9007199254740993,"a":1.23000000000000000001,"zero":-0.0}'),'{"a":1.23000000000000000001,"z":9007199254740993,"zero":0}');
 assert.notEqual(canonicalJSON('9007199254740993'),canonicalJSON('9007199254740992'));
 assert.equal(canonicalJSON('1.2e3'),'1200');assert.equal(canonicalJSON('1e-3'),'0.001');
 assert.throws(()=>canonicalJSON('1e10001'),/RANGE/);
});
test('JSON hashes sort codepoints, preserve arrays, Unicode and nulls',()=>{
 assert.equal(canonicalJSON('{"b":[2,1],"a":null}'),'{"a":null,"b":[2,1]}');
 assert.notEqual(canonicalJSON('"é"'),canonicalJSON('"é"'));
 assert.equal(canonicalJSON('{"𐀀":1,"":2}'),'{"":2,"𐀀":1}');
 assert.equal(canonical(parseExact('1.2300')),'1.23');
});
test('typed row hash includes generated, null, microseconds and exact numeric strings',()=>{
 const t={columns:[{name:'n',type:'bigint unsigned'},{name:'at',type:'datetime(6)'},{name:'json',type:'json'}]},row={n:'9007199254740993',at:'2026-10-18 00:00:00.123456',json:'{"big":9007199254740993}'};
 assert.notEqual(rowHash(t,row),rowHash(t,{...row,n:'9007199254740992'}));
 assert.notEqual(rowHash(t,row),rowHash(t,{...row,at:'2026-10-18 00:00:00.123000'}));
 assert.notEqual(chunkHash(t,[row,row]),chunkHash(t,[row]));
 assert.equal(chunkHash(t,[row]),chunkHash(t,[{...row}]));
});
test('full composite keyset is bound, never interpolated or deep OFFSET',()=>{
 assert.deepEqual(keyset(['tenant_id','version'],['tenant','9007199254740993']),{sql:' WHERE (`tenant_id`>?) OR (`tenant_id`=? AND `version`>?)',args:['tenant','tenant','9007199254740993']});
 assert.deepEqual(keyset(['id']),{sql:'',args:[]});
});
