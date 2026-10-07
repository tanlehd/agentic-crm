/* Generated. Do not edit. */

export interface ConversationResponse {
  data: ConversationEntity;
  meta: {
    correlation_id: string;
  };
}
export interface ConversationEntity {
  id: string;
  contact_id: string;
  contact_identity_id: string;
  connection_id: string;
  status: "open" | "pending" | "closed";
  /**
   * Response assessment: inbound is null until assessed; confirmed sent coverage is false; true requires a valid Assist assessment.
   */
  need_response?: boolean | null;
  opened_at: string;
  closed_at: string | null;
  version: string;
  owner_revision: string;
  owner_principal_id: string | null;
  team_id: string | null;
  contact: {
    id?: string;
    display_name?: string;
    normalized_phone?: string | null;
    normalized_email?: string | null;
  } | null;
  attribution?: {
    source: "unknown" | "ctm";
    ad_id: string | null;
    campaign_id: string | null;
  };
  owner_kind?: "human" | "ai" | null;
  allowed_actions?: ("reply" | "note" | "update" | "assign" | "takeover")[];
  latest_message?: {
    id: string;
    text?: string;
    status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
    direction: "inbound" | "outbound";
    received_at: string;
  } | null;
  channel?: "mock_messenger" | "messenger";
  channel_id?: string;
  page_id?: string;
  channel_name?: string;
}
