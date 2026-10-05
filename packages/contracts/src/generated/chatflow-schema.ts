/* Generated. Do not edit. */
export const chatflowSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://agentic-crm.local/schemas/chatflow.json",
  "title": "ChatflowGraph",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "entry_node",
    "nodes"
  ],
  "properties": {
    "entry_node": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]{0,47}$",
      "not": {
        "enum": [
          "constructor",
          "prototype",
          "__proto__"
        ]
      }
    },
    "nodes": {
      "type": "array",
      "minItems": 1,
      "maxItems": 30,
      "items": {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              },
              "type": {
                "const": "send_prompt"
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "text": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 4000,
                    "pattern": "\\S"
                  },
                  "variable_refs": {
                    "type": "array",
                    "maxItems": 5,
                    "uniqueItems": true,
                    "items": {
                      "enum": [
                        "service_interest",
                        "need_summary",
                        "preferred_contact_method",
                        "phone",
                        "contact_permission"
                      ]
                    }
                  }
                },
                "required": [
                  "text",
                  "variable_refs"
                ]
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              }
            },
            "required": [
              "key",
              "type",
              "config",
              "next"
            ]
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              },
              "type": {
                "const": "collect"
              },
              "config": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "variable_key": {
                        "const": "service_interest"
                      },
                      "value_type": {
                        "const": "string"
                      },
                      "required": {
                        "const": true
                      },
                      "prompt": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 4000,
                        "pattern": "\\S"
                      }
                    },
                    "required": [
                      "variable_key",
                      "value_type",
                      "required",
                      "prompt"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "variable_key": {
                        "const": "need_summary"
                      },
                      "value_type": {
                        "const": "string"
                      },
                      "required": {
                        "const": true
                      },
                      "prompt": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 4000,
                        "pattern": "\\S"
                      }
                    },
                    "required": [
                      "variable_key",
                      "value_type",
                      "required",
                      "prompt"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "variable_key": {
                        "const": "preferred_contact_method"
                      },
                      "value_type": {
                        "const": "enum"
                      },
                      "required": {
                        "const": true
                      },
                      "prompt": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 4000,
                        "pattern": "\\S"
                      },
                      "choices": {
                        "type": "array",
                        "minItems": 2,
                        "maxItems": 2,
                        "uniqueItems": true,
                        "items": {
                          "enum": [
                            "messenger",
                            "phone"
                          ]
                        }
                      }
                    },
                    "required": [
                      "variable_key",
                      "value_type",
                      "required",
                      "prompt",
                      "choices"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "variable_key": {
                        "const": "phone"
                      },
                      "value_type": {
                        "const": "string"
                      },
                      "required": {
                        "type": "boolean"
                      },
                      "prompt": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 4000,
                        "pattern": "\\S"
                      }
                    },
                    "required": [
                      "variable_key",
                      "value_type",
                      "required",
                      "prompt"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "variable_key": {
                        "const": "contact_permission"
                      },
                      "value_type": {
                        "const": "boolean"
                      },
                      "required": {
                        "const": true
                      },
                      "prompt": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 4000,
                        "pattern": "\\S"
                      }
                    },
                    "required": [
                      "variable_key",
                      "value_type",
                      "required",
                      "prompt"
                    ]
                  }
                ]
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              }
            },
            "required": [
              "key",
              "type",
              "config",
              "next"
            ]
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              },
              "type": {
                "const": "invoke_agent"
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "instruction": {
                    "enum": [
                      "ask_need",
                      "ask_contact_method",
                      "confirm_contact_permission"
                    ]
                  },
                  "allowed_tools": {
                    "type": "array",
                    "maxItems": 4,
                    "uniqueItems": true,
                    "items": {
                      "enum": [
                        "crm.read_contact",
                        "qualification.save",
                        "conversation.propose_reply",
                        "routing.request_human"
                      ]
                    }
                  }
                },
                "required": [
                  "instruction",
                  "allowed_tools"
                ]
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              }
            },
            "required": [
              "key",
              "type",
              "config",
              "next"
            ]
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              },
              "type": {
                "const": "validate_qualification"
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "on_valid": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9_]{0,47}$",
                    "not": {
                      "enum": [
                        "constructor",
                        "prototype",
                        "__proto__"
                      ]
                    }
                  },
                  "on_invalid": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9_]{0,47}$",
                    "not": {
                      "enum": [
                        "constructor",
                        "prototype",
                        "__proto__"
                      ]
                    }
                  }
                },
                "required": [
                  "on_valid",
                  "on_invalid"
                ]
              }
            },
            "required": [
              "key",
              "type",
              "config"
            ]
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              },
              "type": {
                "const": "upsert_lead"
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "properties": {},
                "required": []
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              }
            },
            "required": [
              "key",
              "type",
              "config",
              "next"
            ]
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              },
              "type": {
                "const": "request_human"
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "reason": {
                    "enum": [
                      "request_human",
                      "invalid_answers",
                      "qualification_incomplete"
                    ]
                  },
                  "target_chat_team": {
                    "type": "string",
                    "format": "uuid"
                  }
                },
                "required": [
                  "reason",
                  "target_chat_team"
                ]
              },
              "next": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              }
            },
            "required": [
              "key",
              "type",
              "config",
              "next"
            ]
          },
          {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,47}$",
                "not": {
                  "enum": [
                    "constructor",
                    "prototype",
                    "__proto__"
                  ]
                }
              },
              "type": {
                "const": "end"
              },
              "config": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "outcome": {
                    "enum": [
                      "qualified",
                      "disqualified",
                      "needs_attention"
                    ]
                  }
                },
                "required": [
                  "outcome"
                ]
              }
            },
            "required": [
              "key",
              "type",
              "config"
            ]
          }
        ]
      }
    }
  }
};
