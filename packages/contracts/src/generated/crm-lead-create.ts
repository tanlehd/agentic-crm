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
  conversation_id?: null;
  qualification_session_id?: null;
}
