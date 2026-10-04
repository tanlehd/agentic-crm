/* Generated. Do not edit. */

export interface ConversationIntent {
  id: string;
  conversation_id: string;
  message_id: string;
  status: "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  provider_message_id: string | null;
  error_code: string | null;
}
