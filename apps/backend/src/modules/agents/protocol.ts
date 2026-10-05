import { Ajv } from 'ajv';
import { runtimeSchema } from '@agentic-crm/contracts';
import { createHash } from 'node:crypto';
import { canonical,CommandError } from '../../kernel/reliability/commands.js';
import { uuid } from '../identity/admin.js';
const ajv=new Ajv({strict:true});
ajv.addFormat('uuid',/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
ajv.addFormat('date-time',(v:string)=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(v)&&Number.isFinite(Date.parse(v)));
ajv.addSchema(runtimeSchema,'runtime');
const requestValidator=ajv.compile({$ref:'runtime#/definitions/runtime-request'}),resultValidator=ajv.compile({$ref:'runtime#/definitions/runtime-result'});
export function validateRequest(value:RuntimeRequest){if(!requestValidator(value))throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');}
export const tools=['crm.read_contact','qualification.save','conversation.propose_reply','routing.request_human'] as const;
export type Tool=typeof tools[number];
export interface ToolCall {call_id:string;tool:Tool;arguments:Record<string,unknown>}
export interface RuntimeRequest {
  execution_id:string;tenant_id:string;principal_id:string;conversation_id:string;session_id:string;owner_revision:string;auth_revision:string;
  policy:{policy_id:string;version:string;allowed_tools:Tool[];max_tool_calls:number;timeout_ms:number};
  context:{messages:{id:string;direction:string;text?:string}[];contact:Record<string,unknown>|null;qualification:Record<string,unknown>;locale:string;timezone:string};
  input:{message_id:string;instruction:string;current_node:string};deadline_at:string;correlation_id:string;
}
export interface RuntimeResult {execution_id:string;status:'completed'|'tool_calls'|'handoff_required'|'failed';proposed_reply?:string;tool_calls?:ToolCall[];handoff_reason?:'request_human';error_code?:'MOCK_FAILURE'}
export interface RuntimeAdapter {execute(request:RuntimeRequest,results?:{call_id:string;result:Record<string,unknown>}[]):Promise<unknown>;cancel(executionId:string,reason:string):Promise<void>}
export const hash=(input:unknown)=>createHash('sha256').update(canonical(input)).digest('hex');
export function exact(value:unknown,keys:string[]):Record<string,any>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');return value as Record<string,any>;}
export function text(value:unknown,max=4000):string{if(typeof value!=='string'||!value.trim()||value.length>max)throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');return value;}
export function draft(value:unknown):Record<string,unknown>{
  const b=exact(value,['service_interest','need_summary','preferred_contact_method','phone']);
  for(const [key,value] of Object.entries(b)){if(key==='preferred_contact_method'){if(!['phone','messenger'].includes(String(value)))throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');}else text(value,key==='service_interest'?255:key==='phone'?32:4000);}return b;
}
export function toolCall(value:unknown):ToolCall{
  const b=exact(value,['call_id','tool','arguments']);if(typeof b.call_id!=='string'||! /^[a-zA-Z0-9_.:-]{1,64}$/.test(b.call_id)||!tools.includes(b.tool))throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');
  const args=exact(b.arguments,b.tool==='crm.read_contact'?['contact_id']:b.tool==='qualification.save'?['qualification']:b.tool==='conversation.propose_reply'?['text']:['reason']);
  if(b.tool==='crm.read_contact'){if(!uuid(args.contact_id))throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');}else if(b.tool==='qualification.save')draft(args.qualification);else if(b.tool==='conversation.propose_reply')text(args.text);else if(args.reason!=='request_human')throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');
  return b as ToolCall;
}
export function result(value:unknown,execution:string):RuntimeResult{
  if(!resultValidator(value))throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');
  const b=exact(value,['execution_id','status','proposed_reply','tool_calls','handoff_reason','error_code']);if(b.execution_id!==execution||!uuid(execution)||!['completed','tool_calls','handoff_required','failed'].includes(b.status))throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');
  const fields=b.status==='completed'?['execution_id','status','proposed_reply']:b.status==='tool_calls'?['execution_id','status','tool_calls']:b.status==='handoff_required'?['execution_id','status','handoff_reason']:['execution_id','status','error_code'];exact(b,fields);
  if(b.proposed_reply!==undefined)text(b.proposed_reply);
  if(b.status==='tool_calls'){if(!Array.isArray(b.tool_calls)||b.tool_calls.length<1||b.tool_calls.length>5)throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');b.tool_calls=b.tool_calls.map(toolCall);if(new Set(b.tool_calls.map((c:ToolCall)=>c.call_id)).size!==b.tool_calls.length)throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');}
  if(b.status==='handoff_required'&&b.handoff_reason!=='request_human'||b.status==='failed'&&b.error_code!=='MOCK_FAILURE')throw new CommandError(422,'RUNTIME_PROTOCOL_INVALID');return b as RuntimeResult;
}
// Administrative deterministic prompts. No flags, permissions or behavior inferred from message text.
export class DeterministicMock implements RuntimeAdapter {
  async execute(request:RuntimeRequest):Promise<RuntimeResult>{return {execution_id:request.execution_id,status:'completed',proposed_reply:request.input.instruction==='confirm_contact_permission'?'Bạn có đồng ý để bộ phận tư vấn liên hệ về nhu cầu này không?':request.input.instruction==='ask_contact_method'?'Bạn muốn được liên hệ qua Messenger hay điện thoại?':'Bạn đang quan tâm dịch vụ nào và cần hỗ trợ điều gì?'};}
  async cancel(_executionId:string,_reason:string):Promise<void>{}
}
