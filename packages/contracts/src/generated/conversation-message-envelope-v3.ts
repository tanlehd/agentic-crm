/* Generated. Do not edit. */

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
