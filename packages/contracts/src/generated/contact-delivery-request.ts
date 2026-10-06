/* Generated. Do not edit. */

export interface ContactDeliveryRequest {
  crm_contact_id: string;
  crm_identity_id: string;
  intake: {
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
  };
}
