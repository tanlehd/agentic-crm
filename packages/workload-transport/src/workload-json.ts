// JSON.parse alone accepts duplicate keys. Scan structure first, comparing decoded keys.
export function strictJson(bytes:Uint8Array):Record<string,unknown>{
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);let at=0;
 const invalid=():never=>{throw new Error('INVALID_REQUEST');};
 const whitespace=()=>{while(/[\x20\t\r\n]/.test(text[at]??'!'))at++;};
 const string=():string=>{
  const start=at++;while(at<text.length){const char=text[at++];if(char==='"')return JSON.parse(text.slice(start,at)) as string;if(char==='\\')at++;}return invalid();
 };
 const value=(depth:number):void=>{
  if(depth>64)invalid();whitespace();const char=text[at];
  if(char==='"'){string();return;}
  if(char==='{'||char==='['){at++;whitespace();const end=char==='{'?'}':']',keys=new Set<string>();if(text[at]===end){at++;return;}
   while(at<text.length){if(char==='{'){if(text[at]!=='"')invalid();const key=string();if(keys.has(key))invalid();keys.add(key);whitespace();if(text[at++]!==':')invalid();}
    value(depth+1);whitespace();if(text[at]===end){at++;return;}if(text[at++]!==',')invalid();whitespace();}
   return invalid();
  }
  const match=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(at));if(!match)return invalid();at+=match[0].length;
 };
 value(0);whitespace();if(at!==text.length)invalid();const parsed:unknown=JSON.parse(text);
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return invalid();return parsed as Record<string,unknown>;
}
