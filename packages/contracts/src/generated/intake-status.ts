/* Generated. Do not edit. */

export interface IntakeStatus {
  id: string;
  connection_id: string;
  status: "received" | "processed" | "failed";
  attempts: number;
  error_code: string | null;
  conversation_id: string | null;
  message_id: string | null;
  duplicate: boolean;
  attribution: "unknown" | "ctm";
  received_at: string;
  processed_at: string | null;
}
