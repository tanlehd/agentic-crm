/* Generated. Do not edit. */

export interface ConversationAcquisitionSessions {
  data: {
    id: string;
    conversation_id: string;
    sequence: string;
    version: string;
    status: "active" | "closed";
    opening_reason: "first_inbound" | "new_referral" | "after_close";
    close_reason: "agent_closed" | "new_referral" | null;
    opened_at: string;
    opening_occurred_at: string;
    closed_at: string | null;
    source_classification: "organic" | "paid" | "unknown";
    source_channel: string | null;
    source_page_id: string | null;
    source_ad_id: string | null;
    source_campaign_id: string | null;
    source_connection_id: string | null;
    source_touchpoint_id: string | null;
    policy_version: "acquisition_v1";
  }[];
  next_before_sequence: string | null;
  meta: {
    correlation_id: string;
    [k: string]: unknown;
  };
}
