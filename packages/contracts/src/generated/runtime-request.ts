/* Generated private runtime protocol. Do not edit. */

export interface RuntimeRequest {
  execution_id: string;
  tenant_id: string;
  principal_id: string;
  conversation_id: string;
  session_id: string;
  owner_revision: string;
  auth_revision: string;
  policy: {
    policy_id: string;
    version: string;
    /**
     * @maxItems 4
     */
    allowed_tools:
      | []
      | ["crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human"]
      | [
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human",
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human"
        ]
      | [
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human",
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human",
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human"
        ]
      | [
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human",
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human",
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human",
          "crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human"
        ];
    max_tool_calls: number;
    timeout_ms: number;
  };
  context: {
    /**
     * @maxItems 20
     */
    messages:
      | []
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ]
      | [
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          },
          {
            id: string;
            direction: "inbound" | "outbound";
            text?: string;
          }
        ];
    contact: {
      id?: string;
      display_name?: string;
      normalized_phone?: string | null;
      normalized_email?: string | null;
    } | null;
    qualification: RuntimeDraft;
    locale: string;
    timezone: string;
  };
  input: {
    message_id: string;
    instruction: "ask_need" | "ask_contact_method" | "confirm_contact_permission";
    current_node: string;
  };
  deadline_at: string;
  correlation_id: string;
}
export interface RuntimeDraft {
  service_interest?: string;
  need_summary?: string;
  preferred_contact_method?: "phone" | "messenger";
  phone?: string;
}
