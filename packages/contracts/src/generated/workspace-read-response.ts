/* Generated. Do not edit. */

export interface WorkspaceReadResponse {
  data: WorkspaceReadState;
  meta: {
    correlation_id: string;
    as_of?: string;
  };
}
export interface WorkspaceReadState {
  conversation_id: string;
  last_read_inbound_seq: string;
  latest_inbound_seq: string;
  unread_message_count: string;
  read_state_revision: string;
}
