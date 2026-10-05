/* Generated private runtime protocol. Do not edit. */

export type RuntimeToolCall =
  | {
      call_id: string;
      tool: "crm.read_contact";
      arguments: {
        contact_id: string;
      };
    }
  | {
      call_id: string;
      tool: "qualification.save";
      arguments: {
        qualification: RuntimeDraft;
      };
    }
  | {
      call_id: string;
      tool: "conversation.propose_reply";
      arguments: {
        text: string;
      };
    }
  | {
      call_id: string;
      tool: "routing.request_human";
      arguments: {
        reason: "request_human";
      };
    };

export interface RuntimeDraft {
  service_interest?: string;
  need_summary?: string;
  preferred_contact_method?: "phone" | "messenger";
  phone?: string;
}
