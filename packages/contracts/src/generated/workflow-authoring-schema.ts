/* Generated. Do not edit. */
export const workflowAuthoringSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://agentic-crm.local/schemas/workflow-authoring.json",
  "title": "WorkflowAuthoring",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schema_version",
    "catalog_revision",
    "root_object_id",
    "trigger",
    "entry_node",
    "nodes"
  ],
  "properties": {
    "schema_version": {
      "const": 1
    },
    "catalog_revision": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "root_object_id": {
      "type": "string",
      "format": "uuid"
    },
    "trigger": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "operation",
        "changed_property_ids"
      ],
      "properties": {
        "operation": {
          "enum": [
            "created",
            "updated"
          ]
        },
        "changed_property_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
          },
          "maxItems": 50,
          "minItems": 0,
          "uniqueItems": true
        }
      }
    },
    "entry_node": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]{0,63}$"
    },
    "nodes": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "end"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "outcome"
                ],
                "properties": {
                  "outcome": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9_]{0,63}$"
                  }
                }
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "delay.duration"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "seconds"
                ],
                "properties": {
                  "seconds": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 31536000
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "delay.until"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "at",
                  "offset_seconds"
                ],
                "properties": {
                  "at": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  },
                  "offset_seconds": {
                    "type": "integer",
                    "minimum": -31536000,
                    "maximum": 31536000
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "branch.if_else"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "left",
                  "op",
                  "on_true",
                  "on_false"
                ],
                "properties": {
                  "left": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  },
                  "op": {
                    "enum": [
                      "eq",
                      "ne",
                      "exists",
                      "gt",
                      "gte",
                      "lt",
                      "lte",
                      "in"
                    ]
                  },
                  "right": {
                    "anyOf": [
                      {
                        "anyOf": [
                          {
                            "type": "string",
                            "maxLength": 4000
                          },
                          {
                            "type": "number"
                          },
                          {
                            "type": "boolean"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      {
                        "type": "array",
                        "items": {
                          "anyOf": [
                            {
                              "type": "string",
                              "maxLength": 4000
                            },
                            {
                              "type": "number"
                            },
                            {
                              "type": "boolean"
                            },
                            {
                              "type": "null"
                            }
                          ]
                        },
                        "maxItems": 50,
                        "minItems": 1
                      }
                    ]
                  },
                  "on_true": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9_]{0,63}$"
                  },
                  "on_false": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9_]{0,63}$"
                  }
                }
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "data.get_record"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "object_id",
                  "target"
                ],
                "properties": {
                  "object_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "target": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "data.find_related"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "source",
                  "relation_path",
                  "limit"
                ],
                "properties": {
                  "source": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  },
                  "relation_path": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "association_id",
                        "direction"
                      ],
                      "properties": {
                        "association_id": {
                          "type": "string",
                          "format": "uuid"
                        },
                        "direction": {
                          "enum": [
                            "outgoing",
                            "incoming"
                          ]
                        }
                      }
                    },
                    "maxItems": 3,
                    "minItems": 1
                  },
                  "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 100
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "data.update_record"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "target",
                  "fields"
                ],
                "properties": {
                  "target": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  },
                  "fields": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "property_id",
                        "value"
                      ],
                      "properties": {
                        "property_id": {
                          "type": "string",
                          "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                        },
                        "value": {
                          "oneOf": [
                            {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "literal"
                              ],
                              "properties": {
                                "literal": {
                                  "anyOf": [
                                    {
                                      "type": "string",
                                      "maxLength": 4000
                                    },
                                    {
                                      "type": "number"
                                    },
                                    {
                                      "type": "boolean"
                                    },
                                    {
                                      "type": "null"
                                    }
                                  ]
                                }
                              }
                            },
                            {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "ref"
                              ],
                              "properties": {
                                "ref": {
                                  "const": "root"
                                }
                              }
                            },
                            {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "ref",
                                "property_id"
                              ],
                              "properties": {
                                "ref": {
                                  "const": "property"
                                },
                                "property_id": {
                                  "type": "string",
                                  "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                                }
                              }
                            },
                            {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "ref",
                                "node_key"
                              ],
                              "properties": {
                                "ref": {
                                  "const": "output"
                                },
                                "node_key": {
                                  "type": "string",
                                  "pattern": "^[a-z][a-z0-9_]{0,63}$"
                                }
                              }
                            },
                            {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "ref",
                                "node_key",
                                "property_id"
                              ],
                              "properties": {
                                "ref": {
                                  "const": "output_property"
                                },
                                "node_key": {
                                  "type": "string",
                                  "pattern": "^[a-z][a-z0-9_]{0,63}$"
                                },
                                "property_id": {
                                  "type": "string",
                                  "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                                }
                              }
                            }
                          ]
                        }
                      }
                    },
                    "maxItems": 50,
                    "minItems": 1
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "routing.assign_owner"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "target",
                  "team_id",
                  "preference"
                ],
                "properties": {
                  "target": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  },
                  "team_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "preference": {
                    "enum": [
                      "human",
                      "ai",
                      "any"
                    ]
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "communication.send_message"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "target",
                  "template_id"
                ],
                "properties": {
                  "target": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  },
                  "template_id": {
                    "type": "string",
                    "format": "uuid"
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "communication.send_email"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "target",
                  "template_id"
                ],
                "properties": {
                  "target": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  },
                  "template_id": {
                    "type": "string",
                    "format": "uuid"
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "key",
              "type",
              "version",
              "config",
              "next"
            ],
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "const": "communication.notify"
              },
              "version": {
                "const": 1
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "target",
                  "template_id"
                ],
                "properties": {
                  "target": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "literal"
                        ],
                        "properties": {
                          "literal": {
                            "anyOf": [
                              {
                                "type": "string",
                                "maxLength": 4000
                              },
                              {
                                "type": "number"
                              },
                              {
                                "type": "boolean"
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref"
                        ],
                        "properties": {
                          "ref": {
                            "const": "root"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "property"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "ref",
                          "node_key",
                          "property_id"
                        ],
                        "properties": {
                          "ref": {
                            "const": "output_property"
                          },
                          "node_key": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]{0,63}$"
                          },
                          "property_id": {
                            "type": "string",
                            "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                          }
                        }
                      }
                    ]
                  },
                  "template_id": {
                    "type": "string",
                    "format": "uuid"
                  }
                }
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              }
            }
          }
        ]
      },
      "maxItems": 50,
      "minItems": 1
    }
  }
};
