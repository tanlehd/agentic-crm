/* Generated. Do not edit. */

export interface M2SalesDetail {
  data: {
    record: {
      id: string;
      tenant_id: string;
      object_key: string;
      version: string;
      owner_revision: string;
      owner_principal_id: string | null;
      team_id: string | null;
      archived: boolean;
      fields: {
        [k: string]: unknown;
      };
      custom_values: {
        [k: string]: unknown;
      };
    };
    handoff: {
      id: string;
      status: "pending" | "accepted" | "cancelled";
      due_at: string;
      accepted_at: string | null;
      attention: boolean;
    } | null;
    source: "ctm" | "unknown" | null;
    can_accept: boolean;
    contact: {
      id: string;
      label: string;
    } | null;
    conversation_id: string | null;
  };
  meta: {
    correlation_id: string;
  };
}
