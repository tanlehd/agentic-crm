/* Generated. Do not edit. */

export type ActivityItem =
  | {
      id: string;
      kind: "message";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow" | "chatflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        message_id: string;
        envelope: ConversationMessageEnvelopeV3;
        inbound_seq: string | null;
      };
    }
  | {
      id: string;
      kind: "note";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow" | "chatflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        activity_id: string;
        body?: string;
      };
    }
  | {
      id: string;
      kind: "assignment";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow" | "chatflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        from_principal_id: string | null;
        to_principal_id: string | null;
        owner_revision: string;
        reason: string;
      };
    }
  | {
      id: string;
      kind: "lifecycle";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow" | "chatflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        from_status: "open" | "pending" | "closed";
        to_status: "open" | "pending" | "closed";
      };
    }
  | {
      id: string;
      kind: "snooze";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow" | "chatflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        until: string | null;
        cause: "scheduled" | "rescheduled" | "deadline" | "inbound" | "manual" | "assignment" | "closed";
      };
    }
  | {
      id: string;
      kind: "tags";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow" | "chatflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        tag_id: string;
        operation: "attached" | "detached";
      };
    }
  | {
      id: string;
      kind: "automation";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow" | "chatflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        source_service: "workflow" | "chatflow";
        run_id: string;
        definition_version_id: string;
        state: "started" | "paused" | "resumed" | "completed" | "failed" | "cancelled";
      };
    };

export interface ActivityResponse {
  data: ActivityItem[];
  older_cursor: string | null;
  newer_cursor: string;
  has_more: boolean;
  meta: {
    state: "ready" | "backfilling" | "partial";
    as_of: string;
    sources: {
      service: "chat" | "crm" | "workflow" | "chatflow";
      state: "ready" | "delayed" | "unavailable";
      last_observed_at: string | null;
    }[];
    correlation_id?: string;
  };
}
export interface ConversationMessageEnvelopeV3 {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  text?: string;
  status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  outbound_intent_id: string | null;
  occurred_at: string;
  received_at: string;
  external_msg_id: string | null;
  schema_version: 3;
  connection_id: string;
  platform: "mock_messenger";
  message_type: "text" | "media" | "template" | "unsupported";
  reply_to?: {
    external_msg_id: string;
    internal_message_id: string | null;
  } | null;
  attachment?:
    | null
    | {
        version: 1;
        kind: "media";
        /**
         * @minItems 1
         * @maxItems 10
         */
        items:
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ];
      }
    | {
        version: 1;
        kind: "gallery";
        /**
         * @minItems 1
         * @maxItems 10
         */
        cards:
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ];
      }
    | {
        version: 1;
        kind: "csat";
        title: string;
        prompt: string;
      }
    | {
        version: 1;
        kind: "unsupported";
        label: string;
      };
  text_source: "original" | "extracted" | "preview";
}
