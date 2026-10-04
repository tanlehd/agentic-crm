/* Generated. Do not edit. */

export interface CrmLeadQualify {
  qualification: {
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
}
