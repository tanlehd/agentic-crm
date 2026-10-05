/* Generated. Do not edit. */

export interface ChatflowGraph {
  entry_node: string;
  /**
   * @minItems 1
   * @maxItems 30
   */
  nodes: [
    (
      | {
          key: string;
          type: "send_prompt";
          config: {
            text: string;
            /**
             * @maxItems 5
             */
            variable_refs:
              | []
              | ["service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"]
              | [
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"
                ]
              | [
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"
                ]
              | [
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"
                ]
              | [
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"
                ];
          };
          next: string;
        }
      | {
          key: string;
          type: "collect";
          config:
            | {
                variable_key: "service_interest";
                value_type: "string";
                required: true;
                prompt: string;
              }
            | {
                variable_key: "need_summary";
                value_type: "string";
                required: true;
                prompt: string;
              }
            | {
                variable_key: "preferred_contact_method";
                value_type: "enum";
                required: true;
                prompt: string;
                /**
                 * @minItems 2
                 * @maxItems 2
                 */
                choices: ["messenger" | "phone", "messenger" | "phone"];
              }
            | {
                variable_key: "phone";
                value_type: "string";
                required: boolean;
                prompt: string;
              }
            | {
                variable_key: "contact_permission";
                value_type: "boolean";
                required: true;
                prompt: string;
              };
          next: string;
        }
      | {
          key: string;
          type: "invoke_agent";
          config: {
            instruction: "ask_need" | "ask_contact_method" | "confirm_contact_permission";
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
          };
          next: string;
        }
      | {
          key: string;
          type: "validate_qualification";
          config: {
            on_valid: string;
            on_invalid: string;
          };
        }
      | {
          key: string;
          type: "upsert_lead";
          config: {};
          next: string;
        }
      | {
          key: string;
          type: "request_human";
          config: {
            reason: "request_human" | "invalid_answers" | "qualification_incomplete";
            target_chat_team: string;
          };
          next: string;
        }
      | {
          key: string;
          type: "end";
          config: {
            outcome: "qualified" | "disqualified" | "needs_attention";
          };
        }
    ),
    ...(
      | {
          key: string;
          type: "send_prompt";
          config: {
            text: string;
            /**
             * @maxItems 5
             */
            variable_refs:
              | []
              | ["service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"]
              | [
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"
                ]
              | [
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"
                ]
              | [
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"
                ]
              | [
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission",
                  "service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission"
                ];
          };
          next: string;
        }
      | {
          key: string;
          type: "collect";
          config:
            | {
                variable_key: "service_interest";
                value_type: "string";
                required: true;
                prompt: string;
              }
            | {
                variable_key: "need_summary";
                value_type: "string";
                required: true;
                prompt: string;
              }
            | {
                variable_key: "preferred_contact_method";
                value_type: "enum";
                required: true;
                prompt: string;
                /**
                 * @minItems 2
                 * @maxItems 2
                 */
                choices: ["messenger" | "phone", "messenger" | "phone"];
              }
            | {
                variable_key: "phone";
                value_type: "string";
                required: boolean;
                prompt: string;
              }
            | {
                variable_key: "contact_permission";
                value_type: "boolean";
                required: true;
                prompt: string;
              };
          next: string;
        }
      | {
          key: string;
          type: "invoke_agent";
          config: {
            instruction: "ask_need" | "ask_contact_method" | "confirm_contact_permission";
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
          };
          next: string;
        }
      | {
          key: string;
          type: "validate_qualification";
          config: {
            on_valid: string;
            on_invalid: string;
          };
        }
      | {
          key: string;
          type: "upsert_lead";
          config: {};
          next: string;
        }
      | {
          key: string;
          type: "request_human";
          config: {
            reason: "request_human" | "invalid_answers" | "qualification_incomplete";
            target_chat_team: string;
          };
          next: string;
        }
      | {
          key: string;
          type: "end";
          config: {
            outcome: "qualified" | "disqualified" | "needs_attention";
          };
        }
    )[]
  ];
}
