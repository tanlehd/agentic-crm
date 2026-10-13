import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory='docs/references/meta/2026-10-07-marketing';
const base='https://developers.facebook.com/documentation/ads-commerce/marketing-api';
const pages=[
 ['overview','/overview'],['versioning','/overview/versioning'],['authorization','/get-started/authorization'],['rate-limiting','/overview/rate-limiting'],
 ['ad-account','/reference/ad-account'],['campaign','/reference/ad-campaign-group'],['ad-set','/reference/ad-campaign'],['ad','/reference/adgroup'],
 ['creative','/reference/ad-creative'],['targeting','/audiences/reference/advanced-targeting'],['custom-audience','/reference/custom-audience'],
 ['asset-feed-spec','/ad-creative/asset-feed-spec'],['promoted-object','/reference/ad-promoted-object'],['currencies','/currencies'],
 ['click-to-messenger','/ad-creative/messaging-ads/click-to-messenger'],['insights','/insights'],['account-insights','/reference/ad-account/insights'],
 ['insights-breakdowns','/insights/breakdowns'],['asset-insights','/ad-creative/asset-feed-spec/insights'],['advantage-audience','/audiences/reference/targeting-expansion/advantage-audience'],
 ['placement-targeting','/audiences/reference/placement-targeting'],['basic-targeting','/audiences/reference/basic-targeting'],['changelog','/marketing-api-changelog'],['insights-best-practices','/insights/best-practices']
];
const hash=b=>createHash('sha256').update(b).digest('hex');
function decode(s){return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[e.toLowerCase()]));}
await mkdir(directory,{recursive:true});
const sources=[];
const previous=await readFile(directory+'/manifest.json','utf8').then(JSON.parse).catch(()=>({sources:[]}));
for(let start=0;start<pages.length;start+=3){
 const batch=await Promise.all(pages.slice(start,start+3).map(async([key,path])=>{
  const saved=previous.sources.find(s=>s.key===key&&s.status==='DOWNLOADED');if(saved)return saved;
  const url=base+path+'.md',retrieved_at=new Date().toISOString();
  try{
   const response=await fetch(url,{headers:{'Accept-Language':'en-US,en;q=0.9'},signal:AbortSignal.timeout(45000)}),bytes=Buffer.from(await response.arrayBuffer()),body=bytes.toString('utf8');
   const match=body.match(/<pre[^>]*data-testid="developer-docs-markdown-page"[^>]*>([\s\S]*?)<\/pre>/);
   const markdown=match?decode(match[1]):body.startsWith('# ')?body:null;
   if(!response.ok||!markdown)return {key,url,retrieved_at,status:'FAILED',http_status:response.status,reason:'No official Markdown body; not saved as a valid source'};
   const raw_file=key+'.response.html.txt',file=key+'.md.txt';
   await writeFile(directory+'/'+raw_file,bytes);await writeFile(directory+'/'+file,markdown,'utf8');
   return {key,url,final_url:response.url,retrieved_at,status:'DOWNLOADED',http_status:response.status,content_type:response.headers.get('content-type'),file,bytes:Buffer.byteLength(markdown),sha256:hash(markdown),raw_file,raw_bytes:bytes.length,raw_sha256:hash(bytes),format:match?'official Markdown extracted from pre; HTML entities decoded once; raw response preserved':'vendor-markdown',api_version:'unversioned documentation; endpoint field/version verification required'};
  }catch(e){return {key,url,retrieved_at,status:'FAILED',reason:e.message};}
 }));sources.push(...batch);for(const source of batch)console.log(source.key,source.status,source.bytes??source.reason);
}
await writeFile(directory+'/manifest.json',JSON.stringify({provider:'Meta',scope:'Selected Marketing object/field and reporting references; not entire documentation',failed_discovery_attempts:[...(previous.failed_discovery_attempts??[]),...previous.sources.filter(s=>s.status==='FAILED')],sources},null,2)+'\n');
process.exitCode=sources.some(s=>s.status!=='DOWNLOADED')?1:0;
