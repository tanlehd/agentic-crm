/* Generated. Do not edit. */

export interface ChatflowSession {
  data: {
    id: string;
    version: string;
    version_id: string;
    parent_run_id: string;
    conversation_id: string;
    status: "running" | "waiting_message" | "paused_human" | "completed" | "failed" | "cancelled";
    node_key: string;
    owner_revision: string;
    outcome: "qualified" | "disqualified" | "needs_attention" | null;
    error_code: string | null;
    lead_id: string | null;
    draft: {
      service_interest?: string;
      need_summary?: string;
      preferred_contact_method?: "messenger" | "phone";
      phone?: string | null;
    };
    variables: {
      service_interest?: string;
      need_summary?: string;
      preferred_contact_method?: "messenger" | "phone";
      phone?: string | null;
      contact_permission?: boolean;
    };
    provenance: {
      service_interest?:
        | {
            kind: "message";
            message_id: string;
            node_key: string;
          }
        | {
            kind: "human";
            principal_id: string;
          };
      need_summary?:
        | {
            kind: "message";
            message_id: string;
            node_key: string;
          }
        | {
            kind: "human";
            principal_id: string;
          };
      preferred_contact_method?:
        | {
            kind: "message";
            message_id: string;
            node_key: string;
          }
        | {
            kind: "human";
            principal_id: string;
          };
      phone?:
        | {
            kind: "message";
            message_id: string;
            node_key: string;
          }
        | {
            kind: "human";
            principal_id: string;
          };
      contact_permission?:
        | {
            kind: "message";
            message_id: string;
            node_key: string;
          }
        | {
            kind: "human";
            principal_id: string;
          };
    };
    can_complete: boolean;
    nodes: {
      node_key: string;
      status: "pending" | "running" | "waiting" | "succeeded" | "cancelled";
      invalid_attempts: number;
    }[];
    turns: {
      message_id: string;
      node_key: string;
      status: "validated" | "invalid" | "runtime";
    }[];
  } | null;
  meta: {
    correlation_id: string;
  };
}
