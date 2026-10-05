/* Generated. Do not edit. */
export const runtimeSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://agentic-crm.invalid/schemas/agent-runtime.json",
  "title": "AgentRuntimeProtocol",
  "definitions": {
    "runtime-draft": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "service_interest": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "\\S"
        },
        "need_summary": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000,
          "pattern": "\\S"
        },
        "preferred_contact_method": {
          "enum": [
            "phone",
            "messenger"
          ]
        },
        "phone": {
          "type": "string",
          "minLength": 1,
          "maxLength": 32,
          "pattern": "\\S"
        }
      },
      "required": []
    },
    "runtime-tool-call": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "call_id": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9_.:-]{1,64}$"
            },
            "tool": {
              "const": "crm.read_contact"
            },
            "arguments": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "contact_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "contact_id"
              ]
            }
          },
          "required": [
            "call_id",
            "tool",
            "arguments"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "call_id": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9_.:-]{1,64}$"
            },
            "tool": {
              "const": "qualification.save"
            },
            "arguments": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "qualification": {
                  "$ref": "#/definitions/runtime-draft"
                }
              },
              "required": [
                "qualification"
              ]
            }
          },
          "required": [
            "call_id",
            "tool",
            "arguments"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "call_id": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9_.:-]{1,64}$"
            },
            "tool": {
              "const": "conversation.propose_reply"
            },
            "arguments": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "text": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 4000,
                  "pattern": "\\S"
                }
              },
              "required": [
                "text"
              ]
            }
          },
          "required": [
            "call_id",
            "tool",
            "arguments"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "call_id": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9_.:-]{1,64}$"
            },
            "tool": {
              "const": "routing.request_human"
            },
            "arguments": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "reason": {
                  "const": "request_human"
                }
              },
              "required": [
                "reason"
              ]
            }
          },
          "required": [
            "call_id",
            "tool",
            "arguments"
          ]
        }
      ]
    },
    "runtime-result": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "execution_id": {
              "type": "string",
              "format": "uuid"
            },
            "status": {
              "const": "completed"
            },
            "proposed_reply": {
              "type": "string",
              "minLength": 1,
              "maxLength": 4000,
              "pattern": "\\S"
            }
          },
          "required": [
            "execution_id",
            "status"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "execution_id": {
              "type": "string",
              "format": "uuid"
            },
            "status": {
              "const": "tool_calls"
            },
            "tool_calls": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/runtime-tool-call"
              },
              "minItems": 1,
              "maxItems": 5
            }
          },
          "required": [
            "execution_id",
            "status",
            "tool_calls"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "execution_id": {
              "type": "string",
              "format": "uuid"
            },
            "status": {
              "const": "handoff_required"
            },
            "handoff_reason": {
              "const": "request_human"
            }
          },
          "required": [
            "execution_id",
            "status",
            "handoff_reason"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "execution_id": {
              "type": "string",
              "format": "uuid"
            },
            "status": {
              "const": "failed"
            },
            "error_code": {
              "const": "MOCK_FAILURE"
            }
          },
          "required": [
            "execution_id",
            "status",
            "error_code"
          ]
        }
      ]
    },
    "runtime-request": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "execution_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "session_id": {
          "type": "string",
          "format": "uuid"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "policy": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "policy_id": {
              "type": "string",
              "format": "uuid"
            },
            "version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "allowed_tools": {
              "type": "array",
              "items": {
                "enum": [
                  "crm.read_contact",
                  "qualification.save",
                  "conversation.propose_reply",
                  "routing.request_human"
                ]
              },
              "uniqueItems": true,
              "maxItems": 4
            },
            "max_tool_calls": {
              "type": "integer",
              "minimum": 1,
              "maximum": 5
            },
            "timeout_ms": {
              "type": "integer",
              "minimum": 1,
              "maximum": 30000
            }
          },
          "required": [
            "policy_id",
            "version",
            "allowed_tools",
            "max_tool_calls",
            "timeout_ms"
          ]
        },
        "context": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "messages": {
              "type": "array",
              "maxItems": 20,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "direction": {
                    "enum": [
                      "inbound",
                      "outbound"
                    ]
                  },
                  "text": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 4000,
                    "pattern": "\\S"
                  }
                },
                "required": [
                  "id",
                  "direction"
                ]
              }
            },
            "contact": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "display_name": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255,
                      "pattern": "\\S"
                    },
                    "normalized_phone": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "normalized_email": {
                      "type": [
                        "string",
                        "null"
                      ]
                    }
                  },
                  "required": []
                },
                {
                  "type": "null"
                }
              ]
            },
            "qualification": {
              "$ref": "#/definitions/runtime-draft"
            },
            "locale": {
              "type": "string",
              "minLength": 1,
              "maxLength": 35,
              "pattern": "\\S"
            },
            "timezone": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64,
              "pattern": "\\S"
            }
          },
          "required": [
            "messages",
            "contact",
            "qualification",
            "locale",
            "timezone"
          ]
        },
        "input": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "message_id": {
              "type": "string",
              "format": "uuid"
            },
            "instruction": {
              "enum": [
                "ask_need",
                "ask_contact_method",
                "confirm_contact_permission"
              ]
            },
            "current_node": {
              "type": "string",
              "pattern": "^[a-zA-Z0-9_.:-]{1,64}$"
            }
          },
          "required": [
            "message_id",
            "instruction",
            "current_node"
          ]
        },
        "deadline_at": {
          "type": "string",
          "format": "date-time"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "execution_id",
        "tenant_id",
        "principal_id",
        "conversation_id",
        "session_id",
        "owner_revision",
        "auth_revision",
        "policy",
        "context",
        "input",
        "deadline_at",
        "correlation_id"
      ]
    }
  }
};
