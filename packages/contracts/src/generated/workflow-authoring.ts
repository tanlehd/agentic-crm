/* Generated. Do not edit. */

export interface WorkflowAuthoring {
  schema_version: 1;
  catalog_revision: string;
  root_object_id: string;
  trigger: {
    operation: "created" | "updated";
    /**
     * @minItems 0
     * @maxItems 50
     */
    changed_property_ids: string[];
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
          type: "end";
          version: 1;
          config: {
            outcome: string;
          };
        }
      | {
          key: string;
          type: "delay.duration";
          version: 1;
          config: {
            seconds: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "delay.until";
          version: 1;
          config: {
            at:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            offset_seconds: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "branch.if_else";
          version: 1;
          config: {
            left:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            op: "eq" | "ne" | "exists" | "gt" | "gte" | "lt" | "lte" | "in";
            right?:
              | (string | number | boolean | null)
              | [string | number | boolean | null, ...(string | number | boolean | null)[]];
            on_true: string;
            on_false: string;
          };
        }
      | {
          key: string;
          type: "data.get_record";
          version: 1;
          config: {
            object_id: string;
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
          };
          next: string;
        }
      | {
          key: string;
          type: "data.find_related";
          version: 1;
          config: {
            source:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            /**
             * @minItems 1
             * @maxItems 3
             */
            relation_path:
              | [
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  }
                ]
              | [
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  },
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  }
                ]
              | [
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  },
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  },
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  }
                ];
            limit: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "data.update_record";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            /**
             * @minItems 1
             * @maxItems 50
             */
            fields: [
              {
                property_id: string;
                value:
                  | {
                      literal: string | number | boolean | null;
                    }
                  | {
                      ref: "root";
                    }
                  | {
                      ref: "property";
                      property_id: string;
                    }
                  | {
                      ref: "output";
                      node_key: string;
                    }
                  | {
                      ref: "output_property";
                      node_key: string;
                      property_id: string;
                    };
              },
              ...{
                property_id: string;
                value:
                  | {
                      literal: string | number | boolean | null;
                    }
                  | {
                      ref: "root";
                    }
                  | {
                      ref: "property";
                      property_id: string;
                    }
                  | {
                      ref: "output";
                      node_key: string;
                    }
                  | {
                      ref: "output_property";
                      node_key: string;
                      property_id: string;
                    };
              }[]
            ];
          };
          next: string;
        }
      | {
          key: string;
          type: "routing.assign_owner";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            team_id: string;
            preference: "human" | "ai" | "any";
          };
          next: string;
        }
      | {
          key: string;
          type: "communication.send_message";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            template_id: string;
          };
          next: string;
        }
      | {
          key: string;
          type: "communication.send_email";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            template_id: string;
          };
          next: string;
        }
      | {
          key: string;
          type: "communication.notify";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            template_id: string;
          };
          next: string;
        }
    ),
    ...(
      | {
          key: string;
          type: "end";
          version: 1;
          config: {
            outcome: string;
          };
        }
      | {
          key: string;
          type: "delay.duration";
          version: 1;
          config: {
            seconds: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "delay.until";
          version: 1;
          config: {
            at:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            offset_seconds: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "branch.if_else";
          version: 1;
          config: {
            left:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            op: "eq" | "ne" | "exists" | "gt" | "gte" | "lt" | "lte" | "in";
            right?:
              | (string | number | boolean | null)
              | [string | number | boolean | null, ...(string | number | boolean | null)[]];
            on_true: string;
            on_false: string;
          };
        }
      | {
          key: string;
          type: "data.get_record";
          version: 1;
          config: {
            object_id: string;
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
          };
          next: string;
        }
      | {
          key: string;
          type: "data.find_related";
          version: 1;
          config: {
            source:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            /**
             * @minItems 1
             * @maxItems 3
             */
            relation_path:
              | [
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  }
                ]
              | [
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  },
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  }
                ]
              | [
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  },
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  },
                  {
                    association_id: string;
                    direction: "outgoing" | "incoming";
                  }
                ];
            limit: number;
          };
          next: string;
        }
      | {
          key: string;
          type: "data.update_record";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            /**
             * @minItems 1
             * @maxItems 50
             */
            fields: [
              {
                property_id: string;
                value:
                  | {
                      literal: string | number | boolean | null;
                    }
                  | {
                      ref: "root";
                    }
                  | {
                      ref: "property";
                      property_id: string;
                    }
                  | {
                      ref: "output";
                      node_key: string;
                    }
                  | {
                      ref: "output_property";
                      node_key: string;
                      property_id: string;
                    };
              },
              ...{
                property_id: string;
                value:
                  | {
                      literal: string | number | boolean | null;
                    }
                  | {
                      ref: "root";
                    }
                  | {
                      ref: "property";
                      property_id: string;
                    }
                  | {
                      ref: "output";
                      node_key: string;
                    }
                  | {
                      ref: "output_property";
                      node_key: string;
                      property_id: string;
                    };
              }[]
            ];
          };
          next: string;
        }
      | {
          key: string;
          type: "routing.assign_owner";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            team_id: string;
            preference: "human" | "ai" | "any";
          };
          next: string;
        }
      | {
          key: string;
          type: "communication.send_message";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            template_id: string;
          };
          next: string;
        }
      | {
          key: string;
          type: "communication.send_email";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            template_id: string;
          };
          next: string;
        }
      | {
          key: string;
          type: "communication.notify";
          version: 1;
          config: {
            target:
              | {
                  literal: string | number | boolean | null;
                }
              | {
                  ref: "root";
                }
              | {
                  ref: "property";
                  property_id: string;
                }
              | {
                  ref: "output";
                  node_key: string;
                }
              | {
                  ref: "output_property";
                  node_key: string;
                  property_id: string;
                };
            template_id: string;
          };
          next: string;
        }
    )[]
  ];
}
