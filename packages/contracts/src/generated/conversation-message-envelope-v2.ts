/* Generated. Do not edit. */

export interface ConversationMessageEnvelopeV2 {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  text?: string;
  status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  outbound_intent_id: string | null;
  occurred_at: string;
  received_at: string;
  external_msg_id: string | null;
  schema_version: 2;
  connection_id: string;
  platform: "mock_messenger";
  message_type: "text";
  reply_to?: null;
  attachment?: null;
}
