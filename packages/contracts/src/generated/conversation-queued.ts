/* Generated. Do not edit. */

export interface ConversationQueued {
  id: string;
  conversation_id: string;
  message_id: string;
  status: "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  status_url: string;
  provider_message_id?: string | null;
  error_code?: string | null;
}
