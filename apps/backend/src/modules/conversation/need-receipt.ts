import type {CommandResponse} from '../../kernel/reliability/commands.js';
// Only the known command receipt's top-level identity is adapted; stored JSON is immutable.
export function needReceipt(response:CommandResponse):CommandResponse {
 const {thread_id,...data}=response.body.data;
 return {...response,body:{...response.body,data:{...data,...(thread_id?{conversation_id:data.conversation_id??thread_id}:{})}}};
}
