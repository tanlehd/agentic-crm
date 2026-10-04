/* Generated. Do not edit. */

export interface ConversationTimeline {
  data: ConversationMessage[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
export interface ConversationMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  text?: string;
  status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  provider_message_id: string | null;
  outbound_intent_id: string | null;
  occurred_at: string;
  received_at: string;
}
