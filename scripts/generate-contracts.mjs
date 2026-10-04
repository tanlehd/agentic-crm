import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';
import openapiTS, { astToString } from 'openapi-typescript';

const check = process.argv.includes('--check');
const schema = JSON.parse(await readFile('packages/contracts/schemas/health.json', 'utf8'));
const { $schema: dialect, ...health } = schema;
const spec = {
  openapi: '3.1.0',
  info: { title: 'Agentic CRM foundation API', version: '0.0.1', description: 'Health and OIDC session transport. Tenant/business APIs are not implemented.' },
  paths: {
    '/api/v1/health/live': { get: { operationId: 'getLiveness', responses: { 200: { description: 'Process alive', content: { 'application/json': { schema: { type: 'object', required: ['status', 'service'], properties: { status: { const: 'ok' }, service: { enum: ['api', 'worker'] } } } } } } } } },
    '/api/v1/health/ready': { get: { operationId: 'getReadiness', responses: Object.fromEntries([200, 503].map(status => [status, { description: status === 200 ? 'Infrastructure connected; business schema not yet implemented' : 'Infrastructure unavailable or not configured', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } } }])) } },
  },
  components: { schemas: { HealthResponse: health } },
};
const authSchemas = {};
for (const name of ['auth-session', 'auth-csrf', 'auth-error']) {
  const schema = JSON.parse(await readFile(`packages/contracts/schemas/${name}.json`, 'utf8'));
  authSchemas[name] = schema;
  const { $schema, ...wire } = schema;
  spec.components.schemas[schema.title] = wire;
}
const response = (title, description) => ({ description, content: { 'application/json': { schema: { $ref: `#/components/schemas/${title}` } } } });
const errors = Object.fromEntries([400, 401, 403, 503].map(status => [status, response('AuthErrorResponse', 'Sanitized auth failure')]));
spec.components.securitySchemes = { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'crm_session' } };
const authGet = (operationId, title) => ({ get: { operationId, security: [{ sessionCookie: [] }], responses: { 200: response(title, 'Current session'), ...errors } } });
spec.paths['/auth/session'] = authGet('getAuthSession', 'AuthSessionResponse');
spec.paths['/auth/csrf'] = authGet('getAuthCsrf', 'AuthCsrfResponse');
spec.paths['/auth/login'] = { get: { operationId: 'login', parameters: [{ name: 'return_to', in: 'query', schema: { type: 'string', maxLength: 2048 }, description: 'Safe same-origin path only' }], responses: { 302: { description: 'OIDC authorization redirect; HttpOnly login cookie' }, ...errors } } };
spec.paths['/auth/callback'] = { get: { operationId: 'callback', parameters: ['code', 'state', 'error'].map(name => ({ name, in: 'query', schema: { type: 'string' } })), responses: { 303: { description: 'Session rotated; redirect to validated return_to' }, ...errors } } };
spec.paths['/auth/logout'] = { post: { operationId: 'logout', security: [{ sessionCookie: [] }], parameters: ['Origin', 'X-CSRF-Token'].map(name => ({ name, in: 'header', required: true, schema: { type: 'string' } })), responses: { 204: { description: 'Local session revoked; cookie cleared' }, ...errors } } };
const identity = JSON.parse(await readFile('packages/contracts/schemas/identity-admin.json', 'utf8'));
for (const [name, definition] of Object.entries(identity.definitions)) {
  spec.components.schemas[name] = JSON.parse(JSON.stringify(definition).replaceAll('#/definitions/', '#/components/schemas/'));
}
const tenantHeader = {name:'X-Tenant-Id',in:'header',required:true,schema:{type:'string',format:'uuid'}};
const mutationHeaders = ['Origin','X-CSRF-Token','Idempotency-Key'].map(name=>({name,in:'header',required:true,schema:{type:'string'}}));
const adminErrors = Object.fromEntries([400,401,403,404,409,422,428,503].map(status=>[status,response('AuthErrorResponse','Sanitized identity failure')]));
const listParams = [{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:50}},{name:'cursor',in:'query',schema:{type:'string'}}];
for (const route of ['memberships','teams','roles','ai-agents','principals']) {
  if (route !== 'principals') spec.paths[`/api/v1/admin/${route}`] = {
    get:{operationId:`list-${route}`,security:[{sessionCookie:[]}],parameters:[tenantHeader,...listParams,...(route==='memberships'?[{name:'status',in:'query',schema:{enum:['invited','active','suspended']}}]:[])],responses:{200:response(`${route}-list`,'Authorized collection'),...adminErrors}},
    post:{operationId:`create-${route}`,security:[{sessionCookie:[]}],parameters:[tenantHeader,...mutationHeaders],requestBody:{required:true,content:{'application/json':{schema:{$ref:`#/components/schemas/${route}-create`}}}},responses:{201:{...response(`${route}-response`,'Created atomically'),headers:{ETag:{schema:{type:'string'}}}},...adminErrors}},
  };
  spec.paths[`/api/v1/admin/${route}/{id}`]={patch:{operationId:`patch-${route}`,security:[{sessionCookie:[]}],parameters:[tenantHeader,...mutationHeaders,{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}},{name:'If-Match',in:'header',required:true,schema:{type:'string'}}],requestBody:{required:true,content:{'application/json':{schema:{$ref:`#/components/schemas/${route}-patch`}}}},responses:{200:{...response(`${route}-response`,'Updated atomically'),headers:{ETag:{schema:{type:'string'}}}},...adminErrors}}};
}
spec.paths['/api/v1/me/memberships']={get:{operationId:'listMyMemberships',security:[{sessionCookie:[]}],parameters:listParams,responses:{200:response('my-membership-list','Active memberships of session account'),...adminErrors}}};
spec.info.description='Health, OIDC session and tenant Identity admin APIs. CRM business APIs are not implemented.';
const registry = JSON.parse(await readFile('packages/contracts/schemas/registry.json','utf8'));
for(const [name,definition] of Object.entries(registry.definitions))spec.components.schemas[name]=JSON.parse(JSON.stringify(definition).replaceAll('#/definitions/','#/components/schemas/'));
for(const [route,kind] of [['object-types','object'],['association-types','type'],['associations','association']]){
  spec.paths[`/api/v1/${route}`]={post:{operationId:`registry-create-${kind}`,security:[{sessionCookie:[]}],parameters:[tenantHeader,...mutationHeaders,...(kind==='association'?[{name:'If-Match',in:'header',required:true,description:'Source record version',schema:{type:'string'}}]:[])],requestBody:{required:true,content:{'application/json':{schema:{$ref:`#/components/schemas/registry-${kind}-create`}}}},responses:{201:response(`registry-${kind}-response`,'Created atomically'),...adminErrors}}};
  const get={operationId:`registry-list-${kind}`,security:[{sessionCookie:[]}],parameters:[tenantHeader,...listParams,...(kind==='association'?[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}]:[])],responses:{200:response(`registry-${kind}-list`,'Authorized collection'),...adminErrors}};
  if(kind==='association')spec.paths['/api/v1/records/{id}/associations']={get};else spec.paths[`/api/v1/${route}`].get=get;
}
spec.info.description='Health, OIDC, Identity admin and CRM registry metadata/association APIs. Record CRUD remains in subsequent tasks.';
const crmRecords=JSON.parse(await readFile('packages/contracts/schemas/crm-records.json','utf8'));
for(const [name,definition] of Object.entries(crmRecords.definitions))spec.components.schemas[name]=JSON.parse(JSON.stringify(definition).replaceAll('#/definitions/','#/components/schemas/'));
const crmRoutes=[
  ['get','crm/context',null,'context-response'],['get','objects/{key}/descriptor',null,'descriptor-response'],
  ['get','leads',null,'record-list'],['get','leads/{id}',null,'record-response'],['post','leads','lead-create','record-response'],['post','leads/{id}/qualification','lead-qualify','record-response',true],['post','leads/{id}/disqualify','lead-disqualify','record-response',true],
  ['get','object-types/{key}/properties',null,'property-list'],['post','object-types/{key}/properties','property-create','property-response',true],
  ['patch','object-types/{key}/properties/{id}','property-patch','property-response',true],
  ...['form','view'].flatMap(k=>[['get',`object-types/{key}/${k}s/{id}`,null,`${k}-response`],['put',`object-types/{key}/${k}s/{id}`,`${k}-put`,`${k}-response`,'optional']]),
  ['get','objects/{key}/records',null,'record-list'],['get','objects/{key}/records/{id}',null,'record-response'],
  ['post','objects/{key}/records','record-create','record-response'],['patch','objects/{key}/records/{id}','record-patch','record-response',true],
  ['post','objects/{key}/records/{id}/archive','archive','record-response',true],
];
for(const [method,path,input,output,match] of crmRoutes){
  const parameters=[tenantHeader,...[...path.matchAll(/\{(\w+)\}/g)].map(m=>({name:m[1],in:'path',required:true,schema:{type:'string'}})),...(input?mutationHeaders:[]),...(match?[{name:'If-Match',in:'header',required:match===true,schema:{type:'string'}}]:[])];
  if(output==='record-list')parameters.push(...listParams,...['filter','sort','owner','team',...(path==='leads'?['status']:[])].map(name=>({name,in:'query',schema:{type:'string'},description:'JSON encoded typed query'})));
  const responses={...adminErrors};for(const status of method==='post'&&!['archive','lead-qualify','lead-disqualify'].includes(input)?[201]:method==='put'?[200,201]:[200])responses[status]=response(`crm-${output}`,'Authorized CRM result');
  (spec.paths[`/api/v1/${path}`]??={})[method]={operationId:`crm-${method}-${path.replaceAll(/[{}]/g,'').replaceAll('/','-')}`,security:[{sessionCookie:[]}],parameters,...(input?{requestBody:{required:true,content:{'application/json':{schema:{$ref:`#/components/schemas/crm-${input}`}}}}}:{}),responses};
}
spec.info.description='Health, OIDC, Identity, CRM registry and metadata, standard records and Lead qualification APIs.';
const conversations=JSON.parse(await readFile('packages/contracts/schemas/conversation.json','utf8'));
for(const [name,definition] of Object.entries(conversations.definitions))spec.components.schemas[name]=JSON.parse(JSON.stringify(definition).replaceAll('#/definitions/','#/components/schemas/'));
for(const [method,path,input,output] of [
  ['get','conversations',null,'list'],['get','conversations/{id}',null,'response'],['get','conversations/{id}/messages',null,'timeline'],
  ['get','conversations/{id}/outbound-intents/{intentId}',null,'intent-response'],['post','conversations/{id}/messages','send','send-response'],
  ['post','conversations/{id}/notes','note','note-response'],['post','conversations/{id}/transition','transition','response'],
]){
  const parameters=[tenantHeader,...[...path.matchAll(/\{(\w+)\}/g)].map(m=>({name:m[1],in:'path',required:true,schema:{type:'string',format:'uuid'}})),...(input?mutationHeaders:[]),...(input==='transition'?[{name:'If-Match',in:'header',required:true,schema:{type:'string'}}]:[])];
  if(['list','timeline'].includes(output))parameters.push(...listParams);
  if(output==='list')parameters.push(...['state','owner','team'].map(name=>({name,in:'query',schema:{type:'string'}})));
  const status=input==='send'?202:input==='note'?201:200;
  (spec.paths[`/api/v1/${path}`]??={})[method]={operationId:`conversation-${method}-${path.replaceAll(/[{}]/g,'').replaceAll('/','-')}`,security:[{sessionCookie:[]}],parameters,...(input?{requestBody:{required:true,content:{'application/json':{schema:{$ref:`#/components/schemas/conversation-${input}`}}}}}:{}),responses:{...adminErrors,[status]:response(`conversation-${output}`,'Authorized Conversation result')}};
}
spec.info.description+=' Conversation text, notes and mock outbound intent APIs.';
const outputs = {
  'packages/contracts/src/generated/health.ts': await compile(schema, 'HealthResponse', { bannerComment: '/* Generated by scripts/generate-contracts.mjs. Do not edit. */', additionalProperties: false }),
  'packages/contracts/openapi.json': JSON.stringify(spec, null, 2) + '\n',
  'packages/contracts/src/generated/api.ts': astToString(await openapiTS(spec)),
};
for(const [name,definition] of Object.entries(conversations.definitions)) outputs[`packages/contracts/src/generated/${name}.ts`]=await compile({...definition,definitions:conversations.definitions},name,{bannerComment:'/* Generated. Do not edit. */'});
for(const [name,definition] of Object.entries(crmRecords.definitions)) outputs[`packages/contracts/src/generated/${name}.ts`]=await compile({...definition,definitions:crmRecords.definitions},name,{bannerComment:'/* Generated. Do not edit. */'});
for (const [name, schema] of Object.entries(authSchemas)) outputs[`packages/contracts/src/generated/${name}.ts`] = await compile(schema, schema.title, { bannerComment: '/* Generated by scripts/generate-contracts.mjs. Do not edit. */', additionalProperties: false });
outputs['packages/contracts/src/generated/identity-schema.ts'] = '/* Generated. Do not edit. */\nexport const identitySchema = '+JSON.stringify(identity,null,2)+';\n';
for (const [name, definition] of Object.entries(identity.definitions)) outputs[`packages/contracts/src/generated/identity-${name}.ts`] = await compile({...definition,definitions:identity.definitions}, name, {bannerComment:'/* Generated. Do not edit. */'});
await mkdir('packages/contracts/src/generated', { recursive: true });
for (const [path, body] of Object.entries(outputs)) {
  if (check) {
    const actual = await readFile(path, 'utf8').catch(() => '');
    if (actual !== body) throw new Error(`Contract drift: ${path}; run pnpm contracts:generate`);
  } else await writeFile(path, body);
}
console.log(check ? 'Generated contracts match schemas.' : 'Generated health/auth types and OpenAPI client types.');
