import {createHash} from 'node:crypto';
export const sha=v=>createHash('sha256').update(v).digest('hex');
const number=Symbol('exact-json-number');
// JSON.parse's source context (Node24) retains the original numeric token even
// when the temporary JS Number is rounded. Business numbers never use that value.
function decimal(token){
 const m=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
 if(!m)throw new Error('JSON_NUMBER_INVALID');
 const exp=Number(m[4]??0)-(m[3]?.length??0);if(!Number.isSafeInteger(exp)||Math.abs(exp)>10000)throw new Error('JSON_NUMBER_RANGE');
 let digits=(m[2]+(m[3]??'')).replace(/^0+/,'');if(!digits)return '0';
 let scale=exp;while(digits.endsWith('0')){digits=digits.slice(0,-1);scale++;}
 const at=digits.length+scale;
 return m[1]+(scale>=0?digits+'0'.repeat(scale):at>0?digits.slice(0,at)+'.'+digits.slice(at):'0.'+'0'.repeat(-at)+digits);
}
export function parseExact(raw){return JSON.parse(raw,(_key,value,context)=>typeof value==='number'?{[number]:decimal(context.source)}:value);}
const compare=(a,b)=>{const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));for(let n=0;n<Math.min(x.length,y.length);n++)if(x[n]!==y[n])return x[n]-y[n];return x.length-y.length;};
export function canonical(v){
 if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
 if(typeof v==='number'){if(!Number.isSafeInteger(v))throw new Error('UNSAFE_CANONICAL_NUMBER');return String(v);}
 if(v?.[number]!==undefined)return v[number];
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(typeof v==='object')return '{'+Object.keys(v).sort(compare).map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 throw new Error('CANONICAL_VALUE_INVALID');
}
export const canonicalJSON=raw=>canonical(parseExact(raw));
export function rowHash(table,row){return sha(canonical(table.columns.map(c=>({name:c.name,type:c.type,value:row[c.name]===null?null:/^json$/i.test(c.type)?parseExact(row[c.name]):row[c.name]}))));}
export function chunkHash(table,rows){const hash=createHash('sha256');for(const row of rows){const size=Buffer.alloc(4);size.writeUInt32BE(64);hash.update(size).update(rowHash(table,row),'ascii');}return hash.digest('hex');}
export const tableHash=chunks=>sha(canonical(chunks.map(c=>({chunk_number:String(c.number),row_count:String(c.count),chunk_hash:c.hash}))));
export const q=value=>{if(!/^[a-z][a-z0-9_]{0,63}$/.test(value))throw new Error('IDENTIFIER_DENIED');return '`'+value+'`';};
export const projection=t=>t.columns.map(c=>(/^(?:varbinary|binary|blob)/i.test(c.type)?`HEX(${q(c.name)})`:`CAST(${q(c.name)} AS CHAR CHARACTER SET utf8mb4)`)+` AS ${q(c.name)}`).join(',');
export const primary=t=>t.keys.find(k=>k.name==='PRIMARY').columns.map(c=>c.name);
export function keyset(keys,last){
 if(!last)return {sql:'',args:[]};const args=[];
 const sql=keys.map((key,n)=>'('+keys.slice(0,n).map((k,i)=>{args.push(last[i]);return q(k)+'=?';}).concat((args.push(last[n]),q(key)+'>?')).join(' AND ')+')').join(' OR ');
 return {sql:' WHERE '+sql,args};
}
