/* Generated. Do not edit. */
export const chatDispatchV1Schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:agentic-crm:chat-dispatch:v1",
  "title": "DispatchProtocol",
  "oneOf": [
    {
      "$ref": "#/definitions/DispatchRequest"
    },
    {
      "$ref": "#/definitions/DispatchReply"
    },
    {
      "$ref": "#/definitions/DispatchFailure"
    },
    {
      "$ref": "#/definitions/ChatClaimProofRead"
    },
    {
      "$ref": "#/definitions/ChatClaimProofReply"
    }
  ],
  "definitions": {
    "DispatchBinding": {
      "type": "object",
      "properties": {
        "tenant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "crm_contact_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "connection_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "intent_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "attempt_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "principal_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "delegation_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "actor_kind": {
          "enum": [
            "human",
            "ai"
          ]
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "record_version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "payload_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "tenant_id",
        "conversation_id",
        "crm_contact_id",
        "connection_id",
        "intent_id",
        "attempt_id",
        "principal_id",
        "delegation_id",
        "actor_kind",
        "owner_revision",
        "record_version",
        "payload_digest"
      ],
      "additionalProperties": false
    },
    "DispatchResourceContext": {
      "type": "object",
      "properties": {
        "object_key": {
          "const": "conversation"
        },
        "owner_principal_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "record_version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "shared_team_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid",
            "pattern": "^[0-9a-f-]{36}$"
          },
          "uniqueItems": true,
          "maxItems": 200
        }
      },
      "required": [
        "object_key",
        "owner_principal_id",
        "owner_revision",
        "record_version",
        "team_id",
        "shared_team_ids"
      ],
      "additionalProperties": false
    },
    "IdentityIssue": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "operation": {
          "const": "identity-issue"
        },
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "binding": {
          "$ref": "#/definitions/DispatchBinding"
        },
        "resource_context": {
          "$ref": "#/definitions/DispatchResourceContext"
        }
      },
      "required": [
        "schema_version",
        "operation",
        "request_id",
        "binding",
        "resource_context"
      ],
      "additionalProperties": false
    },
    "IdentityConsume": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "operation": {
          "const": "identity-consume"
        },
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "binding": {
          "$ref": "#/definitions/DispatchBinding"
        },
        "grant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "claim_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "fence_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        }
      },
      "required": [
        "schema_version",
        "operation",
        "request_id",
        "binding",
        "grant_id",
        "claim_id",
        "fence_id"
      ],
      "additionalProperties": false
    },
    "ChatClaim": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "operation": {
          "const": "chat-claim"
        },
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "binding": {
          "$ref": "#/definitions/DispatchBinding"
        },
        "grant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        }
      },
      "required": [
        "schema_version",
        "operation",
        "request_id",
        "binding",
        "grant_id"
      ],
      "additionalProperties": false
    },
    "ConnectorPrepare": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "operation": {
          "const": "connector-prepare"
        },
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "binding": {
          "$ref": "#/definitions/DispatchBinding"
        },
        "grant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        }
      },
      "required": [
        "schema_version",
        "operation",
        "request_id",
        "binding",
        "grant_id"
      ],
      "additionalProperties": false
    },
    "ConnectorBegin": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "operation": {
          "const": "connector-begin"
        },
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "binding": {
          "$ref": "#/definitions/DispatchBinding"
        },
        "grant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "claim_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        }
      },
      "required": [
        "schema_version",
        "operation",
        "request_id",
        "binding",
        "grant_id",
        "claim_id"
      ],
      "additionalProperties": false
    },
    "ConnectorResult": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "schema_version": {
              "const": 1
            },
            "operation": {
              "const": "connector-result"
            },
            "request_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "binding": {
              "$ref": "#/definitions/DispatchBinding"
            },
            "outcome": {
              "const": "sent"
            },
            "provider_message_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            }
          },
          "required": [
            "schema_version",
            "operation",
            "request_id",
            "binding",
            "outcome",
            "provider_message_id"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "schema_version": {
              "const": 1
            },
            "operation": {
              "const": "connector-result"
            },
            "request_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "binding": {
              "$ref": "#/definitions/DispatchBinding"
            },
            "outcome": {
              "const": "unknown"
            },
            "error_code": {
              "const": "DELIVERY_UNKNOWN"
            }
          },
          "required": [
            "schema_version",
            "operation",
            "request_id",
            "binding",
            "outcome",
            "error_code"
          ],
          "additionalProperties": false
        }
      ]
    },
    "ReceiptRead": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "operation": {
          "const": "receipt-read"
        },
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "binding": {
          "$ref": "#/definitions/DispatchBinding"
        },
        "receipt_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        }
      },
      "required": [
        "schema_version",
        "operation",
        "request_id",
        "binding",
        "receipt_id"
      ],
      "additionalProperties": false
    },
    "ChatClaimProofRead": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "operation": {
          "const": "chat-claim-proof"
        },
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "binding": {
          "$ref": "#/definitions/DispatchBinding"
        },
        "claim_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        }
      },
      "required": [
        "schema_version",
        "operation",
        "request_id",
        "binding",
        "claim_id"
      ],
      "additionalProperties": false
    },
    "ChatClaimProofReply": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "receipt_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "state": {
          "enum": [
            "claimed"
          ]
        },
        "binding": {
          "$ref": "#/definitions/DispatchBinding"
        },
        "grant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "claim_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "resource_context": {
          "$ref": "#/definitions/DispatchResourceContext"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "receipt_id",
        "state",
        "binding",
        "grant_id",
        "claim_id",
        "resource_context"
      ],
      "additionalProperties": false
    },
    "DispatchRequest": {
      "oneOf": [
        {
          "$ref": "#/definitions/IdentityIssue"
        },
        {
          "$ref": "#/definitions/IdentityConsume"
        },
        {
          "$ref": "#/definitions/ChatClaim"
        },
        {
          "$ref": "#/definitions/ConnectorPrepare"
        },
        {
          "$ref": "#/definitions/ConnectorBegin"
        },
        {
          "$ref": "#/definitions/ConnectorResult"
        },
        {
          "$ref": "#/definitions/ReceiptRead"
        }
      ]
    },
    "DispatchReply": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "schema_version": {
              "const": 1
            },
            "request_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "receipt_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "state": {
              "enum": [
                "issued"
              ]
            },
            "grant_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "expires_at": {
              "type": "string",
              "format": "date-time"
            },
            "resource_context": {
              "$ref": "#/definitions/DispatchResourceContext"
            }
          },
          "required": [
            "schema_version",
            "request_id",
            "receipt_id",
            "state",
            "grant_id",
            "expires_at",
            "resource_context"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "schema_version": {
              "const": 1
            },
            "request_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "receipt_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "state": {
              "enum": [
                "claimed"
              ]
            },
            "claim_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            }
          },
          "required": [
            "schema_version",
            "request_id",
            "receipt_id",
            "state",
            "claim_id"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "schema_version": {
              "const": 1
            },
            "request_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "receipt_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "state": {
              "enum": [
                "consumed"
              ]
            },
            "grant_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "claim_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "resource_context": {
              "$ref": "#/definitions/DispatchResourceContext"
            }
          },
          "required": [
            "schema_version",
            "request_id",
            "receipt_id",
            "state",
            "grant_id",
            "claim_id",
            "resource_context"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "schema_version": {
              "const": 1
            },
            "request_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "receipt_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "state": {
              "enum": [
                "prepared",
                "admitting",
                "started",
                "unknown",
                "rejected",
                "cancelled",
                "expired",
                "revoked"
              ]
            }
          },
          "required": [
            "schema_version",
            "request_id",
            "receipt_id",
            "state"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "schema_version": {
              "const": 1
            },
            "request_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "receipt_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f-]{36}$"
            },
            "state": {
              "enum": [
                "sent"
              ]
            },
            "provider_message_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            }
          },
          "required": [
            "schema_version",
            "request_id",
            "receipt_id",
            "state",
            "provider_message_id"
          ],
          "additionalProperties": false
        }
      ]
    },
    "DispatchFailure": {
      "type": "object",
      "properties": {
        "request_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "code": {
          "enum": [
            "INVALID_REQUEST",
            "UNAUTHENTICATED",
            "FORBIDDEN",
            "NOT_FOUND",
            "CONFLICT",
            "STALE_OWNER",
            "REVOKED",
            "EXPIRED",
            "INVALID_TRANSITION",
            "DEPENDENCY_UNAVAILABLE"
          ]
        }
      },
      "required": [
        "request_id",
        "code"
      ],
      "additionalProperties": false
    }
  }
};
