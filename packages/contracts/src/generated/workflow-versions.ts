/* Generated. Do not edit. */

export interface WorkflowVersions {
  data: {
    id: string;
    number: number;
    state: "draft" | "published";
    graph: WorkflowGraph;
    execution_role_id: string;
  }[];
  meta: {
    correlation_id: string;
  };
}
export interface WorkflowGraph {
  trigger: {
    event_type: "conversation.created" | "need.assessed";
    connection_id: string;
  };
  entry_node: string;
  /**
   * @minItems 1
   * @maxItems 50
   */
  nodes: [
    (
      | {
          key: string;
          type: "assign_owner";
          config: {
            record_id:
              | string
              | {
                  ref: string;
                };
            team_id: string;
            capability: "chat" | "sales";
            preference: "human" | "ai" | "any";
          };
          next: string;
        }
      | {
          key: string;
          type: "start_chatflow";
          config: (
            | {
                [k: string]: unknown;
              }
            | {
                [k: string]: unknown;
              }
          ) & {
            conversation_id?:
              | string
              | {
                  ref: string;
                };
            chatflow_version_id: string;
            thread_id?:
              | string
              | {
                  ref: string;
                };
          };
          next: string;
        }
      | {
          key: string;
          type: "request_lead_handoff";
          config: {
            lead_id:
              | string
              | {
                  ref: string;
                };
            target_team_id: string;
          };
          next: string;
        }
      | {
          key: string;
          type: "wait_event";
          config: {
            event_type: "chatflow.completed" | "lead.accepted";
            match_key: {
              ref: string;
            };
            timeout_seconds: number;
          };
          next: string;
          on_timeout: string;
        }
      | {
          key: string;
          type: "wait_timer";
          config: {
            duration_seconds: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "condition";
          config: {
            left:
              | (string | number | boolean | null)
              | {
                  ref: string;
                };
            op: "eq" | "exists";
            right?:
              | (string | number | boolean | null)
              | {
                  ref: string;
                };
            on_true: string;
            on_false: string;
          };
        }
      | {
          key: string;
          type: "end";
          config: {
            outcome: string;
          };
        }
      | {
          key: string;
          type: "read_need";
          config: {
            conversation_id: {
              ref: "trigger.conversation_id";
            };
            session_id: {
              ref: "trigger.session_id";
            };
            need_id: {
              ref: "trigger.need_id";
            };
            assessment_version: {
              ref: "trigger.assessment_version";
            };
          };
          next: string;
        }
      | {
          key: string;
          type: "read_need";
          config: {
            thread_id: {
              ref: "trigger.thread_id";
            };
            session_id: {
              ref: "trigger.session_id";
            };
            need_id: {
              ref: "trigger.need_id";
            };
            assessment_version: {
              ref: "trigger.assessment_version";
            };
          };
          next: string;
        }
      | {
          key: string;
          type: "recover_need";
          config: {
            conversation_id: {
              ref: "trigger.conversation_id";
            };
            session_id: {
              ref: "trigger.session_id";
            };
            need_id: {
              ref: "trigger.need_id";
            };
            assessment_version: {
              ref: "trigger.assessment_version";
            };
            team_id: string;
            preference: "human" | "ai" | "any";
            min_confidence: number;
            cooldown_seconds: number;
            max_age_seconds: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "recover_need";
          config: {
            thread_id: {
              ref: "trigger.thread_id";
            };
            session_id: {
              ref: "trigger.session_id";
            };
            need_id: {
              ref: "trigger.need_id";
            };
            assessment_version: {
              ref: "trigger.assessment_version";
            };
            team_id: string;
            preference: "human" | "ai" | "any";
            min_confidence: number;
            cooldown_seconds: number;
            max_age_seconds: number;
          };
          next: string;
        }
    ),
    ...(
      | {
          key: string;
          type: "assign_owner";
          config: {
            record_id:
              | string
              | {
                  ref: string;
                };
            team_id: string;
            capability: "chat" | "sales";
            preference: "human" | "ai" | "any";
          };
          next: string;
        }
      | {
          key: string;
          type: "start_chatflow";
          config: (
            | {
                [k: string]: unknown;
              }
            | {
                [k: string]: unknown;
              }
          ) & {
            conversation_id?:
              | string
              | {
                  ref: string;
                };
            chatflow_version_id: string;
            thread_id?:
              | string
              | {
                  ref: string;
                };
          };
          next: string;
        }
      | {
          key: string;
          type: "request_lead_handoff";
          config: {
            lead_id:
              | string
              | {
                  ref: string;
                };
            target_team_id: string;
          };
          next: string;
        }
      | {
          key: string;
          type: "wait_event";
          config: {
            event_type: "chatflow.completed" | "lead.accepted";
            match_key: {
              ref: string;
            };
            timeout_seconds: number;
          };
          next: string;
          on_timeout: string;
        }
      | {
          key: string;
          type: "wait_timer";
          config: {
            duration_seconds: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "condition";
          config: {
            left:
              | (string | number | boolean | null)
              | {
                  ref: string;
                };
            op: "eq" | "exists";
            right?:
              | (string | number | boolean | null)
              | {
                  ref: string;
                };
            on_true: string;
            on_false: string;
          };
        }
      | {
          key: string;
          type: "end";
          config: {
            outcome: string;
          };
        }
      | {
          key: string;
          type: "read_need";
          config: {
            conversation_id: {
              ref: "trigger.conversation_id";
            };
            session_id: {
              ref: "trigger.session_id";
            };
            need_id: {
              ref: "trigger.need_id";
            };
            assessment_version: {
              ref: "trigger.assessment_version";
            };
          };
          next: string;
        }
      | {
          key: string;
          type: "read_need";
          config: {
            thread_id: {
              ref: "trigger.thread_id";
            };
            session_id: {
              ref: "trigger.session_id";
            };
            need_id: {
              ref: "trigger.need_id";
            };
            assessment_version: {
              ref: "trigger.assessment_version";
            };
          };
          next: string;
        }
      | {
          key: string;
          type: "recover_need";
          config: {
            conversation_id: {
              ref: "trigger.conversation_id";
            };
            session_id: {
              ref: "trigger.session_id";
            };
            need_id: {
              ref: "trigger.need_id";
            };
            assessment_version: {
              ref: "trigger.assessment_version";
            };
            team_id: string;
            preference: "human" | "ai" | "any";
            min_confidence: number;
            cooldown_seconds: number;
            max_age_seconds: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "recover_need";
          config: {
            thread_id: {
              ref: "trigger.thread_id";
            };
            session_id: {
              ref: "trigger.session_id";
            };
            need_id: {
              ref: "trigger.need_id";
            };
            assessment_version: {
              ref: "trigger.assessment_version";
            };
            team_id: string;
            preference: "human" | "ai" | "any";
            min_confidence: number;
            cooldown_seconds: number;
            max_age_seconds: number;
          };
          next: string;
        }
    )[]
  ];
}
