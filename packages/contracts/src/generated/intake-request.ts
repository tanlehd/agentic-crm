/* Generated. Do not edit. */

export interface IntakeRequest {
  provider_event_id: string;
  provider_message_id: string;
  external_subject_id: string;
  occurred_at: string;
  display_label?: string;
  message: {
    type: "text";
    text: string;
  };
  referral?: {
    source: "ctm";
    ad_id?: string | null;
    campaign_id?: string | null;
  };
}
