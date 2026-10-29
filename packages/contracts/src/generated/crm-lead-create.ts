/* Generated. Do not edit. */

export interface CrmLeadCreate {
  contact_id: string;
  qualification?: {
    service_interest?: string;
    need_summary?: string;
    contact_permission?: boolean;
    preferred_contact_method?: "messenger" | "phone";
    phone?: string | null;
    consent_evidence?: {
      kind: "manual";
      note: string;
    };
  };
  conversation_id?: string | null;
  declared_source?: null | "referral" | "website" | "facebook" | "phone" | "other";
  conversation_session_id?: string | null;
}
