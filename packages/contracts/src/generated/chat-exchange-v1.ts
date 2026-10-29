/* Generated private design contract. No endpoint deployment implied. */

export type ExchangeProtocol = ExchangeRequest | ExchangeReply | ExchangeFailure;
export type ExchangeRequest =
  ExchangePayloadPut | ExchangeIngressAccept | ExchangeIngressRead | ExchangeCancel | ExchangeCancelRead;
export type ExchangeReply = ExchangePayloadReply | ExchangeIngressReply | ExchangeCancellationReply;
export type ExchangeIngressReply = ExchangeAcceptedReply | ExchangeProcessedReply | ExchangeFailedReply;

export interface ExchangePayloadPut {
  schema_version: 1;
  operation: "payload-put";
  request_id: string;
  binding: ExchangeDispatchBinding;
  grant_id: string;
  payload: ExchangePayload;
}
export interface ExchangeDispatchBinding {
  tenant_id: string;
  conversation_id: string;
  crm_contact_id: string;
  connection_id: string;
  intent_id: string;
  attempt_id: string;
  principal_id: string;
  delegation_id: string;
  actor_kind: "human" | "ai";
  owner_revision: string;
  record_version: string;
  payload_digest: string;
}
export interface ExchangePayload {
  version: 1;
  platform: "mock_messenger";
  message: {
    type: "text";
    text: string;
  };
}
export interface ExchangeIngressAccept {
  schema_version: 1;
  operation: "ingress-accept";
  request_id: string;
  binding: ExchangeIngressBinding;
  source_delivery_id: string;
  intake: ExchangeIntake;
}
export interface ExchangeIngressBinding {
  tenant_id: string;
  connection_id: string;
  crm_contact_id: string;
  crm_identity_id: string;
  mapping_revision: "1";
  platform: "mock_messenger";
}
export interface ExchangeIntake {
  provider_event_id: string;
  provider_message_id: string;
  external_subject_id: string;
  occurred_at: string;
  display_label?: string;
  message:
    | {
        type: "text";
        text: string;
      }
    | {
        type: "rich";
        content:
          | {
              version: 1;
              message_type: "text";
              text: string;
              reply_to: {
                external_msg_id: string;
              } | null;
              attachment: null;
            }
          | {
              version: 1;
              message_type: "media";
              text: string | null;
              reply_to: {
                external_msg_id: string;
              } | null;
              attachment: {
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
              };
              text_source?: "extracted" | "preview";
            }
          | {
              version: 1;
              message_type: "template";
              text: string | null;
              reply_to: {
                external_msg_id: string;
              } | null;
              attachment:
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
                  };
              text_source?: "extracted" | "preview";
            }
          | {
              version: 1;
              message_type: "unsupported";
              text: string | null;
              reply_to: {
                external_msg_id: string;
              } | null;
              attachment: {
                version: 1;
                kind: "unsupported";
                label: string;
              };
              text_source?: "extracted" | "preview";
            };
      };
  referral?: {
    source: "ctm";
    ad_id?: string | null;
    campaign_id?: string | null;
  };
}
export interface ExchangeIngressRead {
  schema_version: 1;
  operation: "ingress-read";
  request_id: string;
  binding: ExchangeIngressBinding;
  receipt_id: string;
}
export interface ExchangeCancel {
  schema_version: 1;
  operation: "connector-cancel";
  request_id: string;
  binding: ExchangeDispatchBinding;
  cancellation_id: string;
  reason: "owner_changed" | "conversation_closed" | "authorization_revoked";
}
export interface ExchangeCancelRead {
  schema_version: 1;
  operation: "cancellation-read";
  request_id: string;
  binding: ExchangeDispatchBinding;
  cancellation_id: string;
}
export interface ExchangePayloadReply {
  schema_version: 1;
  request_id: string;
  receipt_id: string;
  state: "staged";
}
export interface ExchangeAcceptedReply {
  schema_version: 1;
  request_id: string;
  receipt_id: string;
  state: "received";
}
export interface ExchangeProcessedReply {
  schema_version: 1;
  request_id: string;
  receipt_id: string;
  state: "processed";
  conversation_id: string;
  message_id: string;
  duplicate: boolean;
}
export interface ExchangeFailedReply {
  schema_version: 1;
  request_id: string;
  receipt_id: string;
  state: "failed";
  error_code: "CONTACT_BINDING_STALE" | "REVOKED" | "MESSAGE_PAYLOAD_CONFLICT";
}
export interface ExchangeCancellationReply {
  schema_version: 1;
  request_id: string;
  receipt_id: string;
  state: "cancelled";
  cancellation_id: string;
  reason: "owner_changed" | "conversation_closed" | "authorization_revoked";
}
export interface ExchangeFailure {
  request_id: string;
  code:
    | "INVALID_REQUEST"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "REVOKED"
    | "EXPIRED"
    | "INVALID_TRANSITION"
    | "DEPENDENCY_UNAVAILABLE";
}
