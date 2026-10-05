/* Generated private runtime protocol. Do not edit. */

export type RuntimeResult =
  | {
      execution_id: string;
      status: "completed";
      proposed_reply?: string;
    }
  | {
      execution_id: string;
      status: "tool_calls";
      /**
       * @minItems 1
       * @maxItems 5
       */
      tool_calls:
        | [RuntimeToolCall]
        | [RuntimeToolCall, RuntimeToolCall]
        | [RuntimeToolCall, RuntimeToolCall, RuntimeToolCall]
        | [RuntimeToolCall, RuntimeToolCall, RuntimeToolCall, RuntimeToolCall]
        | [RuntimeToolCall, RuntimeToolCall, RuntimeToolCall, RuntimeToolCall, RuntimeToolCall];
    }
  | {
      execution_id: string;
      status: "handoff_required";
      handoff_reason: "request_human";
    }
  | {
      execution_id: string;
      status: "failed";
      error_code: "MOCK_FAILURE";
    };
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
