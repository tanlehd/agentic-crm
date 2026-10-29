/* Generated. Do not edit. */
export const chatControlV1Schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:agentic-crm:chat-control:v1",
  "title": "ChatControlProtocol",
  "oneOf": [
    {
      "$ref": "#/definitions/ChatControlRequest"
    },
    {
      "$ref": "#/definitions/ChatRegistryReply"
    },
    {
      "$ref": "#/definitions/ChatControlEventReply"
    },
    {
      "$ref": "#/definitions/ChatReferenceReply"
    },
    {
      "$ref": "#/definitions/ChatControlFailure"
    },
    {
      "$ref": "#/definitions/ChatControlEvent"
    },
    {
      "$ref": "#/definitions/ChatControlNotice"
    }
  ],
  "definitions": {
    "ChatRegistrySnapshot": {
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
        "registry_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "record_version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "control_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "pause_through_revision": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "cancel_through_revision": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "crm_contact_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "crm_identity_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "connection_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "owner_principal_id": {
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
        "owner_kind": {
          "enum": [
            "human",
            "ai",
            null
          ]
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
        },
        "active_session_id": {
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
        "status": {
          "enum": [
            "open",
            "pending",
            "closed"
          ]
        },
        "archived": {
          "type": "boolean"
        }
      },
      "required": [
        "tenant_id",
        "conversation_id",
        "registry_revision",
        "record_version",
        "owner_revision",
        "control_revision",
        "pause_through_revision",
        "cancel_through_revision",
        "crm_contact_id",
        "crm_identity_id",
        "connection_id",
        "owner_principal_id",
        "owner_kind",
        "team_id",
        "shared_team_ids",
        "active_session_id",
        "status",
        "archived"
      ],
      "additionalProperties": false
    },
    "ChatControlNotice": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "event_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
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
        "registry_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "schema_version",
        "event_id",
        "tenant_id",
        "conversation_id",
        "registry_revision"
      ],
      "additionalProperties": false
    },
    "ChatControlEvent": {
      "type": "object",
      "properties": {
        "schema_version": {
          "const": 1
        },
        "event_type": {
          "const": "chat.registry.changed.v1"
        },
        "producer": {
          "const": "chat"
        },
        "event_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
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
        "registry_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "occurred_at": {
          "type": "string",
          "format": "date-time"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "snapshot": {
          "$ref": "#/definitions/ChatRegistrySnapshot"
        }
      },
      "required": [
        "schema_version",
        "event_type",
        "producer",
        "event_id",
        "tenant_id",
        "conversation_id",
        "registry_revision",
        "occurred_at",
        "correlation_id",
        "snapshot"
      ],
      "additionalProperties": false
    },
    "ChatRegistryRead": {
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
        "operation": {
          "const": "registry-read"
        },
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
        "minimum_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "operation",
        "tenant_id",
        "conversation_id",
        "minimum_revision"
      ],
      "additionalProperties": false
    },
    "ChatControlEventRead": {
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
        "operation": {
          "const": "event-read"
        },
        "notice": {
          "$ref": "#/definitions/ChatControlNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "operation",
        "notice"
      ],
      "additionalProperties": false
    },
    "ChatContactCheck": {
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
        "operation": {
          "const": "contact-check"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "connection_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "crm_contact_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "crm_identity_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "external_subject_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^(?!.*[\\u0000-\\u001f\\u007f])(?=.*\\S).*$"
        },
        "mapping_revision": {
          "const": "1"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "operation",
        "tenant_id",
        "connection_id",
        "crm_contact_id",
        "crm_identity_id",
        "external_subject_id",
        "mapping_revision"
      ],
      "additionalProperties": false
    },
    "ChatConnectionCheck": {
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
        "operation": {
          "const": "connection-check"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "connection_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "platform": {
          "const": "mock_messenger"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "operation",
        "tenant_id",
        "connection_id",
        "platform"
      ],
      "additionalProperties": false
    },
    "ChatPrincipalCheck": {
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
        "operation": {
          "const": "principal-check"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "principal_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "kind": {
          "enum": [
            "human",
            "ai"
          ]
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
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "operation",
        "tenant_id",
        "principal_id",
        "kind",
        "team_id"
      ],
      "additionalProperties": false
    },
    "ChatMetadataCheck": {
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
        "operation": {
          "const": "metadata-check"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-f-]{36}$"
        },
        "object_key": {
          "const": "conversation"
        },
        "schema_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "operation",
        "tenant_id",
        "object_key",
        "schema_revision"
      ],
      "additionalProperties": false
    },
    "ChatControlRequest": {
      "oneOf": [
        {
          "$ref": "#/definitions/ChatRegistryRead"
        },
        {
          "$ref": "#/definitions/ChatControlEventRead"
        },
        {
          "$ref": "#/definitions/ChatContactCheck"
        },
        {
          "$ref": "#/definitions/ChatConnectionCheck"
        },
        {
          "$ref": "#/definitions/ChatPrincipalCheck"
        },
        {
          "$ref": "#/definitions/ChatMetadataCheck"
        }
      ]
    },
    "ChatRegistryReply": {
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
        "snapshot": {
          "$ref": "#/definitions/ChatRegistrySnapshot"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "snapshot"
      ],
      "additionalProperties": false
    },
    "ChatControlEventReply": {
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
        "event": {
          "$ref": "#/definitions/ChatControlEvent"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "event"
      ],
      "additionalProperties": false
    },
    "ChatReferenceReply": {
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
        "status": {
          "const": "current"
        },
        "observed_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "status",
        "observed_revision"
      ],
      "additionalProperties": false
    },
    "ChatControlFailure": {
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
        "code": {
          "enum": [
            "INVALID_REQUEST",
            "UNAUTHENTICATED",
            "FORBIDDEN",
            "NOT_FOUND",
            "CONFLICT",
            "REVOKED",
            "DEPENDENCY_UNAVAILABLE"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "code"
      ],
      "additionalProperties": false
    }
  }
};
