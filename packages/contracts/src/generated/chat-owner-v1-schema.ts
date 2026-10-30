/* Generated. Do not edit. */
export const chatOwnerV1Schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:agentic-crm:chat-owner:v1",
  "title": "ChatOwnerProtocol",
  "definitions": {
    "OwnerActor": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "kind": {
          "enum": [
            "human",
            "app",
            "service",
            "ai"
          ]
        },
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "delegation_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "kind",
        "principal_id",
        "delegation_id"
      ]
    },
    "OwnerResource": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "resource_id": {
          "type": "string",
          "format": "uuid"
        },
        "object_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64
        },
        "record_version": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "control_revision": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "owner_principal_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
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
            "format": "uuid"
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "archived": {
          "type": "boolean"
        }
      },
      "required": [
        "resource_id",
        "object_key",
        "record_version",
        "owner_revision",
        "control_revision",
        "owner_principal_id",
        "team_id",
        "shared_team_ids",
        "archived"
      ]
    },
    "OwnerTarget": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "kind": {
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
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "principal_id",
        "kind",
        "team_id"
      ]
    },
    "OwnerMetadataPin": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "object_type_id": {
          "type": "string",
          "format": "uuid"
        },
        "schema_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "snapshot_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "object_type_id",
        "schema_revision",
        "snapshot_digest"
      ]
    },
    "OwnerCustomProperty": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "key": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9_]{0,63}$"
        },
        "type": {
          "enum": [
            "string",
            "text",
            "integer",
            "decimal",
            "boolean",
            "date",
            "datetime",
            "enum"
          ]
        },
        "required": {
          "type": "boolean"
        },
        "indexed": {
          "type": "boolean"
        },
        "options": {
          "anyOf": [
            {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 255
              },
              "maxItems": 100
            },
            {
              "type": "null"
            }
          ]
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "id",
        "key",
        "type",
        "required",
        "indexed",
        "options",
        "version"
      ]
    },
    "OwnerMetadataSnapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "object_type_id": {
          "type": "string",
          "format": "uuid"
        },
        "object_key": {
          "enum": [
            "conversation",
            "conversation_session",
            "conversation_need"
          ]
        },
        "schema_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "properties": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/OwnerCustomProperty"
          },
          "maxItems": 200
        },
        "snapshot_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "tenant_id",
        "object_type_id",
        "object_key",
        "schema_revision",
        "properties",
        "snapshot_digest"
      ]
    },
    "OwnerDependency": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "owner": {
          "enum": [
            "chat",
            "identity",
            "crm",
            "connector",
            "routing",
            "ai-runtime",
            "workflow",
            "reporting",
            "external-api",
            "bff",
            "sales"
          ]
        },
        "receipt_id": {
          "type": "string",
          "format": "uuid"
        },
        "binding_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "owner",
        "receipt_id",
        "binding_digest"
      ]
    },
    "OwnerGraph": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "graph_version_id": {
          "type": "string",
          "format": "uuid"
        },
        "run_id": {
          "type": "string",
          "format": "uuid"
        },
        "step_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128
        },
        "attempt": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "action_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255
        }
      },
      "required": [
        "graph_version_id",
        "run_id",
        "step_id",
        "attempt",
        "action_key"
      ]
    },
    "OwnerCommandBinding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "owner": {
          "enum": [
            "chat",
            "identity",
            "crm",
            "connector",
            "routing",
            "ai-runtime",
            "workflow",
            "reporting",
            "external-api",
            "bff",
            "sales"
          ]
        },
        "operation": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "resource": {
          "$ref": "#/definitions/OwnerResource"
        },
        "target": {
          "anyOf": [
            {
              "$ref": "#/definitions/OwnerTarget"
            },
            {
              "type": "null"
            }
          ]
        },
        "session_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "payload_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "legacy_receipt_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 512
        },
        "graph": {
          "anyOf": [
            {
              "$ref": "#/definitions/OwnerGraph"
            },
            {
              "type": "null"
            }
          ]
        },
        "dependencies": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/OwnerDependency"
          },
          "maxItems": 16
        },
        "metadata": {
          "$ref": "#/definitions/OwnerMetadataPin"
        },
        "session_write_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "session_read_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "record_read_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "need": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "assessment_version": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "need_id",
            "assessment_version"
          ]
        },
        "outcome": {
          "$ref": "#/definitions/OwnerOutcomePin"
        },
        "inbox_inputs": {
          "$ref": "#/definitions/OwnerInboxInputs"
        },
        "projection": {
          "$ref": "#/definitions/OwnerProjectionPin"
        },
        "query_filter_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "routing_snapshot": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "routing_dispatch": {
          "$ref": "#/definitions/OwnerRoutingDispatchPin"
        },
        "routing_reroute": {
          "$ref": "#/definitions/OwnerRoutingReroutePin"
        },
        "routing_view": {
          "$ref": "#/definitions/OwnerRoutingViewSelection"
        },
        "references": {
          "$ref": "#/definitions/OwnerIngressReferences"
        },
        "ingress_channel": {
          "$ref": "#/definitions/OwnerIngressChannel"
        },
        "ingress_touchpoint": {
          "$ref": "#/definitions/OwnerIngressTouchpoint"
        },
        "note": {
          "$ref": "#/definitions/OwnerNotePin"
        }
      },
      "required": [
        "tenant_id",
        "command_id",
        "owner",
        "operation",
        "actor",
        "resource",
        "target",
        "session_id",
        "fields",
        "payload_digest",
        "legacy_receipt_key",
        "graph",
        "dependencies"
      ]
    },
    "OwnerCommandRef": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "binding_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "command_id",
        "binding_digest"
      ]
    },
    "OwnerCommandTombstone": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "binding_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "state": {
          "const": "aborted"
        }
      },
      "required": [
        "command_id",
        "binding_digest",
        "state"
      ]
    },
    "OwnerRecoveryProof": {
      "oneOf": [
        {
          "$ref": "#/definitions/OwnerCommandProof"
        },
        {
          "$ref": "#/definitions/OwnerCommandTombstone"
        }
      ]
    },
    "OwnerCommandProof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "binding": {
          "$ref": "#/definitions/OwnerCommandBinding"
        },
        "binding_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "state": {
          "enum": [
            "prepared",
            "committed",
            "aborted"
          ]
        },
        "effect_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "effect_revision": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "children": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/OwnerDependency"
          },
          "maxItems": 16
        },
        "candidate_digest": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "resource_contexts": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/OwnerResource"
          },
          "maxItems": 100
        },
        "ingress_result": {
          "$ref": "#/definitions/OwnerIngressResult"
        }
      },
      "required": [
        "binding",
        "binding_digest",
        "state",
        "effect_id",
        "effect_revision",
        "children",
        "candidate_digest",
        "resource_contexts"
      ]
    },
    "OwnerAdmission": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "admission_id": {
          "type": "string",
          "format": "uuid"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "binding_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "state": {
          "enum": [
            "admitted",
            "settled",
            "denied"
          ]
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "allowed_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        }
      },
      "required": [
        "admission_id",
        "command_id",
        "binding_digest",
        "state",
        "auth_revision",
        "allowed_fields"
      ]
    },
    "OwnerBarrier": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "barrier_id": {
          "type": "string",
          "format": "uuid"
        },
        "state": {
          "enum": [
            "closing",
            "completed"
          ]
        },
        "pending_count": {
          "type": "integer",
          "minimum": 0
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "barrier_id",
        "state",
        "pending_count",
        "auth_revision"
      ]
    },
    "OwnerCapacity": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "reservation_id": {
          "type": "string",
          "format": "uuid"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "binding_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "session_id": {
          "type": "string",
          "format": "uuid"
        },
        "principal_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "state": {
          "enum": [
            "reserved",
            "confirmed",
            "released",
            "not-managed"
          ]
        },
        "allocation_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "queue_version_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "reservation_id",
        "command_id",
        "binding_digest",
        "session_id",
        "principal_id",
        "owner_revision",
        "state",
        "allocation_id",
        "queue_version_id"
      ]
    },
    "OwnerReference": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "reservation_id": {
          "type": "string",
          "format": "uuid"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "binding_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "resource_id": {
          "type": "string",
          "format": "uuid"
        },
        "revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "state": {
          "enum": [
            "reserved",
            "released",
            "closing",
            "archived",
            "rejected"
          ]
        }
      },
      "required": [
        "reservation_id",
        "command_id",
        "binding_digest",
        "resource_id",
        "revision",
        "state"
      ]
    },
    "OwnerPage": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        },
        "cursor": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 8192
            },
            {
              "type": "null"
            }
          ]
        },
        "minimum_watermark": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        }
      },
      "required": [
        "limit",
        "cursor",
        "minimum_watermark",
        "fields"
      ]
    },
    "OwnerFreshness": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "as_of": {
          "type": "string",
          "format": "date-time"
        },
        "watermark": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "state": {
          "enum": [
            "ready",
            "delayed",
            "unavailable",
            "partial"
          ]
        },
        "next_cursor": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 8192
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "as_of",
        "watermark",
        "state",
        "next_cursor"
      ]
    },
    "OwnerFieldValue": {
      "anyOf": [
        {
          "type": "string",
          "maxLength": 65536
        },
        {
          "type": "number"
        },
        {
          "type": "boolean"
        },
        {
          "type": "null"
        },
        {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1024
          },
          "maxItems": 200
        }
      ]
    },
    "OwnerProjectedRecord": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "properties": {
          "type": "object",
          "maxProperties": 200,
          "patternProperties": {
            "^[a-zA-Z][a-zA-Z0-9_.]{0,127}$": {
              "$ref": "#/definitions/OwnerFieldValue"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "id",
        "version",
        "properties"
      ]
    },
    "OwnerBatchItem": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "state": {
              "const": "found"
            },
            "record": {
              "$ref": "#/definitions/OwnerProjectedRecord"
            }
          },
          "required": [
            "id",
            "state",
            "record"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "state": {
              "enum": [
                "not_found",
                "forbidden",
                "unavailable"
              ]
            }
          },
          "required": [
            "id",
            "state"
          ]
        }
      ]
    },
    "OwnerBatch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/OwnerBatchItem"
          },
          "maxItems": 100
        },
        "freshness": {
          "$ref": "#/definitions/OwnerFreshness"
        }
      },
      "required": [
        "data",
        "freshness"
      ]
    },
    "OwnerSessionSource": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "session_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "crm_contact_id": {
          "type": "string",
          "format": "uuid"
        },
        "source_touchpoint_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "source_classification": {
          "enum": [
            "paid",
            "organic",
            "unknown"
          ]
        },
        "source_channel": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            {
              "type": "null"
            }
          ]
        },
        "source_connection_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "source_page_id": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            {
              "type": "null"
            }
          ]
        },
        "source_ad_id": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            {
              "type": "null"
            }
          ]
        },
        "source_campaign_id": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            {
              "type": "null"
            }
          ]
        },
        "record_version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "session_revision": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        }
      },
      "required": [
        "conversation_id",
        "session_id",
        "crm_contact_id",
        "source_touchpoint_id",
        "source_classification",
        "source_channel",
        "source_connection_id",
        "source_page_id",
        "source_ad_id",
        "source_campaign_id",
        "record_version",
        "session_revision"
      ]
    },
    "OwnerOutcome": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "need_id": {
          "type": "string",
          "format": "uuid"
        },
        "state": {
          "enum": [
            "absent",
            "linked",
            "ambiguous"
          ]
        },
        "record_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "record_version": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "reservation": {
          "anyOf": [
            {
              "$ref": "#/definitions/OwnerReference"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "need_id",
        "state",
        "record_id",
        "record_version",
        "reservation"
      ]
    },
    "OwnerFact": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "session_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "need_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "actor_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "kind": {
          "enum": [
            "session",
            "stage_enter",
            "stage_exit",
            "milestone",
            "contribution",
            "reply_submitted",
            "owner",
            "coverage"
          ]
        },
        "occurred_at": {
          "type": "string",
          "format": "date-time"
        },
        "recorded_at": {
          "type": "string",
          "format": "date-time"
        },
        "revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "stage_key": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            {
              "type": "null"
            }
          ]
        },
        "process_version_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "supersedes_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "coverage": {
          "enum": [
            "full",
            "partial",
            "none"
          ]
        }
      },
      "required": [
        "id",
        "conversation_id",
        "session_id",
        "need_id",
        "actor_id",
        "team_id",
        "kind",
        "occurred_at",
        "recorded_at",
        "revision",
        "stage_key",
        "process_version_id",
        "supersedes_id",
        "coverage"
      ]
    },
    "OwnerFacts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/OwnerFact"
          },
          "maxItems": 5000
        },
        "freshness": {
          "$ref": "#/definitions/OwnerFreshness"
        }
      },
      "required": [
        "data",
        "freshness"
      ]
    },
    "OwnerActivityBinding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "source_id": {
          "type": "string",
          "format": "uuid"
        },
        "revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "definition_version_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "visible": {
          "type": "boolean"
        }
      },
      "required": [
        "conversation_id",
        "source_id",
        "revision",
        "definition_version_id",
        "visible"
      ]
    },
    "OwnerRecovery": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "outcome": {
          "enum": [
            "recovered",
            "already_recovered",
            "not_assessed",
            "assessment_changed",
            "newer_session",
            "thread_open",
            "cooldown",
            "stale_evidence",
            "newer_evidence",
            "need_not_clear",
            "no_unresolved_reason",
            "confidence_too_low",
            "outcome_exists",
            "outcome_unmapped"
          ]
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "session_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "owner_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "outcome",
        "conversation_id",
        "session_id",
        "owner_id"
      ]
    },
    "OwnerCapabilities": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "lineage": {
          "const": "crm_chat"
        },
        "capabilities": {
          "type": "array",
          "items": {
            "enum": [
              "workspace_read_v1",
              "workspace_catalog_v1",
              "activity_v1",
              "owner_v1"
            ]
          },
          "maxItems": 4,
          "uniqueItems": true
        },
        "watermark": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        }
      },
      "required": [
        "lineage",
        "capabilities",
        "watermark"
      ]
    },
    "OwnerFailure": {
      "oneOf": [
        {
          "$ref": "#/definitions/OwnerBoundaryFailure"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "schema_version": {
              "const": 1
            },
            "request_id": {
              "type": "string",
              "format": "uuid"
            },
            "code": {
              "const": "DOMAIN_ERROR"
            },
            "public_error": {
              "$ref": "#/definitions/Public_AuthErrorResponse"
            }
          },
          "required": [
            "schema_version",
            "request_id",
            "code",
            "public_error"
          ]
        }
      ]
    },
    "OwnerOutcomeSource": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "resource": {
          "$ref": "#/definitions/OwnerResource"
        },
        "source_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "resource",
        "source_digest"
      ]
    },
    "OwnerOutcomePin": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "record_id": {
          "type": "string",
          "format": "uuid"
        },
        "source": {
          "anyOf": [
            {
              "$ref": "#/definitions/OwnerOutcomeSource"
            },
            {
              "type": "null"
            }
          ]
        },
        "request_hash": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "record_id",
        "source",
        "request_hash",
        "key",
        "correlation_id"
      ]
    },
    "OwnerOutcomeReceipt": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "command": {
          "$ref": "#/definitions/OwnerCommandRef"
        },
        "state": {
          "enum": [
            "committed",
            "aborted"
          ]
        },
        "record_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "command",
        "state",
        "record_id"
      ]
    },
    "OwnerClassificationMetadata": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "snapshot": {
          "$ref": "#/definitions/OwnerMetadataSnapshot"
        },
        "definitions": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$"
              },
              "type": {
                "enum": [
                  "string",
                  "text",
                  "integer",
                  "decimal",
                  "boolean",
                  "date",
                  "datetime",
                  "enum"
                ]
              },
              "required": {
                "type": "boolean"
              },
              "indexed": {
                "type": "boolean"
              },
              "options": {
                "anyOf": [
                  {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255
                    },
                    "maxItems": 100
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "version": {
                "type": "string",
                "pattern": "^[1-9][0-9]{0,19}$"
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 255
              },
              "default_value": {
                "type": "null"
              },
              "sensitive": {
                "type": "boolean"
              }
            },
            "required": [
              "id",
              "key",
              "type",
              "required",
              "indexed",
              "options",
              "version",
              "label",
              "default_value",
              "sensitive"
            ]
          },
          "maxItems": 100
        }
      },
      "required": [
        "snapshot",
        "definitions"
      ]
    },
    "OwnerClassificationPolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "can_edit": {
          "type": "boolean"
        },
        "read_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "write_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "can_edit",
        "read_fields",
        "write_fields"
      ]
    },
    "OwnerInboxInputs": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "targets": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "kind": {
                "enum": [
                  "principal",
                  "team"
                ]
              },
              "id": {
                "type": "string",
                "format": "uuid"
              }
            },
            "required": [
              "kind",
              "id"
            ]
          },
          "maxItems": 52
        },
        "filter_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        }
      },
      "required": [
        "targets",
        "filter_fields"
      ]
    },
    "OwnerProjectionPin": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "contact_id": {
          "type": "string",
          "format": "uuid"
        },
        "connection_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "contact_id",
        "connection_id"
      ]
    },
    "OwnerContactSummary": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "display_name": {
          "type": "string",
          "maxLength": 65536
        },
        "normalized_phone": {
          "anyOf": [
            {
              "type": "string",
              "maxLength": 65536
            },
            {
              "type": "null"
            }
          ]
        },
        "normalized_email": {
          "anyOf": [
            {
              "type": "string",
              "maxLength": 65536
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": []
    },
    "OwnerConversationPolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "owner_kind": {
          "enum": [
            "human",
            "ai",
            null
          ]
        },
        "allowed_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "allowed_actions": {
          "type": "array",
          "items": {
            "enum": [
              "reply",
              "note",
              "update",
              "assign",
              "takeover"
            ]
          },
          "maxItems": 5
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "owner_kind",
        "allowed_fields",
        "allowed_actions"
      ]
    },
    "OwnerAssignmentDirectory": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "resource": {
          "$ref": "#/definitions/OwnerResource"
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "candidates": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "kind": {
                "enum": [
                  "human",
                  "ai"
                ]
              },
              "eligible": {
                "type": "boolean"
              },
              "reason": {
                "enum": [
                  null,
                  "unavailable",
                  "team",
                  "capability",
                  "role",
                  "field",
                  "policy"
                ]
              }
            },
            "required": [
              "id",
              "kind",
              "eligible",
              "reason"
            ]
          },
          "maxItems": 200
        },
        "teams": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 255
              },
              "purpose": {
                "enum": [
                  "chat",
                  "sales",
                  "service",
                  "general"
                ]
              }
            },
            "required": [
              "id",
              "name",
              "purpose"
            ]
          },
          "maxItems": 200
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "resource",
        "team_id",
        "candidates",
        "teams"
      ]
    },
    "OwnerRoutingDispatchPin": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "work_id": {
          "type": "string",
          "format": "uuid"
        },
        "entry_id": {
          "type": "string",
          "format": "uuid"
        },
        "queue_version_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "work_id",
        "entry_id",
        "queue_version_id"
      ]
    },
    "OwnerRoutingReroutePin": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "work_id": {
          "type": "string",
          "format": "uuid"
        },
        "work_version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "queue_version_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "work_id",
        "work_version",
        "queue_version_id"
      ]
    },
    "OwnerRoutingSession": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "session_id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "connection_id": {
          "type": "string",
          "format": "uuid"
        },
        "opened_at": {
          "type": "string",
          "format": "date-time"
        },
        "closed_at": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "status": {
          "enum": [
            "active",
            "closed"
          ]
        },
        "owner_principal_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "assigned_at": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "session_id",
        "conversation_id",
        "connection_id",
        "opened_at",
        "closed_at",
        "status",
        "owner_principal_id",
        "team_id",
        "owner_revision",
        "assigned_at"
      ]
    },
    "OwnerRoutingSnapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "sessions": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/OwnerRoutingSession"
          },
          "maxItems": 1000
        },
        "missing": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 500
        },
        "snapshot_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "sessions",
        "missing",
        "snapshot_digest"
      ]
    },
    "OwnerRoutingReplyFact": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "session_id": {
          "type": "string",
          "format": "uuid"
        },
        "actor_id": {
          "type": "string",
          "format": "uuid"
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "recorded_at": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "id",
        "session_id",
        "actor_id",
        "team_id",
        "recorded_at"
      ]
    },
    "OwnerRoutingReplySnapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "facts": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/OwnerRoutingReplyFact"
          },
          "maxItems": 5000
        },
        "replies": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "principal_id": {
                "type": "string",
                "format": "uuid"
              },
              "submitted_replies": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              }
            },
            "required": [
              "principal_id",
              "submitted_replies"
            ]
          },
          "maxItems": 500
        },
        "snapshot_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "facts",
        "replies",
        "snapshot_digest"
      ]
    },
    "OwnerReadPredicate": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "all": {
          "type": "boolean"
        },
        "own": {
          "type": "boolean"
        },
        "team_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 200
        }
      },
      "required": [
        "all",
        "own",
        "team_ids"
      ]
    },
    "OwnerRoutingViewSelection": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "mine": {
          "type": "boolean"
        },
        "profile_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 500,
          "uniqueItems": true
        },
        "conversation_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 500,
          "uniqueItems": true
        },
        "session_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 5000,
          "uniqueItems": true
        },
        "from": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "mine",
        "profile_ids",
        "conversation_ids",
        "session_ids",
        "from"
      ]
    },
    "OwnerRoutingViewPolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "selection": {
          "$ref": "#/definitions/OwnerRoutingViewSelection"
        },
        "read": {
          "$ref": "#/definitions/OwnerReadPredicate"
        },
        "allowed_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "selection",
        "read",
        "allowed_fields"
      ]
    },
    "OwnerRoutingViewDirectory": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "policy_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "available": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "principal_id": {
                "type": "string",
                "format": "uuid"
              },
              "available": {
                "type": "boolean"
              }
            },
            "required": [
              "principal_id",
              "available"
            ]
          },
          "maxItems": 500
        },
        "principals": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "required": [
              "id",
              "name"
            ]
          },
          "maxItems": 500
        },
        "teams": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "required": [
              "id",
              "name"
            ]
          },
          "maxItems": 200
        }
      },
      "required": [
        "policy_digest",
        "available",
        "principals",
        "teams"
      ]
    },
    "OwnerRoutingViewChat": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "policy_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "visible_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 500,
          "uniqueItems": true
        },
        "replies": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "principal_id": {
                "type": "string",
                "format": "uuid"
              },
              "submitted_replies": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              }
            },
            "required": [
              "principal_id",
              "submitted_replies"
            ]
          },
          "maxItems": 500
        },
        "snapshot_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "policy_digest",
        "visible_ids",
        "replies",
        "snapshot_digest"
      ]
    },
    "human_routing_human-routing-mine": {
      "type": "object",
      "properties": {
        "profiles": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "principal_id": {
                "type": "string",
                "format": "uuid"
              },
              "version": {
                "type": "string",
                "pattern": "^(0|[1-9][0-9]{0,19})$"
              },
              "enabled": {
                "type": "boolean"
              },
              "capacity": {
                "type": "integer",
                "minimum": 0
              },
              "workload": {
                "type": "integer",
                "minimum": 0
              },
              "available": {
                "type": "boolean"
              }
            },
            "required": [
              "principal_id",
              "version",
              "enabled",
              "capacity",
              "workload",
              "available"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        },
        "work": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
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
              "state": {
                "enum": [
                  "waiting",
                  "assigned"
                ]
              },
              "version": {
                "type": "string",
                "pattern": "^(0|[1-9][0-9]{0,19})$"
              },
              "allocation_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "principal_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "team_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "assigned_at": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "date-time"
                  }
                ]
              },
              "queue_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "queue_name": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string"
                  }
                ]
              },
              "blocked_reason": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string"
                  }
                ]
              },
              "wait_started_at": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "date-time"
                  }
                ]
              }
            },
            "required": [
              "id",
              "conversation_id",
              "session_id",
              "state",
              "version",
              "allocation_id",
              "principal_id",
              "team_id",
              "assigned_at",
              "queue_id",
              "queue_name",
              "blocked_reason",
              "wait_started_at"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        }
      },
      "required": [
        "profiles",
        "work"
      ],
      "additionalProperties": false
    },
    "human_routing_human-routing-snapshot": {
      "type": "object",
      "properties": {
        "profiles": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "principal_id": {
                "type": "string",
                "format": "uuid"
              },
              "version": {
                "type": "string",
                "pattern": "^(0|[1-9][0-9]{0,19})$"
              },
              "enabled": {
                "type": "boolean"
              },
              "capacity": {
                "type": "integer",
                "minimum": 0
              },
              "workload": {
                "type": "integer",
                "minimum": 0
              },
              "available": {
                "type": "boolean"
              }
            },
            "required": [
              "principal_id",
              "version",
              "enabled",
              "capacity",
              "workload",
              "available"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        },
        "work": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
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
              "state": {
                "enum": [
                  "waiting",
                  "assigned"
                ]
              },
              "version": {
                "type": "string",
                "pattern": "^(0|[1-9][0-9]{0,19})$"
              },
              "allocation_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "principal_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "team_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "assigned_at": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "date-time"
                  }
                ]
              },
              "queue_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "queue_name": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string"
                  }
                ]
              },
              "blocked_reason": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string"
                  }
                ]
              },
              "wait_started_at": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "date-time"
                  }
                ]
              }
            },
            "required": [
              "id",
              "conversation_id",
              "session_id",
              "state",
              "version",
              "allocation_id",
              "principal_id",
              "team_id",
              "assigned_at",
              "queue_id",
              "queue_name",
              "blocked_reason",
              "wait_started_at"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        },
        "skills": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "skill_key": {
                "type": "string"
              },
              "name": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "skill_key",
              "name"
            ],
            "additionalProperties": false
          },
          "maxItems": 200
        },
        "team_skills": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "team_id": {
                "type": "string",
                "format": "uuid"
              },
              "skill_ids": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uuid"
                },
                "maxItems": 200,
                "uniqueItems": true
              },
              "version": {
                "type": "string",
                "pattern": "^(0|[1-9][0-9]{0,19})$"
              }
            },
            "required": [
              "team_id",
              "skill_ids",
              "version"
            ],
            "additionalProperties": false
          },
          "maxItems": 200
        },
        "queues": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120,
                "pattern": "\\S"
              },
              "team_id": {
                "type": "string",
                "format": "uuid"
              },
              "connection_id": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "string",
                    "format": "uuid"
                  }
                ]
              },
              "skill_ids": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uuid"
                },
                "maxItems": 200,
                "uniqueItems": true
              },
              "priority": {
                "type": "integer",
                "minimum": 0,
                "maximum": 999
              },
              "enabled": {
                "type": "boolean"
              },
              "version": {
                "type": "string",
                "pattern": "^(0|[1-9][0-9]{0,19})$"
              }
            },
            "required": [
              "id",
              "name",
              "team_id",
              "connection_id",
              "skill_ids",
              "priority",
              "enabled",
              "version"
            ],
            "additionalProperties": false
          },
          "maxItems": 50
        },
        "principals": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        },
        "teams": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        },
        "connections": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string"
              },
              "provider": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "provider"
            ],
            "additionalProperties": false
          },
          "maxItems": 201
        },
        "performance": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "principal_id": {
                "type": "string",
                "format": "uuid"
              },
              "assignments": {
                "type": "integer",
                "minimum": 0
              },
              "completed": {
                "type": "integer",
                "minimum": 0
              },
              "transferred": {
                "type": "integer",
                "minimum": 0
              },
              "handling_seconds": {
                "anyOf": [
                  {
                    "type": "null"
                  },
                  {
                    "type": "number",
                    "minimum": 0
                  }
                ]
              }
            },
            "required": [
              "principal_id",
              "assignments",
              "completed",
              "transferred",
              "handling_seconds"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        },
        "replies": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "principal_id": {
                "type": "string",
                "format": "uuid"
              },
              "submitted_replies": {
                "type": "integer",
                "minimum": 0
              }
            },
            "required": [
              "principal_id",
              "submitted_replies"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        },
        "average_wait_seconds": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "number",
              "minimum": 0
            }
          ]
        },
        "period_days": {
          "const": 30
        }
      },
      "required": [
        "profiles",
        "work",
        "skills",
        "team_skills",
        "queues",
        "principals",
        "teams",
        "connections",
        "performance",
        "replies",
        "average_wait_seconds",
        "period_days"
      ],
      "additionalProperties": false
    },
    "OwnerRoutingViewData": {
      "oneOf": [
        {
          "$ref": "#/definitions/human_routing_human-routing-mine"
        },
        {
          "$ref": "#/definitions/human_routing_human-routing-snapshot"
        }
      ]
    },
    "OwnerFunnelPolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "read": {
          "$ref": "#/definitions/OwnerReadPredicate"
        },
        "fields_visible": {
          "type": "boolean"
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "read",
        "fields_visible"
      ]
    },
    "OwnerWorkspacePolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "team_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 200
        },
        "read": {
          "$ref": "#/definitions/OwnerReadPredicate"
        },
        "update": {
          "$ref": "#/definitions/OwnerReadPredicate"
        },
        "allowed_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "filter_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "tags_write": {
          "type": "boolean"
        },
        "inbox_manage_all": {
          "type": "boolean"
        },
        "rows": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "policy": {
                "$ref": "#/definitions/OwnerConversationPolicy"
              }
            },
            "required": [
              "id",
              "policy"
            ]
          },
          "maxItems": 100
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "team_ids",
        "read",
        "update",
        "allowed_fields",
        "filter_fields",
        "tags_write",
        "inbox_manage_all",
        "rows"
      ]
    },
    "OwnerContactDecision": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "allowed": {
          "type": "boolean"
        },
        "fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        }
      },
      "required": [
        "id",
        "allowed",
        "fields"
      ]
    },
    "OwnerContactBinding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "connection_id": {
          "type": "string",
          "format": "uuid"
        },
        "crm_contact_id": {
          "type": "string",
          "format": "uuid"
        },
        "crm_identity_id": {
          "type": "string",
          "format": "uuid"
        },
        "external_subject_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "mapping_revision": {
          "const": "1"
        },
        "contact_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "connection_id",
        "crm_contact_id",
        "crm_identity_id",
        "external_subject_digest",
        "mapping_revision",
        "contact_revision"
      ]
    },
    "OwnerIngressReferences": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "connection_id": {
          "type": "string",
          "format": "uuid"
        },
        "crm_contact_id": {
          "type": "string",
          "format": "uuid"
        },
        "crm_identity_id": {
          "type": "string",
          "format": "uuid"
        },
        "external_subject_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "mapping_revision": {
          "const": "1"
        },
        "contact_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "platform": {
          "const": "mock_messenger"
        },
        "connection_revision": {
          "const": "1"
        }
      },
      "required": [
        "connection_id",
        "crm_contact_id",
        "crm_identity_id",
        "external_subject_digest",
        "mapping_revision",
        "contact_revision",
        "platform",
        "connection_revision"
      ]
    },
    "OwnerIngressChannel": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "service_actor_id": {
          "type": "string",
          "format": "uuid"
        },
        "team_id": {
          "type": "string",
          "format": "uuid"
        },
        "channel_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255
        }
      },
      "required": [
        "service_actor_id",
        "team_id",
        "channel_id"
      ]
    },
    "OwnerIngressTouchpoint": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "receipt_id": {
          "type": "string",
          "format": "uuid"
        },
        "provider_message_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "occurred_at": {
          "type": "string",
          "format": "date-time"
        },
        "ad_id": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            {
              "type": "null"
            }
          ]
        },
        "campaign_id": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "receipt_id",
        "provider_message_digest",
        "occurred_at",
        "ad_id",
        "campaign_id"
      ]
    },
    "OwnerIngressResult": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "receipt_id": {
          "type": "string",
          "format": "uuid"
        },
        "state": {
          "enum": [
            "processed",
            "failed"
          ]
        },
        "conversation_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "message_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "touchpoint_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "session_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "receipt_id",
        "state",
        "conversation_id",
        "message_id",
        "touchpoint_id",
        "session_id"
      ]
    },
    "OwnerTouchpointReceipt": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "command": {
          "$ref": "#/definitions/OwnerCommandRef"
        },
        "state": {
          "enum": [
            "prepared",
            "bound",
            "discarded",
            "cancelled"
          ]
        },
        "conversation_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "message_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "session_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "command",
        "state",
        "conversation_id",
        "message_id",
        "session_id"
      ]
    },
    "OwnerIngressVerdict": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "input_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "state": {
          "enum": [
            "valid",
            "denied"
          ]
        },
        "error_code": {
          "enum": [
            null,
            "CONTACT_BINDING_STALE",
            "REVOKED"
          ]
        },
        "service_actor_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "input_digest",
        "state",
        "error_code",
        "service_actor_id",
        "team_id"
      ]
    },
    "OwnerBoundaryFailure": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "code": {
          "enum": [
            "INVALID_REQUEST",
            "UNAUTHENTICATED",
            "FORBIDDEN",
            "REVOKED",
            "NOT_FOUND",
            "CONFLICT",
            "STALE_VERSION",
            "CAPACITY",
            "INVALID_TRANSITION",
            "LIMIT_EXCEEDED",
            "REFERENCE_INVALID",
            "PRECONDITION_REQUIRED",
            "DEPENDENCY_UNAVAILABLE"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "code"
      ]
    },
    "Public_AuthErrorResponse": {
      "title": "AuthErrorResponse",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "error",
        "meta"
      ],
      "properties": {
        "error": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "code",
            "message",
            "fields",
            "retryable"
          ],
          "properties": {
            "code": {
              "type": "string"
            },
            "message": {
              "type": "string"
            },
            "fields": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "retryable": {
              "type": "boolean"
            }
          }
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "correlation_id"
          ],
          "properties": {
            "correlation_id": {
              "type": "string",
              "format": "uuid"
            }
          }
        }
      }
    },
    "Request_crm-ingress-verdict": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "ingress-verdict"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "crm_contact_id": {
              "type": "string",
              "format": "uuid"
            },
            "crm_identity_id": {
              "type": "string",
              "format": "uuid"
            },
            "external_subject_digest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            "mapping_revision": {
              "const": "1"
            }
          },
          "required": [
            "connection_id",
            "crm_contact_id",
            "crm_identity_id",
            "external_subject_digest",
            "mapping_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-ingress-verdict": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerIngressVerdict"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-ingress-verdict": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "ingress-verdict"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "platform": {
              "const": "mock_messenger"
            }
          },
          "required": [
            "connection_id",
            "platform"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-ingress-verdict": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerIngressVerdict"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-ingress-verdict": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "ingress-verdict"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "service_actor_id": {
              "type": "string",
              "format": "uuid"
            },
            "team_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "service_actor_id",
            "team_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-ingress-verdict": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerIngressVerdict"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-touchpoint-prepare": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "touchpoint-prepare"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-touchpoint-prepare": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerTouchpointReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-touchpoint-finalize": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "touchpoint-finalize"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-touchpoint-finalize": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerTouchpointReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-proof"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-proof"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-proof"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-proof"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-proof"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_ai-runtime-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-proof"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_ai-runtime-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_ai-runtime-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_ai-runtime-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-proof"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_workflow-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_workflow-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_reporting-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-proof"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_reporting-command-proof": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_reporting-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "command-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_reporting-command-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecoveryProof"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admit": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admit"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "owner": {
              "enum": [
                "chat",
                "identity",
                "crm",
                "connector",
                "routing",
                "ai-runtime",
                "workflow",
                "reporting",
                "external-api",
                "bff",
                "sales"
              ]
            },
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            }
          },
          "required": [
            "owner",
            "command"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admit": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerAdmission"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "owner": {
              "enum": [
                "chat",
                "identity",
                "crm",
                "connector",
                "routing",
                "ai-runtime",
                "workflow",
                "reporting",
                "external-api",
                "bff",
                "sales"
              ]
            },
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "owner",
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerAdmission"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-cursor-subject": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-cursor-subject"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-cursor-subject": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "account_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "account_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-catalog-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-catalog-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-catalog-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "enum": [
                "tags",
                "snippets"
              ]
            },
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "can_read": {
              "type": "boolean"
            },
            "can_manage": {
              "type": "boolean"
            }
          },
          "required": [
            "kind",
            "principal_id",
            "auth_revision",
            "can_read",
            "can_manage"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-conversation-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-conversation-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-conversation-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerConversationPolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-assignment-directory": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-assignment-directory"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-assignment-directory": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerAssignmentDirectory"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-routing-view": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-routing-view"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-routing-view": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRoutingViewPolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-routing-view-directory": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-view-directory"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-routing-view-directory": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRoutingViewDirectory"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-view": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-view"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-routing-view": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRoutingViewChat"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-routing-view-connections": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-view-connections"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-routing-view-connections": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "policy_digest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  },
                  "provider": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100
                  }
                },
                "required": [
                  "id",
                  "name",
                  "provider"
                ]
              },
              "maxItems": 201
            }
          },
          "required": [
            "policy_digest",
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-assignment-directory-capacity": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "assignment-directory-capacity"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-assignment-directory-capacity": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "directory_digest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "eligible": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "id",
                  "eligible"
                ]
              },
              "maxItems": 200
            }
          },
          "required": [
            "directory_digest",
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-proposal": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-proposal"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "team_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id",
            "team_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-proposal": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerAssignmentDirectory"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-dispatch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-dispatch"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "resource": {
              "$ref": "#/definitions/OwnerResource"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "target": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "principal_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "kind": {
                  "const": "human"
                },
                "team_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "principal_id",
                "kind",
                "team_id"
              ]
            },
            "pin": {
              "$ref": "#/definitions/OwnerRoutingDispatchPin"
            }
          },
          "required": [
            "resource",
            "session_id",
            "target",
            "pin"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-dispatch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "state": {
              "const": "committed"
            },
            "reconciliation": {
              "enum": [
                "pending",
                "complete"
              ]
            }
          },
          "required": [
            "command",
            "state",
            "reconciliation"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-reroute-source": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-reroute-source"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-reroute-source": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "resource": {
              "$ref": "#/definitions/OwnerResource"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "resource",
            "session_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-reroute": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-reroute"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "resource": {
              "$ref": "#/definitions/OwnerResource"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "target": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "principal_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "kind": {
                  "anyOf": [
                    {
                      "const": "human"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "team_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "principal_id",
                "kind",
                "team_id"
              ]
            },
            "pin": {
              "$ref": "#/definitions/OwnerRoutingReroutePin"
            }
          },
          "required": [
            "resource",
            "session_id",
            "target",
            "pin"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-reroute": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "state": {
              "const": "committed"
            },
            "reconciliation": {
              "enum": [
                "pending",
                "complete"
              ]
            }
          },
          "required": [
            "command",
            "state",
            "reconciliation"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-workspace-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-workspace-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "resources": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerResource"
              },
              "maxItems": 100
            }
          },
          "required": [
            "command",
            "admission_id",
            "resources"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-workspace-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerWorkspacePolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-contact-batch-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-contact-batch-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "resources": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerResource"
              },
              "maxItems": 100
            }
          },
          "required": [
            "command",
            "admission_id",
            "resources"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-contact-batch-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "data": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerContactDecision"
              },
              "maxItems": 100
            }
          },
          "required": [
            "principal_id",
            "auth_revision",
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-contact-summary-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contact-summary-batch"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 100,
              "uniqueItems": true
            }
          },
          "required": [
            "command",
            "admission_id",
            "ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-contact-summary-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "contact_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "summary": {
                    "anyOf": [
                      {
                        "$ref": "#/definitions/OwnerContactSummary"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                },
                "required": [
                  "contact_id",
                  "summary"
                ]
              },
              "maxItems": 100
            }
          },
          "required": [
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-contact-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-contact-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "resource": {
              "$ref": "#/definitions/OwnerResource"
            }
          },
          "required": [
            "command",
            "admission_id",
            "resource"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-contact-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "allowed": {
              "type": "boolean"
            },
            "fields": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 128
              },
              "maxItems": 200,
              "uniqueItems": true
            }
          },
          "required": [
            "principal_id",
            "auth_revision",
            "allowed",
            "fields"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-contact-summary-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contact-summary-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-contact-summary-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "contact_id": {
              "type": "string",
              "format": "uuid"
            },
            "summary": {
              "anyOf": [
                {
                  "$ref": "#/definitions/OwnerContactSummary"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "contact_id",
            "summary"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-detail-channel-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "detail-channel-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id",
            "conversation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-detail-channel-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "channel": {
              "enum": [
                "mock_messenger",
                "messenger"
              ]
            },
            "channel_id": {
              "type": "string",
              "format": "uuid"
            },
            "page_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "channel_name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "attribution": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "source": {
                  "enum": [
                    "unknown",
                    "ctm"
                  ]
                },
                "ad_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "campaign_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "source",
                "ad_id",
                "campaign_id"
              ]
            }
          },
          "required": [
            "channel",
            "channel_id",
            "page_id",
            "channel_name",
            "attribution"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-detail-channel-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "detail-channel-batch"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "connection_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "conversation_id": {
                    "type": "string",
                    "format": "uuid"
                  }
                },
                "required": [
                  "connection_id",
                  "conversation_id"
                ]
              },
              "maxItems": 100
            }
          },
          "required": [
            "items"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-detail-channel-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "conversation_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "metadata": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "channel": {
                        "enum": [
                          "mock_messenger",
                          "messenger"
                        ]
                      },
                      "channel_id": {
                        "type": "string",
                        "format": "uuid"
                      },
                      "page_id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 255
                      },
                      "channel_name": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 255
                      },
                      "attribution": {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "source": {
                            "enum": [
                              "unknown",
                              "ctm"
                            ]
                          },
                          "ad_id": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 255
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "campaign_id": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 255
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        },
                        "required": [
                          "source",
                          "ad_id",
                          "campaign_id"
                        ]
                      }
                    },
                    "required": [
                      "channel",
                      "channel_id",
                      "page_id",
                      "channel_name",
                      "attribution"
                    ]
                  }
                },
                "required": [
                  "conversation_id",
                  "metadata"
                ]
              },
              "maxItems": 100
            }
          },
          "required": [
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-source-channel-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "source-channel-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id",
            "conversation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-source-channel-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "channel": {
              "enum": [
                "mock_messenger",
                "messenger"
              ]
            },
            "channel_id": {
              "type": "string",
              "format": "uuid"
            },
            "page_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "channel_name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "attribution": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "source": {
                  "enum": [
                    "unknown",
                    "ctm"
                  ]
                },
                "ad_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "campaign_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "source",
                "ad_id",
                "campaign_id"
              ]
            },
            "source_touchpoint_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "channel",
            "channel_id",
            "page_id",
            "channel_name",
            "attribution",
            "source_touchpoint_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-inbox-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-inbox-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-inbox-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "team_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 200
            },
            "can_manage_own": {
              "type": "boolean"
            },
            "can_manage_all": {
              "type": "boolean"
            },
            "can_share_own": {
              "type": "boolean"
            },
            "filter_fields": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 128
              },
              "maxItems": 200,
              "uniqueItems": true
            },
            "directory": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "teams": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "id": {
                            "type": "string",
                            "format": "uuid"
                          },
                          "name": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 255
                          }
                        },
                        "required": [
                          "id",
                          "name"
                        ]
                      },
                      "maxItems": 200
                    },
                    "principals": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "id": {
                            "type": "string",
                            "format": "uuid"
                          },
                          "name": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 255
                          }
                        },
                        "required": [
                          "id",
                          "name"
                        ]
                      },
                      "maxItems": 500
                    }
                  },
                  "required": [
                    "teams",
                    "principals"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "principal_id",
            "auth_revision",
            "team_ids",
            "can_manage_own",
            "can_manage_all",
            "can_share_own",
            "filter_fields",
            "directory"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-catalog-connection-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-connection-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-catalog-connection-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-history-platform-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "history-platform-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-history-platform-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "platform": {
              "const": "mock_messenger"
            }
          },
          "required": [
            "connection_id",
            "platform"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-contact-binding-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contact-binding-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "crm_contact_id": {
              "type": "string",
              "format": "uuid"
            },
            "crm_identity_id": {
              "type": "string",
              "format": "uuid"
            },
            "external_subject_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            }
          },
          "required": [
            "connection_id",
            "crm_contact_id",
            "crm_identity_id",
            "external_subject_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-contact-binding-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerContactBinding"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-connection-binding-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "connection-binding-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-connection-binding-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "platform": {
              "const": "mock_messenger"
            },
            "connection_revision": {
              "const": "1"
            },
            "channel_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "team_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id",
            "platform",
            "connection_revision",
            "channel_id",
            "team_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-connection-ingress-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "connection-ingress-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-connection-ingress-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "platform": {
              "const": "mock_messenger"
            },
            "connection_revision": {
              "const": "1"
            },
            "channel_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "team_id": {
              "type": "string",
              "format": "uuid"
            },
            "service_actor_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id",
            "platform",
            "connection_revision",
            "channel_id",
            "team_id",
            "service_actor_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-transport-disable": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "transport-disable"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "barrier_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id",
            "barrier_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-transport-disable": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "barrier_id": {
              "type": "string",
              "format": "uuid"
            },
            "state": {
              "enum": [
                "disabled",
                "enabled",
                "absent"
              ]
            }
          },
          "required": [
            "connection_id",
            "barrier_id",
            "state"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-transport-enable": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "transport-enable"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "barrier_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id",
            "barrier_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-transport-enable": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "barrier_id": {
              "type": "string",
              "format": "uuid"
            },
            "state": {
              "enum": [
                "disabled",
                "enabled",
                "absent"
              ]
            }
          },
          "required": [
            "connection_id",
            "barrier_id",
            "state"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-transport-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "transport-status"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "barrier_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "connection_id",
            "barrier_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-transport-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "barrier_id": {
              "type": "string",
              "format": "uuid"
            },
            "state": {
              "enum": [
                "disabled",
                "enabled",
                "absent"
              ]
            }
          },
          "required": [
            "connection_id",
            "barrier_id",
            "state"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-settle": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "settle"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "owner": {
              "enum": [
                "chat",
                "identity",
                "crm",
                "connector",
                "routing",
                "ai-runtime",
                "workflow",
                "reporting",
                "external-api",
                "bff",
                "sales"
              ]
            },
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "owner",
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-settle": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerAdmission"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-target-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "target-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "team_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "principal_id",
            "team_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-target-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "target": {
              "$ref": "#/definitions/OwnerTarget"
            },
            "observed_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "target",
            "observed_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-principal-kind-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "principal-kind-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "principal_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-principal-kind-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "kind": {
              "enum": [
                "human",
                "ai",
                null
              ]
            }
          },
          "required": [
            "principal_id",
            "kind"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-barrier-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "barrier-status"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "barrier_id": {
              "type": "string",
              "format": "uuid"
            },
            "delegation_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "barrier_id",
            "delegation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-barrier-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerBarrier"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-directory": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "directory"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "enum": [
                "principals",
                "teams",
                "inbox-targets",
                "assignment-targets"
              ]
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            },
            "resource": {
              "anyOf": [
                {
                  "$ref": "#/definitions/OwnerResource"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "kind",
            "page",
            "resource"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_identity-directory": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerBatch"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-capacity-reserve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "capacity-reserve"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "session_id",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-capacity-reserve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerCapacity"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-capacity-confirm": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "capacity-confirm"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "session_id",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-capacity-confirm": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerCapacity"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-capacity-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "capacity-release"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "session_id",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-capacity-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerCapacity"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-capacity-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "capacity-status"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "session_id",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-capacity-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerCapacity"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-reference-reserve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "reference-reserve"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "resource_id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "enum": [
                "contact",
                "mapping",
                "metadata"
              ]
            },
            "expected_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "resource_id",
            "kind",
            "expected_revision",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-reference-reserve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerReference"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-reference-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "reference-status"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "resource_id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "enum": [
                "contact",
                "mapping",
                "metadata"
              ]
            },
            "expected_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "resource_id",
            "kind",
            "expected_revision",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-reference-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerReference"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-reference-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "reference-release"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "resource_id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "enum": [
                "contact",
                "mapping",
                "metadata"
              ]
            },
            "expected_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "resource_id",
            "kind",
            "expected_revision",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-reference-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerReference"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-reference-reserve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "reference-reserve"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "resource_id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "enum": [
                "connection",
                "touchpoint"
              ]
            },
            "expected_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "resource_id",
            "kind",
            "expected_revision",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-reference-reserve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerReference"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-reference-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "reference-status"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "resource_id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "enum": [
                "connection",
                "touchpoint"
              ]
            },
            "expected_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "resource_id",
            "kind",
            "expected_revision",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-reference-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerReference"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-reference-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "reference-release"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "resource_id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "enum": [
                "connection",
                "touchpoint"
              ]
            },
            "expected_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "resource_id",
            "kind",
            "expected_revision",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-reference-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerReference"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-contact-archive-guard": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contact-archive-guard"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "contact_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "contact_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-contact-archive-guard": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerReference"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "contact_resolution_contact-lookup-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "mapping": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "tenant_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "connection_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "external_subject_id": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255,
                      "pattern": "^(?!.*[\\u0000-\\u001f\\u007f])(?=.*\\S).*$"
                    },
                    "crm_contact_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "crm_identity_id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "mapping_revision": {
                      "const": "1"
                    }
                  },
                  "required": [
                    "tenant_id",
                    "connection_id",
                    "external_subject_id",
                    "crm_contact_id",
                    "crm_identity_id",
                    "mapping_revision"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "mapping"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_crm-contact-lookup": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contact-lookup"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "external_subject_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            }
          },
          "required": [
            "connection_id",
            "external_subject_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_crm-contact-lookup": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/contact_resolution_contact-lookup-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "contact_resolution_contact-resolve-request": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "external_subject_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^(?!.*[\\u0000-\\u001f\\u007f])(?=.*\\S).*$"
        },
        "operation_id": {
          "type": "string",
          "format": "uuid"
        },
        "display_label": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^(?!.*[\\u0000-\\u001f\\u007f])(?=.*\\S).*$"
        }
      },
      "required": [
        "external_subject_id",
        "operation_id"
      ]
    },
    "contact_resolution_contact-resolve-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "mapping": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "tenant_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "connection_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "external_subject_id": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 255,
                  "pattern": "^(?!.*[\\u0000-\\u001f\\u007f])(?=.*\\S).*$"
                },
                "crm_contact_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "crm_identity_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "mapping_revision": {
                  "const": "1"
                }
              },
              "required": [
                "tenant_id",
                "connection_id",
                "external_subject_id",
                "crm_contact_id",
                "crm_identity_id",
                "mapping_revision"
              ]
            },
            "created": {
              "type": "boolean"
            }
          },
          "required": [
            "mapping",
            "created"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_crm-contact-resolve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contact-resolve"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "input": {
              "$ref": "#/definitions/contact_resolution_contact-resolve-request"
            }
          },
          "required": [
            "connection_id",
            "input"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_crm-contact-resolve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/contact_resolution_contact-resolve-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-contact-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contact-batch"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 100,
              "uniqueItems": true
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            }
          },
          "required": [
            "ids",
            "page"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_crm-contact-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerBatch"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_crm-descriptor-response": {
      "type": "object",
      "properties": {
        "data": {
          "type": "object",
          "properties": {
            "object_key": {
              "type": "string"
            },
            "standard": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "key": {
                    "type": "string"
                  },
                  "label": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "required": {
                    "type": "boolean"
                  },
                  "indexed": {
                    "type": "boolean"
                  },
                  "immutable": {
                    "type": "boolean"
                  },
                  "writable": {
                    "type": "boolean"
                  },
                  "options": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "key",
                  "label",
                  "type",
                  "writable",
                  "indexed"
                ],
                "additionalProperties": false
              }
            },
            "custom": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "key": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9_]{0,63}$"
                  },
                  "label": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 255
                  },
                  "type": {
                    "enum": [
                      "string",
                      "text",
                      "integer",
                      "decimal",
                      "boolean",
                      "date",
                      "datetime",
                      "enum"
                    ]
                  },
                  "required": {
                    "type": "boolean"
                  },
                  "default_value": {},
                  "options": {
                    "anyOf": [
                      {
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "indexed": {
                    "type": "boolean"
                  },
                  "sensitive": {
                    "type": "boolean"
                  },
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "version": {
                    "type": "string",
                    "pattern": "^[1-9][0-9]{0,19}$"
                  },
                  "writable": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "key",
                  "label",
                  "type",
                  "required",
                  "default_value",
                  "options",
                  "indexed",
                  "sensitive",
                  "id",
                  "version",
                  "writable"
                ]
              }
            },
            "order": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "object_key",
            "standard",
            "custom",
            "order"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "additionalProperties": false
    },
    "Request_crm-metadata-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "metadata-read"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "object_key": {
              "enum": [
                "conversation",
                "conversation_session",
                "conversation_need"
              ]
            },
            "schema_revision": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "object_key",
            "schema_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_crm-metadata-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_crm-descriptor-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-metadata-schema-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "metadata-schema-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "object_key": {
              "enum": [
                "conversation",
                "conversation_session",
                "conversation_need"
              ]
            },
            "schema_revision": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "object_key",
            "schema_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-metadata-schema-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerMetadataSnapshot"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-channel-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "channel-batch"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 100,
              "uniqueItems": true
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            }
          },
          "required": [
            "ids",
            "page"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_connector-channel-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerBatch"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "OwnerNotePin": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "body_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "request_hash": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "body_digest",
        "request_hash",
        "key",
        "correlation_id"
      ]
    },
    "OwnerNoteReceipt": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "command": {
          "$ref": "#/definitions/OwnerCommandRef"
        },
        "state": {
          "enum": [
            "committed",
            "aborted"
          ]
        },
        "activity_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "occurred_at": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "command",
        "state",
        "activity_id",
        "occurred_at"
      ]
    },
    "Request_identity-admission-note-child": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-note-child"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-note-child": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerAdmission"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-note-create": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "note-create"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "text": {
              "type": "string",
              "minLength": 1,
              "maxLength": 4000
            }
          },
          "required": [
            "command",
            "text"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-note-create": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerNoteReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-note-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "note-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-note-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerNoteReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "OwnerNotePolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "all": {
          "type": "boolean"
        },
        "own": {
          "type": "boolean"
        },
        "team_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 200
        },
        "body": {
          "type": "boolean"
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "all",
        "own",
        "team_ids",
        "body"
      ]
    },
    "OwnerActivityPolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "allowed_fields": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "maxItems": 200,
          "uniqueItems": true
        },
        "automation_read": {
          "type": "boolean"
        },
        "note_policy_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "allowed_fields",
        "automation_read",
        "note_policy_digest"
      ]
    },
    "OwnerSessionProgressPolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "auth_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "can_edit": {
          "type": "boolean"
        }
      },
      "required": [
        "principal_id",
        "auth_revision",
        "can_edit"
      ]
    },
    "Request_identity-admission-session-progress-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-session-progress-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-session-progress-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerSessionProgressPolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-funnel-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-funnel-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-funnel-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerFunnelPolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-funnel-contact-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-funnel-contact-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "resources": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerResource"
              },
              "maxItems": 25
            }
          },
          "required": [
            "command",
            "admission_id",
            "resources"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-funnel-contact-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "visible_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 25,
              "uniqueItems": true
            }
          },
          "required": [
            "principal_id",
            "auth_revision",
            "visible_ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-funnel-contact-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "funnel-contact-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 100,
              "uniqueItems": true
            }
          },
          "required": [
            "command",
            "admission_id",
            "ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-funnel-contact-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "visible_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 100,
              "uniqueItems": true
            }
          },
          "required": [
            "visible_ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-classification-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-classification-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-classification-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerClassificationPolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-classification-metadata-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "classification-metadata-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "schema_revision": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "schema_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-classification-metadata-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerClassificationMetadata"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-need-metadata-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "need-metadata-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "schema_revision": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "schema_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-need-metadata-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerClassificationMetadata"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-need-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-need-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-need-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerClassificationPolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-need-outcomes-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-need-outcomes-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "resources": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerResource"
              },
              "maxItems": 25
            }
          },
          "required": [
            "command",
            "admission_id",
            "resources"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-need-outcomes-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "visible": {
                    "type": "boolean"
                  },
                  "can_link": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "id",
                  "visible",
                  "can_link"
                ]
              },
              "maxItems": 25
            }
          },
          "required": [
            "principal_id",
            "auth_revision",
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-outcome-link-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-outcome-link-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "resource": {
              "$ref": "#/definitions/OwnerResource"
            }
          },
          "required": [
            "command",
            "admission_id",
            "resource"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-outcome-link-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "allowed": {
              "type": "boolean"
            }
          },
          "required": [
            "principal_id",
            "auth_revision",
            "allowed"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-outcome-link-inspect": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "outcome-link-inspect"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-outcome-link-inspect": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerOutcomeSource"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-outcome-link-apply": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "outcome-link-apply"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-outcome-link-apply": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerOutcomeReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-outcome-link-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "outcome-link-abort"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-outcome-link-abort": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerOutcomeReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-need-outcomes-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "need-outcomes-list"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-need-outcomes-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "label": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 255
                  },
                  "linked": {
                    "type": "boolean"
                  },
                  "can_link": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "id",
                  "label",
                  "linked",
                  "can_link"
                ]
              },
              "maxItems": 100
            }
          },
          "required": [
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-contribution-sources-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contribution-sources-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 50,
              "uniqueItems": true
            }
          },
          "required": [
            "command",
            "admission_id",
            "ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-contribution-sources-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "visible_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 50,
              "uniqueItems": true
            }
          },
          "required": [
            "visible_ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-contribution-sources-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contribution-sources-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 50,
              "uniqueItems": true
            }
          },
          "required": [
            "command",
            "admission_id",
            "ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-contribution-sources-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "visible_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 50,
              "uniqueItems": true
            }
          },
          "required": [
            "visible_ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-contribution-sales-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-contribution-sales-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "resources": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerResource"
              },
              "maxItems": 50
            }
          },
          "required": [
            "command",
            "admission_id",
            "resources"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-contribution-sales-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "visible_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 50,
              "uniqueItems": true
            }
          },
          "required": [
            "principal_id",
            "auth_revision",
            "visible_ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-session-contact-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-session-contact-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "resource": {
              "$ref": "#/definitions/OwnerResource"
            }
          },
          "required": [
            "command",
            "admission_id",
            "resource"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-session-contact-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_id": {
              "type": "string",
              "format": "uuid"
            },
            "auth_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "allowed": {
              "type": "boolean"
            }
          },
          "required": [
            "principal_id",
            "auth_revision",
            "allowed"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-session-contact-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "session-contact-read"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-session-contact-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "contact_id": {
              "type": "string",
              "format": "uuid"
            },
            "version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "contact_id",
            "version"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-activity-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-activity-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-activity-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerActivityPolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-activity-notes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "activity-notes"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 2000,
              "uniqueItems": true
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "command",
            "admission_id",
            "ids",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-activity-notes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "policy_digest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            "state": {
              "enum": [
                "ready",
                "delayed",
                "unavailable"
              ]
            },
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "activity_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "body": {
                    "anyOf": [
                      {
                        "type": "string",
                        "maxLength": 65536
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                },
                "required": [
                  "activity_id"
                ]
              },
              "maxItems": 100
            }
          },
          "required": [
            "policy_digest",
            "state",
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-activity-runs": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "activity-runs"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 2000,
              "uniqueItems": true
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "command",
            "admission_id",
            "ids",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_workflow-activity-runs": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "policy_digest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            "state": {
              "enum": [
                "ready",
                "delayed",
                "unavailable"
              ]
            },
            "data": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "run_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "definition_version_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "revision": {
                    "type": "string",
                    "pattern": "^[1-9][0-9]{0,19}$"
                  }
                },
                "required": [
                  "run_id",
                  "definition_version_id",
                  "revision"
                ]
              },
              "maxItems": 100
            }
          },
          "required": [
            "policy_digest",
            "state",
            "data"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-admission-note-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "admission-note-policy"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "command",
            "admission_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-admission-note-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerNotePolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "conversation_conversation-notes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "created_at": {
                "type": "string",
                "format": "date-time"
              },
              "body": {
                "type": [
                  "string",
                  "null"
                ]
              }
            },
            "required": [
              "id",
              "created_at"
            ]
          }
        },
        "next_cursor": {
          "type": [
            "string",
            "null"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Request_crm-note-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "note-list"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "admission_id": {
              "type": "string",
              "format": "uuid"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            },
            "cursor": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "admission_id",
            "limit",
            "cursor"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-note-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/conversation_conversation-notes"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-note-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "note-read"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "activity_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "conversation_id",
            "activity_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_crm-note-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerProjectedRecord"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-activity-binding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "activity-binding"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "source_id": {
              "type": "string",
              "format": "uuid"
            },
            "minimum_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "source_id",
            "minimum_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_crm-activity-binding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerActivityBinding"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-activity-binding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "activity-binding"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "source_id": {
              "type": "string",
              "format": "uuid"
            },
            "minimum_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "source_id",
            "minimum_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_workflow-activity-binding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerActivityBinding"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "OwnerActivityNotificationBinding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "source_id": {
          "type": "string",
          "format": "uuid"
        },
        "revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "definition_version_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "projection": {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "contact_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "connection_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "contact_id",
                "connection_id"
              ]
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "conversation_id",
        "source_id",
        "revision",
        "definition_version_id",
        "projection"
      ]
    },
    "Request_crm-activity-notification-binding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "activity-notification-binding"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "source_id": {
              "type": "string",
              "format": "uuid"
            },
            "minimum_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "source_id",
            "minimum_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-activity-notification-binding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerActivityNotificationBinding"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-activity-notification-binding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "activity-notification-binding"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "source_id": {
              "type": "string",
              "format": "uuid"
            },
            "minimum_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "source_id",
            "minimum_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_workflow-activity-notification-binding": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerActivityNotificationBinding"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-session-source": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "session-source"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "contact_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "conversation_id",
            "session_id",
            "contact_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-session-source": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerSessionSource"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "customer360_sales-session-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "context_id": {
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
            "kind": {
              "const": "follow_up"
            }
          },
          "required": [
            "id",
            "version",
            "context_id",
            "conversation_id",
            "session_id",
            "kind"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_sales-session-link": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "session-link"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "record_id": {
              "type": "string",
              "format": "uuid"
            },
            "expected_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "source": {
              "$ref": "#/definitions/OwnerSessionSource"
            }
          },
          "required": [
            "record_id",
            "expected_version",
            "source"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_sales-session-link": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/customer360_sales-session-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-need-outcome-link": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "need-outcome-link"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "record_id": {
              "type": "string",
              "format": "uuid"
            },
            "contact_id": {
              "type": "string",
              "format": "uuid"
            },
            "expected_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "session_id",
            "need_id",
            "record_id",
            "contact_id",
            "expected_version"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_sales-need-outcome-link": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerOutcome"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-need-outcome-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "need-outcome-read"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "contact_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "conversation_id",
            "session_id",
            "need_id",
            "contact_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_sales-need-outcome-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerOutcome"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-outcome-reserve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "outcome-reserve"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "conversation_id",
            "session_id",
            "need_id",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-outcome-reserve": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerOutcome"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-outcome-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "outcome-release"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "conversation_id",
            "session_id",
            "need_id",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-outcome-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerOutcome"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-outcome-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "outcome-status"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "reservation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "command",
            "conversation_id",
            "session_id",
            "need_id",
            "reservation_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-outcome-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerOutcome"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-recover-need": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "recover-need"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "assessment_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
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
            },
            "min_confidence": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            },
            "cooldown_seconds": {
              "type": "integer",
              "minimum": 0,
              "maximum": 31536000
            },
            "max_age_seconds": {
              "type": "integer",
              "minimum": 1,
              "maximum": 31536000
            },
            "graph": {
              "$ref": "#/definitions/OwnerGraph"
            }
          },
          "required": [
            "conversation_id",
            "session_id",
            "need_id",
            "assessment_version",
            "team_id",
            "preference",
            "min_confidence",
            "cooldown_seconds",
            "max_age_seconds",
            "graph"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-recover-need": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRecovery"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-record-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "record-batch"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 100,
              "uniqueItems": true
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            }
          },
          "required": [
            "ids",
            "page"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-record-batch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerBatch"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_crm-record-patch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "fields": {
          "type": "object",
          "additionalProperties": true
        },
        "custom_values": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "required": [],
      "minProperties": 1
    },
    "Public_crm-record-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_crm-record"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Public_crm-record": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "object_key": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9_]{0,63}$"
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "owner_principal_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "archived": {
          "type": "boolean"
        },
        "fields": {
          "type": "object",
          "additionalProperties": true
        },
        "custom_values": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "required": [
        "id",
        "tenant_id",
        "object_key",
        "version",
        "owner_revision",
        "owner_principal_id",
        "team_id",
        "archived",
        "fields",
        "custom_values"
      ]
    },
    "Request_chat-custom-values-patch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "custom-values-patch"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "expected_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "schema_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "input": {
              "$ref": "#/definitions/Public_crm-record-patch"
            },
            "hydrate_record": {
              "const": true
            }
          },
          "required": [
            "conversation_id",
            "expected_version",
            "schema_revision",
            "input"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-custom-values-patch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_crm-record-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-record-get": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "record-get"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-record-get": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_crm-record-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-record-patch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "record-patch"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "body": {
              "$ref": "#/definitions/Public_crm-record-patch"
            }
          },
          "required": [
            "id",
            "expected_version",
            "idempotency_key",
            "body"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-record-patch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_crm-record-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_crm-archive": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "reason": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        }
      },
      "required": [
        "reason"
      ]
    },
    "Request_chat-record-archive": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "record-archive"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "expected_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "input": {
              "$ref": "#/definitions/Public_crm-archive"
            }
          },
          "required": [
            "conversation_id",
            "expected_version",
            "input"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-record-archive": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_crm-record-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-facts"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 5000,
              "uniqueItems": true
            },
            "from": {
              "type": "string",
              "format": "date-time"
            },
            "to": {
              "type": "string",
              "format": "date-time"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "process_version_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            },
            "snapshot_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "session_ids",
            "from",
            "to",
            "as_of",
            "process_version_id",
            "page",
            "snapshot_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "rows": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerSnapshotRow"
              },
              "maxItems": 100
            },
            "snapshot": {
              "$ref": "#/definitions/OwnerSnapshot"
            },
            "freshness": {
              "$ref": "#/definitions/OwnerFreshness"
            }
          },
          "required": [
            "rows",
            "snapshot",
            "freshness"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-conversion-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversion-facts"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 5000,
              "uniqueItems": true
            },
            "from": {
              "type": "string",
              "format": "date-time"
            },
            "to": {
              "type": "string",
              "format": "date-time"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "process_version_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            },
            "snapshot_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "session_ids",
            "from",
            "to",
            "as_of",
            "process_version_id",
            "page",
            "snapshot_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversion-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "rows": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerSnapshotRow"
              },
              "maxItems": 100
            },
            "snapshot": {
              "$ref": "#/definitions/OwnerSnapshot"
            },
            "freshness": {
              "$ref": "#/definitions/OwnerFreshness"
            }
          },
          "required": [
            "rows",
            "snapshot",
            "freshness"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-stage-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "stage-facts"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 5000,
              "uniqueItems": true
            },
            "from": {
              "type": "string",
              "format": "date-time"
            },
            "to": {
              "type": "string",
              "format": "date-time"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "process_version_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            },
            "snapshot_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "session_ids",
            "from",
            "to",
            "as_of",
            "process_version_id",
            "page",
            "snapshot_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-stage-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "rows": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerSnapshotRow"
              },
              "maxItems": 100
            },
            "snapshot": {
              "$ref": "#/definitions/OwnerSnapshot"
            },
            "freshness": {
              "$ref": "#/definitions/OwnerFreshness"
            }
          },
          "required": [
            "rows",
            "snapshot",
            "freshness"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-progress-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "progress-facts"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 5000,
              "uniqueItems": true
            },
            "from": {
              "type": "string",
              "format": "date-time"
            },
            "to": {
              "type": "string",
              "format": "date-time"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "process_version_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            },
            "snapshot_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "session_ids",
            "from",
            "to",
            "as_of",
            "process_version_id",
            "page",
            "snapshot_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-progress-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "rows": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerSnapshotRow"
              },
              "maxItems": 100
            },
            "snapshot": {
              "$ref": "#/definitions/OwnerSnapshot"
            },
            "freshness": {
              "$ref": "#/definitions/OwnerFreshness"
            }
          },
          "required": [
            "rows",
            "snapshot",
            "freshness"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-active": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-active"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 500,
              "uniqueItems": true
            },
            "connection_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 500,
              "uniqueItems": true
            },
            "all_channels": {
              "type": "boolean"
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            }
          },
          "required": [
            "principal_ids",
            "connection_ids",
            "all_channels",
            "page"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-active": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerBatch"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-sync-snapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-sync-snapshot"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "principal_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 500,
              "uniqueItems": true
            },
            "connection_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 500,
              "uniqueItems": true
            },
            "all_channels": {
              "type": "boolean"
            },
            "known_session_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 500,
              "uniqueItems": true
            }
          },
          "required": [
            "principal_ids",
            "connection_ids",
            "all_channels",
            "known_session_ids"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-sync-snapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRoutingSnapshot"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-routing-reply-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-reply-facts"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 5000,
              "uniqueItems": true
            },
            "from": {
              "type": "string",
              "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$",
              "format": "date-time"
            },
            "mode": {
              "enum": [
                "aggregate",
                "facts"
              ]
            }
          },
          "required": [
            "session_ids",
            "from",
            "mode"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-reply-facts": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerRoutingReplySnapshot"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-runtime-capabilities": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "runtime-capabilities"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {},
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-runtime-capabilities": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerCapabilities"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "OwnerInferenceContext": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "control_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "messages": {
          "type": "array",
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
                "maxLength": 10000
              },
              "text_source": {
                "enum": [
                  "original",
                  "preview",
                  "extracted"
                ]
              }
            },
            "required": [
              "id",
              "direction",
              "text",
              "text_source"
            ]
          },
          "maxItems": 20
        },
        "contact": {
          "anyOf": [
            {
              "$ref": "#/definitions/OwnerProjectedRecord"
            },
            {
              "type": "null"
            }
          ]
        },
        "input_digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "conversation_id",
        "owner_revision",
        "control_revision",
        "messages",
        "contact",
        "input_digest"
      ]
    },
    "Request_chat-agent-context": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "agent-context"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "message_id": {
              "type": "string",
              "format": "uuid"
            },
            "expected_owner_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "expected_control_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "message_id",
            "expected_owner_revision",
            "expected_control_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-agent-context": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerInferenceContext"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-inbound-next": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "inbound-next"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "purpose": {
              "enum": [
                "consent",
                "inference"
              ]
            },
            "used_message_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 1000,
              "uniqueItems": true
            },
            "expected_control_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "purpose",
            "used_message_ids",
            "expected_control_revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-inbound-next": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "message": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "text": {
                      "type": "string",
                      "maxLength": 10000
                    },
                    "text_source": {
                      "enum": [
                        "original",
                        "preview",
                        "extracted"
                      ]
                    }
                  },
                  "required": [
                    "id",
                    "text",
                    "text_source"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "message"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "conversation_conversation-send-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/conversation_conversation-queued"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "conversation_conversation-queued": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "message_id": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "enum": [
            "queued",
            "sending",
            "sent",
            "failed",
            "unknown",
            "cancelled"
          ]
        },
        "status_url": {
          "type": "string"
        },
        "provider_message_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "error_code": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "conversation_id",
        "message_id",
        "status",
        "status_url"
      ]
    },
    "Request_chat-prompt-submit": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "prompt-submit"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "crm_contact_id": {
              "type": "string",
              "format": "uuid"
            },
            "expected_owner_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "expected_control_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "graph": {
              "$ref": "#/definitions/OwnerGraph"
            },
            "text": {
              "type": "string",
              "minLength": 1,
              "maxLength": 10000
            }
          },
          "required": [
            "conversation_id",
            "crm_contact_id",
            "expected_owner_revision",
            "expected_control_revision",
            "graph",
            "text"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-prompt-submit": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/conversation_conversation-send-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-read-need": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "read-need"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "assessment_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "session_id",
            "need_id",
            "assessment_version"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-read-need": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "current": {
              "type": "boolean"
            },
            "assessment_status": {
              "enum": [
                "",
                "unassessed",
                "insufficient",
                "assessed"
              ]
            },
            "need_clarity": {
              "enum": [
                "",
                "none",
                "ambiguous",
                "clear"
              ]
            },
            "intent": {
              "enum": [
                "",
                "research",
                "buy",
                "support",
                "cancel",
                "other"
              ]
            },
            "product_interest": {
              "type": "string",
              "maxLength": 65536
            },
            "unresolved_reason": {
              "type": "string",
              "maxLength": 65536
            }
          },
          "required": [
            "current",
            "assessment_status",
            "need_clarity",
            "intent",
            "product_interest",
            "unresolved_reason"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-contribution-visible": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contribution-visible"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "context_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "context_id",
            "session_id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_sales-contribution-visible": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "visible": {
              "type": "boolean"
            }
          },
          "required": [
            "visible"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-contribution-apply": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contribution-apply"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "command": {
              "$ref": "#/definitions/OwnerCommandRef"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "source_context_id": {
              "type": "string",
              "format": "uuid"
            },
            "source_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "kind": {
              "const": "outcome"
            },
            "record_id": {
              "type": "string",
              "format": "uuid"
            },
            "role": {
              "enum": [
                "created",
                "follow_up",
                "closing"
              ]
            },
            "admitted_resource": {
              "$ref": "#/definitions/OwnerResource"
            }
          },
          "required": [
            "command",
            "conversation_id",
            "session_id",
            "source_context_id",
            "source_revision",
            "kind",
            "record_id",
            "role",
            "admitted_resource"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-contribution-apply": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "contribution_id": {
              "type": "string",
              "format": "uuid"
            },
            "revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "contribution_id",
            "revision"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "OwnerSnapshot": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "snapshot_id": {
          "type": "string",
          "format": "uuid"
        },
        "dataset": {
          "enum": [
            "routing",
            "conversion",
            "stage",
            "progress"
          ]
        },
        "watermark": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "as_of": {
          "type": "string",
          "format": "date-time"
        },
        "row_count": {
          "type": "integer",
          "minimum": 0,
          "maximum": 20000
        },
        "state": {
          "enum": [
            "prepared",
            "valid",
            "changed",
            "released"
          ]
        }
      },
      "required": [
        "snapshot_id",
        "dataset",
        "watermark",
        "digest",
        "as_of",
        "row_count",
        "state"
      ]
    },
    "session_progress_session-process-input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "stages": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$",
                "not": {
                  "enum": [
                    "won",
                    "lost",
                    "revenue",
                    "consent"
                  ]
                }
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "description": {
                "type": "string",
                "maxLength": 500
              },
              "color": {
                "type": "string",
                "pattern": "^#[0-9a-fA-F]{6}$"
              },
              "requirements": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "fields": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9_]{0,63}$"
                    },
                    "maxItems": 100,
                    "uniqueItems": true
                  },
                  "need": {
                    "type": "boolean"
                  },
                  "milestones": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9_]{0,63}$"
                    },
                    "maxItems": 12,
                    "uniqueItems": true
                  }
                },
                "title": "SessionStageRequirements"
              },
              "type": {
                "enum": [
                  "open",
                  "converted",
                  "unqualified"
                ]
              }
            },
            "required": [
              "key",
              "label"
            ],
            "title": "SessionProcessStage"
          },
          "maxItems": 20,
          "minItems": 1
        },
        "milestones": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$",
                "not": {
                  "enum": [
                    "won",
                    "lost",
                    "revenue",
                    "consent"
                  ]
                }
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              }
            },
            "required": [
              "key",
              "label"
            ]
          },
          "maxItems": 12,
          "minItems": 1
        },
        "automations": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "set_convert_time": {
              "type": "boolean"
            },
            "clear_convert_time": {
              "type": "boolean"
            }
          },
          "required": [
            "set_convert_time",
            "clear_convert_time"
          ]
        }
      },
      "required": [
        "stages",
        "milestones"
      ]
    },
    "OwnerSnapshotRow": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "session"
            },
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "status": {
              "enum": [
                "active",
                "closed"
              ]
            },
            "opening_reason": {
              "type": "string",
              "minLength": 1,
              "maxLength": 32
            },
            "close_reason": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 32
                },
                {
                  "type": "null"
                }
              ]
            },
            "opened_at": {
              "type": "string",
              "format": "date-time"
            },
            "opening_occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "closed_at": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "date-time"
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_classification": {
              "enum": [
                "paid",
                "organic",
                "unknown"
              ]
            },
            "source_channel": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 32
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_page_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 255
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_ad_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 255
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_campaign_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 255
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_connection_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_touchpoint_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "initial_owner_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "initial_team_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "owner_principal_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "team_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
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
            "process_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "stage_key": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 64
                },
                {
                  "type": "null"
                }
              ]
            },
            "coverage": {
              "enum": [
                "full",
                "partial",
                "none"
              ]
            },
            "progress_at": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "date-time"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "kind",
            "id",
            "conversation_id",
            "sequence",
            "version",
            "status",
            "opening_reason",
            "close_reason",
            "opened_at",
            "opening_occurred_at",
            "closed_at",
            "source_classification",
            "source_channel",
            "source_page_id",
            "source_ad_id",
            "source_campaign_id",
            "source_connection_id",
            "source_touchpoint_id",
            "initial_owner_id",
            "initial_team_id",
            "owner_principal_id",
            "team_id",
            "owner_revision",
            "record_version",
            "process_version",
            "stage_key",
            "coverage",
            "progress_at"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "need"
            },
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "kind",
            "id",
            "session_id",
            "created_at"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "stage"
            },
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "from_stage": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 64
                },
                {
                  "type": "null"
                }
              ]
            },
            "to_stage": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "kind",
            "id",
            "session_id",
            "revision",
            "from_stage",
            "to_stage",
            "recorded_at"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "milestone"
            },
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "milestone_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "action": {
              "enum": [
                "record",
                "replace",
                "retract"
              ]
            },
            "supersedes_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "message_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "kind",
            "id",
            "session_id",
            "need_id",
            "revision",
            "milestone_key",
            "action",
            "supersedes_id",
            "message_id",
            "occurred_at",
            "recorded_at"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "process"
            },
            "version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "definition": {
              "$ref": "#/definitions/session_progress_session-process-input"
            }
          },
          "required": [
            "kind",
            "version",
            "definition"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "reply"
            },
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "actor_id": {
              "type": "string",
              "format": "uuid"
            },
            "team_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "kind",
            "id",
            "session_id",
            "actor_id",
            "team_id",
            "recorded_at"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "routing-session"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "connection_id": {
              "type": "string",
              "format": "uuid"
            },
            "opened_at": {
              "type": "string",
              "format": "date-time"
            },
            "closed_at": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "date-time"
                },
                {
                  "type": "null"
                }
              ]
            },
            "status": {
              "enum": [
                "active",
                "closed"
              ]
            },
            "owner_principal_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "team_id": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "uuid"
                },
                {
                  "type": "null"
                }
              ]
            },
            "owner_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "assigned_at": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "kind",
            "session_id",
            "conversation_id",
            "connection_id",
            "opened_at",
            "closed_at",
            "status",
            "owner_principal_id",
            "team_id",
            "owner_revision",
            "assigned_at"
          ]
        }
      ]
    },
    "Request_chat-snapshot-prepare": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "snapshot-prepare"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "dataset": {
              "enum": [
                "routing",
                "conversion",
                "stage",
                "progress"
              ]
            },
            "from": {
              "type": "string",
              "format": "date-time"
            },
            "to": {
              "type": "string",
              "format": "date-time"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "process_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "dataset",
            "from",
            "to",
            "as_of",
            "process_version"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-snapshot-prepare": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerSnapshot"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-snapshot-validate": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "snapshot-validate"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "snapshot_id": {
              "type": "string",
              "format": "uuid"
            },
            "digest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            "watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "snapshot_id",
            "digest",
            "watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-snapshot-validate": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerSnapshot"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-snapshot-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "snapshot-release"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "snapshot_id": {
              "type": "string",
              "format": "uuid"
            },
            "digest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            "watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "snapshot_id",
            "digest",
            "watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-snapshot-release": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerSnapshot"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-snapshot-page": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "snapshot-page"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "snapshot_id": {
              "type": "string",
              "format": "uuid"
            },
            "digest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$"
            },
            "page": {
              "$ref": "#/definitions/OwnerPage"
            }
          },
          "required": [
            "snapshot_id",
            "digest",
            "page"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-snapshot-page": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "rows": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerSnapshotRow"
              },
              "maxItems": 100
            },
            "snapshot": {
              "$ref": "#/definitions/OwnerSnapshot"
            },
            "freshness": {
              "$ref": "#/definitions/OwnerFreshness"
            }
          },
          "required": [
            "rows",
            "snapshot",
            "freshness"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "OwnerChildResult": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "child_id": {
          "type": "string",
          "format": "uuid"
        },
        "parent_run_id": {
          "type": "string",
          "format": "uuid"
        },
        "state": {
          "enum": [
            "pending",
            "completed",
            "cancelled",
            "failed"
          ]
        },
        "outcome": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            {
              "type": "null"
            }
          ]
        },
        "lead_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "child_id",
        "parent_run_id",
        "state",
        "outcome",
        "lead_id"
      ]
    },
    "Request_sales-child-start": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "child-start"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "graph": {
              "$ref": "#/definitions/OwnerGraph"
            },
            "input": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "lead_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "target_team_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "expected_version": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "lead_id",
                "target_team_id",
                "expected_version"
              ]
            }
          },
          "required": [
            "graph",
            "input"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_sales-child-start": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerChildResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-child-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "child-status"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "child_id": {
              "type": "string",
              "format": "uuid"
            },
            "parent_run_id": {
              "type": "string",
              "format": "uuid"
            },
            "graph": {
              "$ref": "#/definitions/OwnerGraph"
            }
          },
          "required": [
            "child_id",
            "parent_run_id",
            "graph"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_sales-child-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerChildResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_session-process-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "current_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "definition": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "stages": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "key": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9_]{0,63}$",
                        "not": {
                          "enum": [
                            "won",
                            "lost",
                            "revenue",
                            "consent"
                          ]
                        }
                      },
                      "label": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 120
                      },
                      "description": {
                        "type": "string",
                        "maxLength": 500
                      },
                      "color": {
                        "type": "string",
                        "pattern": "^#[0-9a-fA-F]{6}$"
                      },
                      "requirements": {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "fields": {
                            "type": "array",
                            "items": {
                              "type": "string",
                              "pattern": "^[a-z][a-z0-9_]{0,63}$"
                            },
                            "maxItems": 100,
                            "uniqueItems": true
                          },
                          "need": {
                            "type": "boolean"
                          },
                          "milestones": {
                            "type": "array",
                            "items": {
                              "type": "string",
                              "pattern": "^[a-z][a-z0-9_]{0,63}$"
                            },
                            "maxItems": 12,
                            "uniqueItems": true
                          }
                        },
                        "title": "SessionStageRequirements"
                      },
                      "type": {
                        "enum": [
                          "open",
                          "converted",
                          "unqualified"
                        ]
                      }
                    },
                    "required": [
                      "key",
                      "label"
                    ],
                    "title": "SessionProcessStage"
                  },
                  "maxItems": 20,
                  "minItems": 1
                },
                "milestones": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "key": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9_]{0,63}$",
                        "not": {
                          "enum": [
                            "won",
                            "lost",
                            "revenue",
                            "consent"
                          ]
                        }
                      },
                      "label": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 120
                      }
                    },
                    "required": [
                      "key",
                      "label"
                    ]
                  },
                  "maxItems": 12,
                  "minItems": 1
                },
                "automations": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "set_convert_time": {
                      "type": "boolean"
                    },
                    "clear_convert_time": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "set_convert_time",
                    "clear_convert_time"
                  ]
                }
              },
              "required": [
                "stages",
                "milestones"
              ]
            }
          },
          "required": [
            "version",
            "current_version",
            "definition"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-session-progress-get-session-process": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "session-progress-get-session-process"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "version": {
              "type": "string"
            }
          },
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-session-progress-get-session-process": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_session-process-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_session-process-input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "stages": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$",
                "not": {
                  "enum": [
                    "won",
                    "lost",
                    "revenue",
                    "consent"
                  ]
                }
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              },
              "description": {
                "type": "string",
                "maxLength": 500
              },
              "color": {
                "type": "string",
                "pattern": "^#[0-9a-fA-F]{6}$"
              },
              "requirements": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "fields": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9_]{0,63}$"
                    },
                    "maxItems": 100,
                    "uniqueItems": true
                  },
                  "need": {
                    "type": "boolean"
                  },
                  "milestones": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9_]{0,63}$"
                    },
                    "maxItems": 12,
                    "uniqueItems": true
                  }
                },
                "title": "SessionStageRequirements"
              },
              "type": {
                "enum": [
                  "open",
                  "converted",
                  "unqualified"
                ]
              }
            },
            "required": [
              "key",
              "label"
            ],
            "title": "SessionProcessStage"
          },
          "maxItems": 20,
          "minItems": 1
        },
        "milestones": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,63}$",
                "not": {
                  "enum": [
                    "won",
                    "lost",
                    "revenue",
                    "consent"
                  ]
                }
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              }
            },
            "required": [
              "key",
              "label"
            ]
          },
          "maxItems": 12,
          "minItems": 1
        },
        "automations": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "set_convert_time": {
              "type": "boolean"
            },
            "clear_convert_time": {
              "type": "boolean"
            }
          },
          "required": [
            "set_convert_time",
            "clear_convert_time"
          ]
        }
      },
      "required": [
        "stages",
        "milestones"
      ]
    },
    "Request_chat-session-progress-post-session-process": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "session-progress-post-session-process"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "body": {
              "$ref": "#/definitions/Public_session-process-input"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-session-progress-post-session-process": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_session-process-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_session-progress-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "can_edit": {
              "type": "boolean"
            },
            "status": {
              "enum": [
                "active",
                "closed"
              ]
            },
            "coverage": {
              "enum": [
                "full",
                "partial",
                "none"
              ]
            },
            "version": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "process": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "version": {
                      "type": "string",
                      "pattern": "^[1-9][0-9]{0,19}$"
                    },
                    "current_version": {
                      "type": "string",
                      "pattern": "^[1-9][0-9]{0,19}$"
                    },
                    "definition": {
                      "type": "object",
                      "additionalProperties": false,
                      "properties": {
                        "stages": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "additionalProperties": false,
                            "properties": {
                              "key": {
                                "type": "string",
                                "pattern": "^[a-z][a-z0-9_]{0,63}$",
                                "not": {
                                  "enum": [
                                    "won",
                                    "lost",
                                    "revenue",
                                    "consent"
                                  ]
                                }
                              },
                              "label": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 120
                              },
                              "description": {
                                "type": "string",
                                "maxLength": 500
                              },
                              "color": {
                                "type": "string",
                                "pattern": "^#[0-9a-fA-F]{6}$"
                              },
                              "requirements": {
                                "type": "object",
                                "additionalProperties": false,
                                "properties": {
                                  "fields": {
                                    "type": "array",
                                    "items": {
                                      "type": "string",
                                      "pattern": "^[a-z][a-z0-9_]{0,63}$"
                                    },
                                    "maxItems": 100,
                                    "uniqueItems": true
                                  },
                                  "need": {
                                    "type": "boolean"
                                  },
                                  "milestones": {
                                    "type": "array",
                                    "items": {
                                      "type": "string",
                                      "pattern": "^[a-z][a-z0-9_]{0,63}$"
                                    },
                                    "maxItems": 12,
                                    "uniqueItems": true
                                  }
                                },
                                "title": "SessionStageRequirements"
                              },
                              "type": {
                                "enum": [
                                  "open",
                                  "converted",
                                  "unqualified"
                                ]
                              }
                            },
                            "required": [
                              "key",
                              "label"
                            ],
                            "title": "SessionProcessStage"
                          },
                          "maxItems": 20,
                          "minItems": 1
                        },
                        "milestones": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "additionalProperties": false,
                            "properties": {
                              "key": {
                                "type": "string",
                                "pattern": "^[a-z][a-z0-9_]{0,63}$",
                                "not": {
                                  "enum": [
                                    "won",
                                    "lost",
                                    "revenue",
                                    "consent"
                                  ]
                                }
                              },
                              "label": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 120
                              }
                            },
                            "required": [
                              "key",
                              "label"
                            ]
                          },
                          "maxItems": 12,
                          "minItems": 1
                        },
                        "automations": {
                          "type": "object",
                          "additionalProperties": false,
                          "properties": {
                            "set_convert_time": {
                              "type": "boolean"
                            },
                            "clear_convert_time": {
                              "type": "boolean"
                            }
                          },
                          "required": [
                            "set_convert_time",
                            "clear_convert_time"
                          ]
                        }
                      },
                      "required": [
                        "stages",
                        "milestones"
                      ]
                    }
                  },
                  "required": [
                    "version",
                    "current_version",
                    "definition"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "needs": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "session_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "label": {
                    "type": "string"
                  },
                  "created_at": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "actor_id": {
                    "type": "string",
                    "format": "uuid"
                  }
                },
                "required": [
                  "id",
                  "session_id",
                  "label",
                  "created_at",
                  "actor_id"
                ]
              },
              "maxItems": 100
            },
            "history": {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string",
                        "format": "uuid"
                      },
                      "session_id": {
                        "type": "string",
                        "format": "uuid"
                      },
                      "need_id": {
                        "type": "string",
                        "format": "uuid"
                      },
                      "revision": {
                        "type": "string",
                        "pattern": "^[1-9][0-9]{0,19}$"
                      },
                      "milestone_key": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9_]{0,63}$",
                        "not": {
                          "enum": [
                            "won",
                            "lost",
                            "revenue",
                            "consent"
                          ]
                        }
                      },
                      "kind": {
                        "enum": [
                          "record",
                          "replace",
                          "retract"
                        ]
                      },
                      "supersedes_id": {
                        "anyOf": [
                          {
                            "type": "string",
                            "format": "uuid"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "message_id": {
                        "anyOf": [
                          {
                            "type": "string",
                            "format": "uuid"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "reason": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "occurred_at": {
                        "type": "string",
                        "format": "date-time"
                      },
                      "recorded_at": {
                        "type": "string",
                        "format": "date-time"
                      },
                      "actor_id": {
                        "type": "string",
                        "format": "uuid"
                      },
                      "corrected_by": {
                        "anyOf": [
                          {
                            "type": "string",
                            "format": "uuid"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "type": {
                        "const": "milestone"
                      }
                    },
                    "required": [
                      "id",
                      "session_id",
                      "need_id",
                      "revision",
                      "milestone_key",
                      "kind",
                      "supersedes_id",
                      "message_id",
                      "reason",
                      "occurred_at",
                      "recorded_at",
                      "actor_id",
                      "corrected_by",
                      "type"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string",
                        "format": "uuid"
                      },
                      "session_id": {
                        "type": "string",
                        "format": "uuid"
                      },
                      "revision": {
                        "type": "string",
                        "pattern": "^[1-9][0-9]{0,19}$"
                      },
                      "from_stage": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9_]{0,63}$",
                        "not": {
                          "enum": [
                            "won",
                            "lost",
                            "revenue",
                            "consent"
                          ]
                        }
                      },
                      "to_stage": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9_]{0,63}$",
                        "not": {
                          "enum": [
                            "won",
                            "lost",
                            "revenue",
                            "consent"
                          ]
                        }
                      },
                      "reason": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "actor_id": {
                        "type": "string",
                        "format": "uuid"
                      },
                      "recorded_at": {
                        "type": "string",
                        "format": "date-time"
                      },
                      "type": {
                        "const": "stage"
                      }
                    },
                    "required": [
                      "id",
                      "session_id",
                      "revision",
                      "from_stage",
                      "to_stage",
                      "reason",
                      "actor_id",
                      "recorded_at",
                      "type"
                    ]
                  }
                ]
              },
              "maxItems": 50
            },
            "next_before_revision": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "process_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stage_key": {
              "type": "string",
              "pattern": "^[a-z][a-z0-9_]{0,63}$",
              "not": {
                "enum": [
                  "won",
                  "lost",
                  "revenue",
                  "consent"
                ]
              }
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time"
            },
            "convert_time": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "date-time"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "session_id",
            "can_edit",
            "status",
            "coverage",
            "version",
            "process",
            "needs",
            "history",
            "next_before_revision"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-session-progress-get-conversations-conversation-sessions-session-progress": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "session-progress-get-conversations-conversation-sessions-session-progress"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            },
            "before_revision": {
              "type": "string"
            }
          },
          "required": [
            "conversation",
            "session"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-session-progress-get-conversations-conversation-sessions-session-progress": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_session-progress-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_session-progress-input": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "action": {
              "const": "enroll"
            }
          },
          "required": [
            "action"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "action": {
              "const": "stage"
            },
            "stage_key": {
              "type": "string",
              "pattern": "^[a-z][a-z0-9_]{0,63}$",
              "not": {
                "enum": [
                  "won",
                  "lost",
                  "revenue",
                  "consent"
                ]
              }
            },
            "reason": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            }
          },
          "required": [
            "action",
            "stage_key",
            "reason"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "action": {
              "const": "need"
            },
            "label": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            }
          },
          "required": [
            "action",
            "label"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "action": {
              "const": "record"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "milestone_key": {
              "type": "string",
              "pattern": "^[a-z][a-z0-9_]{0,63}$",
              "not": {
                "enum": [
                  "won",
                  "lost",
                  "revenue",
                  "consent"
                ]
              }
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "reason": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "message_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "action",
            "need_id",
            "milestone_key",
            "occurred_at",
            "reason"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "action": {
              "const": "replace"
            },
            "supersedes_id": {
              "type": "string",
              "format": "uuid"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "reason": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "message_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "action",
            "supersedes_id",
            "occurred_at",
            "reason"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "action": {
              "const": "retract"
            },
            "supersedes_id": {
              "type": "string",
              "format": "uuid"
            },
            "reason": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            }
          },
          "required": [
            "action",
            "supersedes_id",
            "reason"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "action": {
              "const": "identify_need"
            },
            "label": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            }
          },
          "required": [
            "action",
            "label"
          ]
        }
      ]
    },
    "Public_session-progress-result": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "action": {
              "enum": [
                "enroll",
                "stage",
                "need",
                "record",
                "replace",
                "retract",
                "identify_need"
              ]
            }
          },
          "required": [
            "id",
            "session_id",
            "version",
            "action"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-session-progress-post-conversations-conversation-sessions-session-progress": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "session-progress-post-conversations-conversation-sessions-session-progress"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_session-progress-input"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "conversation",
            "session",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-session-progress-post-conversations-conversation-sessions-session-progress": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_session-progress-result"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_session-funnel-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "sessions": {
              "type": "integer",
              "minimum": 0
            },
            "denominator": {
              "type": "integer",
              "minimum": 0
            },
            "coverage": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "full": {
                  "type": "integer",
                  "minimum": 0
                },
                "partial": {
                  "type": "integer",
                  "minimum": 0
                },
                "none": {
                  "type": "integer",
                  "minimum": 0
                },
                "other_version": {
                  "type": "integer",
                  "minimum": 0
                }
              },
              "required": [
                "full",
                "partial",
                "none",
                "other_version"
              ]
            },
            "steps": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "key": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9_]{0,63}$",
                    "not": {
                      "enum": [
                        "won",
                        "lost",
                        "revenue",
                        "consent"
                      ]
                    }
                  },
                  "label": {
                    "type": "string"
                  },
                  "sessions": {
                    "type": "integer",
                    "minimum": 0
                  },
                  "cohort_rate": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "previous_rate": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                },
                "required": [
                  "key",
                  "label",
                  "sessions",
                  "cohort_rate",
                  "previous_rate"
                ]
              },
              "maxItems": 12
            },
            "from": {
              "type": "string",
              "format": "date-time"
            },
            "to": {
              "type": "string",
              "format": "date-time"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "process_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "timezone": {
              "const": "UTC"
            },
            "scope": {
              "const": "current_authorized_conversations"
            },
            "mode": {
              "const": "same_need_ordered"
            }
          },
          "required": [
            "sessions",
            "denominator",
            "coverage",
            "steps",
            "from",
            "to",
            "as_of",
            "process_version",
            "timezone",
            "scope",
            "mode"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-session-progress-get-session-funnel": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "session-progress-get-session-funnel"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "from": {
              "type": "string"
            },
            "to": {
              "type": "string"
            },
            "as_of": {
              "type": "string"
            },
            "process_version": {
              "type": "string"
            }
          },
          "required": [
            "from",
            "to",
            "process_version"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-session-progress-get-session-funnel": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_session-funnel-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_conversation-entity"
          }
        },
        "next_cursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Public_conversation-entity": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "contact_id": {
          "type": "string",
          "format": "uuid"
        },
        "contact_identity_id": {
          "type": "string",
          "format": "uuid"
        },
        "connection_id": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "enum": [
            "open",
            "pending",
            "closed"
          ]
        },
        "need_response": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Response assessment: inbound is null until assessed; confirmed sent coverage is false; true requires a valid Assist assessment."
        },
        "opened_at": {
          "type": "string",
          "format": "date-time"
        },
        "closed_at": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "owner_principal_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "team_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
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
                  "type": "string"
                },
                "normalized_phone": {
                  "anyOf": [
                    {
                      "type": "string"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "normalized_email": {
                  "anyOf": [
                    {
                      "type": "string"
                    },
                    {
                      "type": "null"
                    }
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
        "attribution": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "source": {
              "enum": [
                "unknown",
                "ctm"
              ]
            },
            "ad_id": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "campaign_id": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "source",
            "ad_id",
            "campaign_id"
          ]
        },
        "owner_kind": {
          "enum": [
            "human",
            "ai",
            null
          ]
        },
        "allowed_actions": {
          "type": "array",
          "items": {
            "enum": [
              "reply",
              "note",
              "update",
              "assign",
              "takeover"
            ]
          }
        },
        "latest_message": {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "text": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 4000,
                  "pattern": "\\S"
                },
                "status": {
                  "enum": [
                    "received",
                    "queued",
                    "sending",
                    "sent",
                    "failed",
                    "unknown",
                    "cancelled"
                  ]
                },
                "direction": {
                  "enum": [
                    "inbound",
                    "outbound"
                  ]
                },
                "received_at": {
                  "type": "string",
                  "format": "date-time"
                }
              },
              "required": [
                "id",
                "status",
                "direction",
                "received_at"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "channel": {
          "enum": [
            "mock_messenger",
            "messenger"
          ]
        },
        "channel_id": {
          "type": "string",
          "format": "uuid"
        },
        "page_id": {
          "type": "string"
        },
        "channel_name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "contact_id",
        "contact_identity_id",
        "connection_id",
        "status",
        "opened_at",
        "closed_at",
        "version",
        "owner_revision",
        "owner_principal_id",
        "team_id",
        "contact"
      ]
    },
    "Request_chat-conversation-get-conversations": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-get-conversations"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            },
            "state": {
              "type": "string"
            },
            "owner": {
              "type": "string"
            },
            "team": {
              "type": "string"
            },
            "channel": {
              "type": "string",
              "enum": [
                "messenger",
                "mock_messenger"
              ]
            },
            "channel_id": {
              "type": "string",
              "format": "uuid"
            },
            "page_id": {
              "type": "string",
              "maxLength": 255
            }
          },
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-get-conversations": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-list"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_conversation-entity"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-conversation-get-conversations-id": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-get-conversations-id"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-get-conversations-id": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-timeline": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_conversation-message"
          }
        },
        "next_cursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Public_conversation-message": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
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
        },
        "status": {
          "enum": [
            "received",
            "queued",
            "sending",
            "sent",
            "failed",
            "unknown",
            "cancelled"
          ]
        },
        "provider_message_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "outbound_intent_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "occurred_at": {
          "type": "string",
          "format": "date-time"
        },
        "received_at": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "id",
        "conversation_id",
        "direction",
        "status",
        "provider_message_id",
        "outbound_intent_id",
        "occurred_at",
        "received_at"
      ]
    },
    "Request_chat-conversation-get-conversations-id-messages": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-get-conversations-id-messages"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-get-conversations-id-messages": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-timeline"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-send": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "text": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000,
          "pattern": "\\S"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "text",
        "owner_revision"
      ]
    },
    "Public_conversation-send-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_conversation-queued"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Public_conversation-queued": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "message_id": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "enum": [
            "queued",
            "sending",
            "sent",
            "failed",
            "unknown",
            "cancelled"
          ]
        },
        "status_url": {
          "type": "string"
        },
        "provider_message_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "error_code": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "conversation_id",
        "message_id",
        "status",
        "status_url"
      ]
    },
    "Request_chat-conversation-post-conversations-id-messages": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-post-conversations-id-messages"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_conversation-send"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-post-conversations-id-messages": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-send-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-envelope-timeline": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_conversation-message-envelope-v2"
          }
        },
        "next_cursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Public_conversation-message-envelope-v2": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
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
        },
        "status": {
          "enum": [
            "received",
            "queued",
            "sending",
            "sent",
            "failed",
            "unknown",
            "cancelled"
          ]
        },
        "outbound_intent_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "occurred_at": {
          "type": "string",
          "format": "date-time"
        },
        "received_at": {
          "type": "string",
          "format": "date-time"
        },
        "external_msg_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "schema_version": {
          "const": 2,
          "type": "integer"
        },
        "connection_id": {
          "type": "string",
          "format": "uuid"
        },
        "platform": {
          "const": "mock_messenger",
          "type": "string"
        },
        "message_type": {
          "const": "text",
          "type": "string"
        },
        "reply_to": {
          "type": "null"
        },
        "attachment": {
          "type": "null"
        }
      },
      "required": [
        "id",
        "conversation_id",
        "direction",
        "status",
        "external_msg_id",
        "outbound_intent_id",
        "occurred_at",
        "received_at",
        "schema_version",
        "connection_id",
        "platform",
        "message_type"
      ]
    },
    "Request_chat-conversation-get-conversations-id-message-envelopes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-get-conversations-id-message-envelopes"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-get-conversations-id-message-envelopes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-envelope-timeline"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-rich-timeline": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_conversation-message-envelope-v3"
          }
        },
        "next_cursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Public_conversation-message-envelope-v3": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
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
        },
        "status": {
          "enum": [
            "received",
            "queued",
            "sending",
            "sent",
            "failed",
            "unknown",
            "cancelled"
          ]
        },
        "outbound_intent_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "occurred_at": {
          "type": "string",
          "format": "date-time"
        },
        "received_at": {
          "type": "string",
          "format": "date-time"
        },
        "external_msg_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "schema_version": {
          "type": "integer",
          "const": 3
        },
        "connection_id": {
          "type": "string",
          "format": "uuid"
        },
        "platform": {
          "const": "mock_messenger",
          "type": "string"
        },
        "message_type": {
          "enum": [
            "text",
            "media",
            "template",
            "unsupported"
          ]
        },
        "reply_to": {
          "anyOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "external_msg_id": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 255,
                  "pattern": "\\S"
                },
                "internal_message_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "external_msg_id",
                "internal_message_id"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "attachment": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "version": {
                  "type": "integer",
                  "const": 1
                },
                "kind": {
                  "const": "media"
                },
                "items": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "media_type": {
                        "enum": [
                          "image",
                          "audio",
                          "video",
                          "file"
                        ]
                      },
                      "external_media_id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 255,
                        "pattern": "\\S"
                      },
                      "name": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 255,
                            "pattern": "\\S"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      }
                    },
                    "required": [
                      "media_type",
                      "external_media_id",
                      "name"
                    ]
                  },
                  "minItems": 1,
                  "maxItems": 10
                }
              },
              "required": [
                "version",
                "kind",
                "items"
              ]
            },
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "version": {
                  "type": "integer",
                  "const": 1
                },
                "kind": {
                  "const": "gallery"
                },
                "cards": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "title": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 80,
                        "pattern": "\\S"
                      },
                      "subtitle": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 80,
                            "pattern": "\\S"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "buttons": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "additionalProperties": false,
                          "properties": {
                            "label": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 20,
                              "pattern": "\\S"
                            }
                          },
                          "required": [
                            "label"
                          ]
                        },
                        "minItems": 0,
                        "maxItems": 3
                      }
                    },
                    "required": [
                      "title",
                      "subtitle",
                      "buttons"
                    ]
                  },
                  "minItems": 1,
                  "maxItems": 10
                }
              },
              "required": [
                "version",
                "kind",
                "cards"
              ]
            },
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "version": {
                  "type": "integer",
                  "const": 1
                },
                "kind": {
                  "const": "csat"
                },
                "title": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 80,
                  "pattern": "\\S"
                },
                "prompt": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 400,
                  "pattern": "\\S"
                }
              },
              "required": [
                "version",
                "kind",
                "title",
                "prompt"
              ]
            },
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "version": {
                  "type": "integer",
                  "const": 1
                },
                "kind": {
                  "const": "unsupported"
                },
                "label": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 120,
                  "pattern": "\\S"
                }
              },
              "required": [
                "version",
                "kind",
                "label"
              ]
            }
          ]
        },
        "text_source": {
          "enum": [
            "original",
            "extracted",
            "preview"
          ]
        }
      },
      "required": [
        "id",
        "conversation_id",
        "direction",
        "status",
        "external_msg_id",
        "outbound_intent_id",
        "occurred_at",
        "received_at",
        "schema_version",
        "connection_id",
        "platform",
        "message_type",
        "text_source"
      ]
    },
    "Request_chat-conversation-get-conversations-id-message-envelopes-v3": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-get-conversations-id-message-envelopes-v3"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-get-conversations-id-message-envelopes-v3": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-rich-timeline"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-intent-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_conversation-intent"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Public_conversation-intent": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "message_id": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "enum": [
            "queued",
            "sending",
            "sent",
            "failed",
            "unknown",
            "cancelled"
          ]
        },
        "provider_message_id": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "error_code": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "conversation_id",
        "message_id",
        "status",
        "provider_message_id",
        "error_code"
      ]
    },
    "Request_chat-conversation-get-conversations-id-outbound-intents-intentId": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-get-conversations-id-outbound-intents-intentId"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "intentId": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id",
            "intentId"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-get-conversations-id-outbound-intents-intentId": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-intent-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-acquisition-sessions": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "data",
        "next_before_sequence",
        "meta"
      ],
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "conversation_id",
              "sequence",
              "version",
              "status",
              "opening_reason",
              "close_reason",
              "opened_at",
              "opening_occurred_at",
              "closed_at",
              "source_classification",
              "source_channel",
              "source_page_id",
              "source_ad_id",
              "source_campaign_id",
              "source_connection_id",
              "source_touchpoint_id",
              "policy_version"
            ],
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "conversation_id": {
                "type": "string",
                "format": "uuid"
              },
              "sequence": {
                "type": "string",
                "pattern": "^[1-9][0-9]{0,19}$"
              },
              "version": {
                "type": "string",
                "pattern": "^[1-9][0-9]{0,19}$"
              },
              "status": {
                "enum": [
                  "active",
                  "closed"
                ]
              },
              "opening_reason": {
                "enum": [
                  "first_inbound",
                  "new_referral",
                  "after_close"
                ]
              },
              "close_reason": {
                "enum": [
                  "agent_closed",
                  "new_referral",
                  null
                ]
              },
              "opened_at": {
                "type": "string",
                "format": "date-time"
              },
              "opening_occurred_at": {
                "type": "string",
                "format": "date-time"
              },
              "closed_at": {
                "type": [
                  "string",
                  "null"
                ],
                "format": "date-time"
              },
              "source_classification": {
                "enum": [
                  "organic",
                  "paid",
                  "unknown"
                ]
              },
              "source_channel": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "source_page_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "source_ad_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "source_campaign_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "source_connection_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "source_touchpoint_id": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "policy_version": {
                "enum": [
                  "acquisition_v1",
                  "inbox_v2"
                ]
              }
            }
          }
        },
        "next_before_sequence": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "meta": {
          "type": "object",
          "required": [
            "correlation_id"
          ],
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          }
        }
      }
    },
    "Request_chat-conversation-get-conversations-id-acquisition-sessions": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-get-conversations-id-acquisition-sessions"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "before_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-get-conversations-id-acquisition-sessions": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-acquisition-sessions"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-notes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "created_at": {
                "type": "string",
                "format": "date-time"
              },
              "body": {
                "type": [
                  "string",
                  "null"
                ]
              }
            },
            "required": [
              "id",
              "created_at"
            ]
          }
        },
        "next_cursor": {
          "type": [
            "string",
            "null"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Request_chat-conversation-get-conversations-id-notes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-get-conversations-id-notes"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-get-conversations-id-notes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-notes"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-note": {
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
    },
    "Public_conversation-note-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id",
            "conversation_id"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-conversation-post-conversations-id-notes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-post-conversations-id-notes"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_conversation-note"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-post-conversations-id-notes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-note-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-transition": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "target_status": {
          "enum": [
            "open",
            "pending",
            "closed"
          ]
        },
        "reason": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000,
          "pattern": "\\S"
        }
      },
      "required": [
        "target_status",
        "reason"
      ]
    },
    "Request_chat-conversation-post-conversations-id-transition": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-post-conversations-id-transition"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_conversation-transition"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-post-conversations-id-transition": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_routing-assignment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "owner_principal_id": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        },
        "team_id": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        },
        "reason": {
          "enum": [
            "manual",
            "handoff"
          ]
        }
      },
      "required": [
        "owner_principal_id",
        "reason"
      ]
    },
    "Public_routing-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_routing-entity"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Public_routing-entity": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "object_key": {
          "type": "string"
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "owner_principal_id": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        },
        "team_id": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        }
      },
      "required": [
        "id",
        "tenant_id",
        "object_key",
        "version",
        "owner_revision",
        "owner_principal_id",
        "team_id"
      ]
    },
    "Request_chat-routing-assignment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-assignment"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_routing-assignment"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-assignment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_routing-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_routing-takeover": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "reason": {
          "const": "human_takeover"
        }
      },
      "required": [
        "reason"
      ]
    },
    "Request_chat-routing-takeover": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-takeover"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_routing-takeover"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-takeover": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_routing-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_routing-targets": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_routing-target"
          }
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Public_routing-target": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "kind": {
          "enum": [
            "human",
            "ai"
          ]
        },
        "eligible": {
          "type": "boolean"
        },
        "reason": {
          "enum": [
            null,
            "unavailable",
            "team",
            "capability",
            "role",
            "field",
            "policy",
            "capacity"
          ]
        }
      },
      "required": [
        "id",
        "kind",
        "eligible",
        "reason"
      ]
    },
    "Request_chat-routing-targets": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-targets"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "team_id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-targets": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_routing-targets"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_routing-history": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_routing-history-entry"
          },
          "maxItems": 100
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Public_routing-history-entry": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "from_owner_id": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        },
        "to_owner_id": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        },
        "from_team_id": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        },
        "to_team_id": {
          "type": [
            "string",
            "null"
          ],
          "format": "uuid"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "reason": {
          "type": "string"
        },
        "actor_kind": {
          "enum": [
            "human",
            "ai",
            "service",
            "system"
          ]
        },
        "actor_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "from_owner_id",
        "to_owner_id",
        "from_team_id",
        "to_team_id",
        "owner_revision",
        "reason",
        "actor_kind",
        "actor_id"
      ]
    },
    "Request_chat-routing-history": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "routing-history"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-routing-history": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_routing-history"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_contact-send-request": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "crm_contact_id": {
          "type": "string",
          "format": "uuid"
        },
        "owner_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "text": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000,
          "pattern": "\\S"
        }
      },
      "required": [
        "crm_contact_id",
        "owner_revision",
        "text"
      ]
    },
    "Request_chat-contact-bound-send": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "contact-bound-send"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_contact-send-request"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-contact-bound-send": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-send-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-channel-options": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "channel": {
                "enum": [
                  "messenger",
                  "mock_messenger"
                ]
              },
              "channel_id": {
                "type": "string",
                "format": "uuid"
              },
              "page_id": {
                "type": "string"
              },
              "channel_name": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "channel",
              "channel_id",
              "page_id",
              "channel_name"
            ]
          }
        },
        "next_cursor": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Request_chat-conversation-channels": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-channels"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            },
            "cursor": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-channels": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-channel-options"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_workspace-capabilities": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "contract_version": {
              "const": 1
            },
            "features": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "queue_v1": {
                  "type": "boolean"
                },
                "read_state_v1": {
                  "type": "boolean"
                },
                "inbox_v1": {
                  "type": "boolean"
                },
                "tags_v1": {
                  "type": "boolean"
                },
                "snooze_v1": {
                  "type": "boolean"
                },
                "activity_v1": {
                  "type": "boolean"
                },
                "snippets_v1": {
                  "type": "boolean"
                },
                "contact_channels_v1": {
                  "type": "boolean"
                }
              },
              "required": [
                "queue_v1",
                "read_state_v1",
                "inbox_v1",
                "tags_v1",
                "snooze_v1",
                "activity_v1",
                "snippets_v1",
                "contact_channels_v1"
              ]
            }
          },
          "required": [
            "contract_version",
            "features"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-workspace-capabilities": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-capabilities"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {},
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-capabilities": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_workspace-capabilities"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_workspace-sidebar": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "scopes": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "key": {
                    "type": "string"
                  },
                  "team_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "as_of": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "conversation_count": {
                    "type": "string",
                    "pattern": "^(0|[1-9][0-9]{0,19})$"
                  },
                  "unread_conversation_count": {
                    "type": "string",
                    "pattern": "^(0|[1-9][0-9]{0,19})$"
                  },
                  "waiting_conversation_count": {
                    "anyOf": [
                      {
                        "type": "string",
                        "pattern": "^(0|[1-9][0-9]{0,19})$"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "waiting_metric_coverage": {
                    "enum": [
                      "partial",
                      "complete"
                    ]
                  },
                  "metrics_state": {
                    "const": "ready"
                  }
                },
                "required": [
                  "key",
                  "as_of",
                  "conversation_count",
                  "unread_conversation_count",
                  "waiting_conversation_count",
                  "waiting_metric_coverage",
                  "metrics_state"
                ]
              }
            },
            "inboxes": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "name": {
                    "type": "string"
                  },
                  "creator_principal_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "shared": {
                    "type": "boolean"
                  },
                  "version": {
                    "type": "string"
                  },
                  "conversation_count": {
                    "type": "string"
                  },
                  "unread_conversation_count": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "creator_principal_id",
                  "shared",
                  "version",
                  "conversation_count",
                  "unread_conversation_count"
                ]
              }
            },
            "metrics_state": {
              "const": "ready"
            }
          },
          "required": [
            "scopes",
            "inboxes",
            "metrics_state"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-workspace-sidebar": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-sidebar"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {},
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-sidebar": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_workspace-sidebar"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_workspace-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_workspace-item"
          }
        },
        "next_cursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "conversation_count": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "unread_conversation_count": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "waiting_conversation_count": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "waiting_metric_coverage": {
              "enum": [
                "partial",
                "complete"
              ]
            },
            "metrics_state": {
              "const": "ready"
            }
          },
          "required": [
            "correlation_id",
            "as_of",
            "conversation_count",
            "unread_conversation_count",
            "waiting_conversation_count",
            "waiting_metric_coverage",
            "metrics_state"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Public_workspace-item": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation": {
          "$ref": "#/definitions/Public_conversation-entity"
        },
        "latest_inbound_seq": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "read_state": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "last_read_inbound_seq": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "unread_message_count": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "last_read_inbound_seq",
            "unread_message_count"
          ]
        },
        "snooze": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "until": {
                  "type": "string",
                  "format": "date-time"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "until",
                "revision"
              ]
            }
          ]
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string"
              },
              "color": {
                "type": "string"
              },
              "archived": {
                "type": "boolean"
              }
            },
            "required": [
              "id",
              "name",
              "color"
            ]
          }
        },
        "last_message_at": {
          "type": "string",
          "format": "date-time"
        },
        "waiting_since": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "waiting_seconds": {
          "anyOf": [
            {
              "type": "integer",
              "minimum": 0
            },
            {
              "type": "null"
            }
          ]
        },
        "waiting_metric_state": {
          "enum": [
            "ready",
            "unavailable"
          ]
        },
        "workspace_allowed_actions": {
          "type": "array",
          "items": {
            "enum": [
              "mark_read",
              "snooze",
              "wake",
              "tags"
            ]
          }
        }
      },
      "required": [
        "conversation",
        "latest_inbound_seq",
        "read_state",
        "snooze",
        "last_message_at",
        "waiting_since",
        "waiting_seconds",
        "waiting_metric_state",
        "workspace_allowed_actions"
      ]
    },
    "Request_chat-workspace-conversations": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-conversations"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            },
            "scope": {
              "type": "string"
            },
            "team_id": {
              "type": "string"
            },
            "status": {
              "type": "string"
            },
            "snooze": {
              "type": "string"
            },
            "unread": {
              "type": "string"
            },
            "channel": {
              "type": "string"
            },
            "channel_id": {
              "type": "string"
            },
            "page_id": {
              "type": "string"
            },
            "q": {
              "type": "string"
            },
            "sort": {
              "type": "string"
            },
            "inbox_id": {
              "type": "string"
            },
            "tag_ids": {
              "type": "string"
            }
          },
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-conversations": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_workspace-list"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_workspace-read-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_workspace-read-state"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Public_workspace-read-state": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "last_read_inbound_seq": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "latest_inbound_seq": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "unread_message_count": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "read_state_revision": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        }
      },
      "required": [
        "conversation_id",
        "last_read_inbound_seq",
        "latest_inbound_seq",
        "unread_message_count",
        "read_state_revision"
      ]
    },
    "Request_chat-workspace-conversations-id-read-state": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-conversations-id-read-state"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-conversations-id-read-state": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_workspace-read-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_workspace-mark-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "through_inbound_seq": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        }
      },
      "required": [
        "through_inbound_seq"
      ]
    },
    "Request_chat-workspace-mark-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-mark-read"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_workspace-mark-read"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-mark-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_workspace-read-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-inbox-options": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "filter_fields": {
              "type": "array",
              "items": {
                "enum": [
                  "status",
                  "owner_principal_id",
                  "team_id",
                  "channel",
                  "channel_id",
                  "tags"
                ]
              },
              "maxItems": 6
            },
            "can_share": {
              "type": "boolean"
            },
            "teams": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "name": {
                    "type": "string",
                    "maxLength": 255
                  }
                },
                "required": [
                  "id",
                  "name"
                ]
              },
              "maxItems": 200
            },
            "principals": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "name": {
                    "type": "string",
                    "maxLength": 255
                  }
                },
                "required": [
                  "id",
                  "name"
                ]
              },
              "maxItems": 500
            }
          },
          "required": [
            "filter_fields",
            "can_share",
            "teams",
            "principals"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-catalog-inbox-options": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-inbox-options"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {},
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-inbox-options": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-inbox-options"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-inbox-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_catalog-inbox"
          }
        },
        "next_cursor": {
          "type": [
            "string",
            "null"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Public_catalog-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "creator_principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "predicate_schema_version": {
          "const": 1
        },
        "predicate": {
          "$ref": "#/definitions/Public_catalog-predicate"
        },
        "sort": {
          "enum": [
            "latest_message_desc",
            "latest_message_asc",
            "waiting_longest"
          ]
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "archived": {
          "type": "boolean"
        },
        "shared": {
          "type": "boolean"
        },
        "shares": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "kind": {
                "enum": [
                  "principal",
                  "team"
                ]
              },
              "id": {
                "type": "string",
                "format": "uuid"
              }
            },
            "required": [
              "kind",
              "id"
            ]
          },
          "maxItems": 50
        },
        "allowed_actions": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 32
          }
        }
      },
      "required": [
        "id",
        "name",
        "creator_principal_id",
        "predicate_schema_version",
        "predicate",
        "sort",
        "version",
        "archived",
        "shared",
        "allowed_actions"
      ]
    },
    "Public_catalog-predicate": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "scope": {
          "enum": [
            "all",
            "mine",
            "unassigned",
            "team"
          ]
        },
        "team_id": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "type": "array",
          "items": {
            "enum": [
              "open",
              "pending",
              "closed"
            ]
          },
          "maxItems": 3,
          "minItems": 1,
          "uniqueItems": true
        },
        "snooze": {
          "enum": [
            "exclude",
            "include",
            "only"
          ]
        },
        "unread": {
          "enum": [
            "any",
            "only"
          ]
        },
        "channel": {
          "enum": [
            "messenger",
            "mock_messenger"
          ]
        },
        "channel_id": {
          "type": "string",
          "format": "uuid"
        },
        "tag_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 10,
          "uniqueItems": true
        }
      },
      "required": [
        "scope",
        "status",
        "snooze",
        "unread"
      ]
    },
    "Request_chat-catalog-list-inboxes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-list-inboxes"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            },
            "group": {
              "type": "string"
            }
          },
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-list-inboxes": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-inbox-list"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-inbox-create": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "predicate_schema_version": {
          "const": 1
        },
        "predicate": {
          "$ref": "#/definitions/Public_catalog-predicate-input"
        },
        "sort": {
          "enum": [
            "latest_message_desc",
            "latest_message_asc",
            "waiting_longest"
          ]
        },
        "shares": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "kind": {
                "enum": [
                  "principal",
                  "team"
                ]
              },
              "id": {
                "type": "string",
                "format": "uuid"
              }
            },
            "required": [
              "kind",
              "id"
            ]
          },
          "maxItems": 50
        }
      },
      "required": [
        "name",
        "predicate_schema_version",
        "predicate",
        "sort",
        "shares"
      ]
    },
    "Public_catalog-predicate-input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "scope": {
          "enum": [
            "all",
            "mine",
            "unassigned",
            "team"
          ]
        },
        "team_id": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "type": "array",
          "items": {
            "enum": [
              "open",
              "pending",
              "closed"
            ]
          },
          "maxItems": 3,
          "minItems": 1,
          "uniqueItems": true
        },
        "snooze": {
          "enum": [
            "exclude",
            "include",
            "only"
          ]
        },
        "unread": {
          "enum": [
            "any",
            "only"
          ]
        },
        "channel": {
          "enum": [
            "messenger",
            "mock_messenger"
          ]
        },
        "channel_id": {
          "type": "string",
          "format": "uuid"
        },
        "tag_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "maxItems": 10,
          "uniqueItems": true
        }
      },
      "required": []
    },
    "Public_catalog-inbox-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_catalog-inbox"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-catalog-create-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-create-inbox"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "body": {
              "$ref": "#/definitions/Public_catalog-inbox-create"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-create-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-inbox-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-catalog-get-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-get-inbox"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-get-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-inbox-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-inbox-patch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "predicate_schema_version": {
          "const": 1
        },
        "predicate": {
          "$ref": "#/definitions/Public_catalog-predicate-input"
        },
        "sort": {
          "enum": [
            "latest_message_desc",
            "latest_message_asc",
            "waiting_longest"
          ]
        },
        "creator_principal_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [],
      "minProperties": 1
    },
    "Request_chat-catalog-patch-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-patch-inbox"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-inbox-patch"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-patch-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-inbox-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-empty": {
      "type": "object",
      "additionalProperties": false,
      "properties": {},
      "required": []
    },
    "Public_catalog-archive": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "archived": {
              "const": true
            }
          },
          "required": [
            "id",
            "archived"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-catalog-delete-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-delete-inbox"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-empty"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-delete-inbox": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-archive"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-tag-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_catalog-tag"
          }
        },
        "next_cursor": {
          "type": [
            "string",
            "null"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Public_catalog-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40
        },
        "color": {
          "enum": [
            "gray",
            "blue",
            "green",
            "amber",
            "red",
            "purple"
          ]
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "archived": {
          "type": "boolean"
        },
        "allowed_actions": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 32
          }
        }
      },
      "required": [
        "id",
        "name",
        "color",
        "version",
        "archived",
        "allowed_actions"
      ]
    },
    "Request_chat-catalog-list-tags": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-list-tags"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            },
            "q": {
              "type": "string"
            }
          },
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-list-tags": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-tag-list"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-tag-create": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40
        },
        "color": {
          "enum": [
            "gray",
            "blue",
            "green",
            "amber",
            "red",
            "purple"
          ]
        }
      },
      "required": [
        "name",
        "color"
      ]
    },
    "Public_catalog-tag-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_catalog-tag"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-catalog-create-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-create-tag"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "body": {
              "$ref": "#/definitions/Public_catalog-tag-create"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-create-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-tag-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-catalog-get-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-get-tag"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-get-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-tag-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-tag-patch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40
        },
        "color": {
          "enum": [
            "gray",
            "blue",
            "green",
            "amber",
            "red",
            "purple"
          ]
        }
      },
      "required": [],
      "minProperties": 1
    },
    "Request_chat-catalog-patch-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-patch-tag"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-tag-patch"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-patch-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-tag-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-catalog-delete-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-delete-tag"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-empty"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-delete-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-archive"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-snippet-list": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_catalog-snippet"
          }
        },
        "next_cursor": {
          "type": [
            "string",
            "null"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "next_cursor",
        "meta"
      ]
    },
    "Public_catalog-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "shortcut": {
          "type": "string",
          "minLength": 1,
          "maxLength": 32
        },
        "text": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "archived": {
          "type": "boolean"
        },
        "allowed_actions": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 32
          }
        }
      },
      "required": [
        "id",
        "title",
        "shortcut",
        "text",
        "version",
        "archived",
        "allowed_actions"
      ]
    },
    "Request_chat-catalog-list-snippets": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-list-snippets"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string"
            },
            "q": {
              "type": "string"
            }
          },
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-list-snippets": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-snippet-list"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-snippet-create": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "shortcut": {
          "type": "string",
          "pattern": "^[a-z0-9_-]{1,32}$"
        },
        "text": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000
        }
      },
      "required": [
        "title",
        "shortcut",
        "text"
      ]
    },
    "Public_catalog-snippet-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_catalog-snippet"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-catalog-create-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-create-snippet"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "body": {
              "$ref": "#/definitions/Public_catalog-snippet-create"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-create-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-snippet-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-catalog-get-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-get-snippet"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-get-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-snippet-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-snippet-patch": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "shortcut": {
          "type": "string",
          "pattern": "^[a-z0-9_-]{1,32}$"
        },
        "text": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000
        }
      },
      "required": [],
      "minProperties": 1
    },
    "Request_chat-catalog-patch-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-patch-snippet"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-snippet-patch"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-patch-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-snippet-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-catalog-delete-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-delete-snippet"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-empty"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-delete-snippet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-archive"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-inbox-shares": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "shares": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "kind": {
                "enum": [
                  "principal",
                  "team"
                ]
              },
              "id": {
                "type": "string",
                "format": "uuid"
              }
            },
            "required": [
              "kind",
              "id"
            ]
          },
          "maxItems": 50
        }
      },
      "required": [
        "shares"
      ]
    },
    "Request_chat-catalog-inbox-shares": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-inbox-shares"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-inbox-shares"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-inbox-shares": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-inbox-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_catalog-tag-links": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "tag_ids": {
              "type": "array",
              "items": {
                "type": "string",
                "format": "uuid"
              },
              "maxItems": 20
            },
            "tag_set_revision": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation_id",
            "tag_ids",
            "tag_set_revision",
            "version"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "allowed_actions": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              }
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-catalog-put-conversation-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-put-conversation-tag"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "tagId": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-empty"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "tagId",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-put-conversation-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-tag-links"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-catalog-delete-conversation-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "catalog-delete-conversation-tag"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "tagId": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_catalog-empty"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "tagId",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-catalog-delete-conversation-tag": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_catalog-tag-links"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_snooze-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "$ref": "#/definitions/Public_snooze-state"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string"
            }
          },
          "required": []
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Public_snooze-state": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "until": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "snooze_revision": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "version": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "reason": {
          "type": "string",
          "maxLength": 250
        }
      },
      "required": [
        "conversation_id",
        "until",
        "snooze_revision",
        "version"
      ]
    },
    "Request_chat-workspace-get-snooze": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-get-snooze"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-get-snooze": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_snooze-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_snooze-put": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "until": {
          "type": "string",
          "format": "date-time"
        },
        "reason": {
          "type": "string",
          "maxLength": 250
        }
      },
      "required": [
        "until"
      ]
    },
    "Request_chat-workspace-put-snooze": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-put-snooze"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_snooze-put"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-put-snooze": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_snooze-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_snooze-empty": {
      "type": "object",
      "additionalProperties": false,
      "properties": {},
      "required": []
    },
    "Request_chat-workspace-post-wake": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-post-wake"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_snooze-empty"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "id",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-post-wake": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_snooze-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_activity-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Public_activity-item"
          }
        },
        "older_cursor": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "newer_cursor": {
          "type": "string"
        },
        "has_more": {
          "type": "boolean"
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "state": {
              "enum": [
                "ready",
                "backfilling",
                "partial"
              ]
            },
            "as_of": {
              "type": "string",
              "format": "date-time"
            },
            "sources": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "service": {
                    "enum": [
                      "chat",
                      "crm",
                      "workflow"
                    ]
                  },
                  "state": {
                    "enum": [
                      "ready",
                      "delayed",
                      "unavailable"
                    ]
                  },
                  "last_observed_at": {
                    "anyOf": [
                      {
                        "type": "string",
                        "format": "date-time"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                },
                "required": [
                  "service",
                  "state",
                  "last_observed_at"
                ]
              }
            },
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "state",
            "as_of",
            "sources"
          ]
        }
      },
      "required": [
        "data",
        "older_cursor",
        "newer_cursor",
        "has_more",
        "meta"
      ]
    },
    "Public_activity-item": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "const": "message"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            },
            "actor": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "kind": {
                      "enum": [
                        "human",
                        "ai",
                        "service",
                        "system"
                      ]
                    },
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    }
                  },
                  "required": [
                    "kind",
                    "id"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_ref": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "service": {
                  "enum": [
                    "chat",
                    "crm",
                    "workflow"
                  ]
                },
                "kind": {
                  "type": "string"
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "service",
                "kind",
                "id",
                "revision"
              ]
            },
            "payload": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "message_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "envelope": {
                  "$ref": "#/definitions/Public_conversation-message-envelope-v3"
                },
                "inbound_seq": {
                  "anyOf": [
                    {
                      "type": "string",
                      "pattern": "^(0|[1-9][0-9]{0,19})$"
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "message_id",
                "envelope",
                "inbound_seq"
              ]
            }
          },
          "required": [
            "id",
            "kind",
            "occurred_at",
            "recorded_at",
            "actor",
            "source_ref",
            "payload"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "const": "note"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            },
            "actor": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "kind": {
                      "enum": [
                        "human",
                        "ai",
                        "service",
                        "system"
                      ]
                    },
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    }
                  },
                  "required": [
                    "kind",
                    "id"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_ref": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "service": {
                  "enum": [
                    "chat",
                    "crm",
                    "workflow"
                  ]
                },
                "kind": {
                  "type": "string"
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "service",
                "kind",
                "id",
                "revision"
              ]
            },
            "payload": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "activity_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "body": {
                  "type": "string"
                }
              },
              "required": [
                "activity_id"
              ]
            }
          },
          "required": [
            "id",
            "kind",
            "occurred_at",
            "recorded_at",
            "actor",
            "source_ref",
            "payload"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "const": "assignment"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            },
            "actor": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "kind": {
                      "enum": [
                        "human",
                        "ai",
                        "service",
                        "system"
                      ]
                    },
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    }
                  },
                  "required": [
                    "kind",
                    "id"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_ref": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "service": {
                  "enum": [
                    "chat",
                    "crm",
                    "workflow"
                  ]
                },
                "kind": {
                  "type": "string"
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "service",
                "kind",
                "id",
                "revision"
              ]
            },
            "payload": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "from_principal_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "to_principal_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "owner_revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "reason": {
                  "type": "string"
                }
              },
              "required": [
                "from_principal_id",
                "to_principal_id",
                "owner_revision",
                "reason"
              ]
            }
          },
          "required": [
            "id",
            "kind",
            "occurred_at",
            "recorded_at",
            "actor",
            "source_ref",
            "payload"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "const": "lifecycle"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            },
            "actor": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "kind": {
                      "enum": [
                        "human",
                        "ai",
                        "service",
                        "system"
                      ]
                    },
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    }
                  },
                  "required": [
                    "kind",
                    "id"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_ref": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "service": {
                  "enum": [
                    "chat",
                    "crm",
                    "workflow"
                  ]
                },
                "kind": {
                  "type": "string"
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "service",
                "kind",
                "id",
                "revision"
              ]
            },
            "payload": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "from_status": {
                  "enum": [
                    "open",
                    "pending",
                    "closed"
                  ]
                },
                "to_status": {
                  "enum": [
                    "open",
                    "pending",
                    "closed"
                  ]
                }
              },
              "required": [
                "from_status",
                "to_status"
              ]
            }
          },
          "required": [
            "id",
            "kind",
            "occurred_at",
            "recorded_at",
            "actor",
            "source_ref",
            "payload"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "const": "snooze"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            },
            "actor": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "kind": {
                      "enum": [
                        "human",
                        "ai",
                        "service",
                        "system"
                      ]
                    },
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    }
                  },
                  "required": [
                    "kind",
                    "id"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_ref": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "service": {
                  "enum": [
                    "chat",
                    "crm",
                    "workflow"
                  ]
                },
                "kind": {
                  "type": "string"
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "service",
                "kind",
                "id",
                "revision"
              ]
            },
            "payload": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "until": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "date-time"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "cause": {
                  "enum": [
                    "scheduled",
                    "rescheduled",
                    "deadline",
                    "inbound",
                    "manual",
                    "assignment",
                    "closed"
                  ]
                }
              },
              "required": [
                "until",
                "cause"
              ]
            }
          },
          "required": [
            "id",
            "kind",
            "occurred_at",
            "recorded_at",
            "actor",
            "source_ref",
            "payload"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "const": "tags"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            },
            "actor": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "kind": {
                      "enum": [
                        "human",
                        "ai",
                        "service",
                        "system"
                      ]
                    },
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    }
                  },
                  "required": [
                    "kind",
                    "id"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_ref": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "service": {
                  "enum": [
                    "chat",
                    "crm",
                    "workflow"
                  ]
                },
                "kind": {
                  "type": "string"
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "service",
                "kind",
                "id",
                "revision"
              ]
            },
            "payload": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "tag_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "operation": {
                  "enum": [
                    "attached",
                    "detached"
                  ]
                }
              },
              "required": [
                "tag_id",
                "operation"
              ]
            }
          },
          "required": [
            "id",
            "kind",
            "occurred_at",
            "recorded_at",
            "actor",
            "source_ref",
            "payload"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "kind": {
              "const": "automation"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "recorded_at": {
              "type": "string",
              "format": "date-time"
            },
            "actor": {
              "anyOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "kind": {
                      "enum": [
                        "human",
                        "ai",
                        "service",
                        "system"
                      ]
                    },
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    }
                  },
                  "required": [
                    "kind",
                    "id"
                  ]
                },
                {
                  "type": "null"
                }
              ]
            },
            "source_ref": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "service": {
                  "enum": [
                    "chat",
                    "crm",
                    "workflow"
                  ]
                },
                "kind": {
                  "type": "string"
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "service",
                "kind",
                "id",
                "revision"
              ]
            },
            "payload": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "source_service": {
                  "enum": [
                    "workflow"
                  ]
                },
                "run_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "definition_version_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "state": {
                  "enum": [
                    "started",
                    "paused",
                    "resumed",
                    "completed",
                    "failed",
                    "cancelled"
                  ]
                }
              },
              "required": [
                "source_service",
                "run_id",
                "definition_version_id",
                "state"
              ]
            }
          },
          "required": [
            "id",
            "kind",
            "occurred_at",
            "recorded_at",
            "actor",
            "source_ref",
            "payload"
          ]
        }
      ]
    },
    "Request_chat-workspace-get-activity": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "workspace-get-activity"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "before": {
              "type": "string"
            },
            "after": {
              "type": "string"
            },
            "limit": {
              "type": "string"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-workspace-get-activity": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_activity-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-classification-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "status": {
              "enum": [
                "active",
                "closed"
              ]
            },
            "version": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "can_edit": {
              "type": "boolean"
            },
            "definitions": {
              "type": "array",
              "maxItems": 100,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "key": {
                    "type": "string"
                  },
                  "label": {
                    "type": "string"
                  },
                  "type": {
                    "enum": [
                      "string",
                      "text",
                      "integer",
                      "decimal",
                      "boolean",
                      "date",
                      "datetime",
                      "enum"
                    ]
                  },
                  "required": {
                    "type": "boolean"
                  },
                  "default_value": {
                    "anyOf": [
                      {
                        "type": "string"
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
                  "options": {
                    "type": [
                      "array",
                      "null"
                    ],
                    "items": {
                      "type": "string"
                    }
                  },
                  "indexed": {
                    "type": "boolean"
                  },
                  "sensitive": {
                    "type": "boolean"
                  },
                  "version": {
                    "type": "string",
                    "pattern": "^(0|[1-9][0-9]{0,19})$"
                  },
                  "can_write": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "id",
                  "key",
                  "label",
                  "type",
                  "required",
                  "default_value",
                  "options",
                  "indexed",
                  "sensitive",
                  "version",
                  "can_write"
                ]
              }
            },
            "values": {
              "type": "object",
              "additionalProperties": {
                "anyOf": [
                  {
                    "type": "string"
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
          "required": [
            "session_id",
            "conversation_id",
            "status",
            "version",
            "can_edit",
            "definitions",
            "values"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-conversation-classification-get-conversations-conversation-sessions-session-classification": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-classification-get-conversations-conversation-sessions-session-classification"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "conversation",
            "session"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-classification-get-conversations-conversation-sessions-session-classification": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-classification-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-classification-input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "values": {
          "type": "object",
          "minProperties": 1,
          "maxProperties": 100,
          "additionalProperties": {
            "anyOf": [
              {
                "type": "string"
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
      "required": [
        "values"
      ]
    },
    "Public_conversation-classification-result": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "version": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "session_id",
            "version"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-conversation-classification-post-conversations-conversation-sessions-session-classification": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-classification-post-conversations-conversation-sessions-session-classification"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_conversation-classification-input"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "conversation",
            "session",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-classification-post-conversations-conversation-sessions-session-classification": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-classification-result"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-contributions-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "coverage": {
              "enum": [
                "full",
                "partial",
                "none"
              ]
            },
            "owner": {
              "anyOf": [
                {
                  "type": "null"
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "id": {
                      "type": [
                        "string",
                        "null"
                      ],
                      "format": "uuid"
                    },
                    "team_id": {
                      "type": [
                        "string",
                        "null"
                      ],
                      "format": "uuid"
                    },
                    "revision": {
                      "type": "string",
                      "pattern": "^(0|[1-9][0-9]{0,19})$"
                    }
                  },
                  "required": [
                    "id",
                    "team_id",
                    "revision"
                  ]
                }
              ]
            },
            "history": {
              "type": "array",
              "maxItems": 50,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "revision": {
                    "type": "string",
                    "pattern": "^(0|[1-9][0-9]{0,19})$"
                  },
                  "kind": {
                    "enum": [
                      "opened",
                      "closed",
                      "assignment",
                      "outbound_submitted",
                      "note",
                      "stage",
                      "evidence",
                      "classification",
                      "outcome"
                    ]
                  },
                  "source_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "source_revision": {
                    "type": "string",
                    "pattern": "^(0|[1-9][0-9]{0,19})$"
                  },
                  "actor": {
                    "anyOf": [
                      {
                        "type": "null"
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "kind": {
                            "type": "string"
                          },
                          "id": {
                            "type": "string",
                            "format": "uuid"
                          }
                        },
                        "required": [
                          "kind",
                          "id"
                        ]
                      }
                    ]
                  },
                  "owner_id": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "format": "uuid"
                  },
                  "handling_team_id": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "format": "uuid"
                  },
                  "owner_revision": {
                    "type": "string",
                    "pattern": "^(0|[1-9][0-9]{0,19})$"
                  },
                  "recorded_at": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "payload": {
                    "type": "object"
                  }
                },
                "required": [
                  "id",
                  "revision",
                  "kind",
                  "source_id",
                  "source_revision",
                  "actor",
                  "owner_id",
                  "handling_team_id",
                  "owner_revision",
                  "recorded_at",
                  "payload"
                ]
              }
            },
            "next_before_revision": {
              "type": [
                "string",
                "null"
              ],
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "session_id",
            "coverage",
            "owner",
            "history",
            "next_before_revision"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-conversation-classification-get-conversations-conversation-sessions-session-contributions": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-classification-get-conversations-conversation-sessions-session-contributions"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            },
            "before_revision": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            }
          },
          "required": [
            "conversation",
            "session"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-classification-get-conversations-conversation-sessions-session-contributions": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-contributions-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_conversation-assignment-teams-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "array",
          "maxItems": 200,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "name": {
                "type": "string"
              },
              "purpose": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "purpose"
            ]
          }
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-conversation-classification-get-records-id-assignment-teams": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "conversation-classification-get-records-id-assignment-teams"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-conversation-classification-get-records-id-assignment-teams": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_conversation-assignment-teams-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_need-assessment-response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "version": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "outcomes": {
              "type": "array",
              "maxItems": 100,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "label": {
                    "type": "string"
                  },
                  "linked": {
                    "type": "boolean"
                  },
                  "can_link": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "id",
                  "label",
                  "linked",
                  "can_link"
                ]
              }
            },
            "can_edit": {
              "type": "boolean"
            },
            "definitions": {
              "type": "array",
              "maxItems": 105,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "key": {
                    "type": "string"
                  },
                  "label": {
                    "type": "string"
                  },
                  "type": {
                    "enum": [
                      "string",
                      "text",
                      "integer",
                      "decimal",
                      "boolean",
                      "date",
                      "datetime",
                      "enum"
                    ]
                  },
                  "required": {
                    "type": "boolean"
                  },
                  "default_value": {
                    "anyOf": [
                      {
                        "type": "string"
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
                  "options": {
                    "type": [
                      "array",
                      "null"
                    ],
                    "items": {
                      "type": "string"
                    }
                  },
                  "indexed": {
                    "type": "boolean"
                  },
                  "sensitive": {
                    "type": "boolean"
                  },
                  "version": {
                    "type": "string",
                    "pattern": "^(0|[1-9][0-9]{0,19})$"
                  },
                  "can_write": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "id",
                  "key",
                  "label",
                  "type",
                  "required",
                  "default_value",
                  "options",
                  "indexed",
                  "sensitive",
                  "version",
                  "can_write"
                ]
              }
            },
            "values": {
              "type": "object",
              "maxProperties": 100,
              "additionalProperties": {
                "anyOf": [
                  {
                    "type": "string"
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
            },
            "pinned": {
              "type": "array",
              "maxItems": 100,
              "uniqueItems": true,
              "items": {
                "type": "string"
              }
            },
            "proposal": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "values": {
                  "type": "object",
                  "maxProperties": 100,
                  "additionalProperties": {
                    "anyOf": [
                      {
                        "type": "string"
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
                },
                "confidence": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "evidence_ids": {
                  "type": "array",
                  "maxItems": 100,
                  "uniqueItems": true,
                  "items": {
                    "type": "string",
                    "format": "uuid"
                  }
                },
                "provider": {
                  "type": "string"
                },
                "model": {
                  "type": "string"
                },
                "config_version": {
                  "type": "string"
                },
                "input_fingerprint": {
                  "type": "string"
                },
                "assessed_at": {
                  "type": "string",
                  "format": "date-time"
                }
              },
              "required": [
                "values"
              ]
            },
            "history": {
              "type": "array",
              "maxItems": 50,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "version": {
                    "type": "string",
                    "pattern": "^(0|[1-9][0-9]{0,19})$"
                  },
                  "values": {
                    "type": "object",
                    "maxProperties": 100,
                    "additionalProperties": {
                      "anyOf": [
                        {
                          "type": "string"
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
                  },
                  "recorded_at": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "proposal": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "values": {
                        "type": "object",
                        "maxProperties": 100,
                        "additionalProperties": {
                          "anyOf": [
                            {
                              "type": "string"
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
                      },
                      "confidence": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                      },
                      "evidence_ids": {
                        "type": "array",
                        "maxItems": 100,
                        "uniqueItems": true,
                        "items": {
                          "type": "string",
                          "format": "uuid"
                        }
                      },
                      "provider": {
                        "type": "string"
                      },
                      "model": {
                        "type": "string"
                      },
                      "config_version": {
                        "type": "string"
                      },
                      "input_fingerprint": {
                        "type": "string"
                      },
                      "assessed_at": {
                        "type": "string",
                        "format": "date-time"
                      }
                    },
                    "required": [
                      "values"
                    ]
                  }
                },
                "required": [
                  "version",
                  "values",
                  "recorded_at",
                  "proposal"
                ]
              }
            }
          },
          "required": [
            "conversation_id",
            "session_id",
            "need_id",
            "version",
            "outcomes",
            "can_edit",
            "definitions",
            "values",
            "pinned",
            "proposal",
            "history"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-need-get-assessment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "need-get-assessment"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            },
            "need": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "conversation",
            "session",
            "need"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-need-get-assessment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_need-assessment-response"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_need-assessment-input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "values": {
          "type": "object",
          "maxProperties": 100,
          "additionalProperties": {
            "anyOf": [
              {
                "type": "string"
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
        },
        "release_pins": {
          "type": "array",
          "maxItems": 100,
          "uniqueItems": true,
          "items": {
            "type": "string"
          }
        }
      },
      "required": []
    },
    "Public_need-assessment-result": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation_id": {
              "type": "string",
              "format": "uuid"
            },
            "session_id": {
              "type": "string",
              "format": "uuid"
            },
            "need_id": {
              "type": "string",
              "format": "uuid"
            },
            "version": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "conversation_id",
            "session_id",
            "need_id",
            "version"
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "correlation_id": {
              "type": "string"
            }
          },
          "required": [
            "correlation_id"
          ]
        }
      },
      "required": [
        "data",
        "meta"
      ]
    },
    "Request_chat-need-post-assessment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "need-post-assessment"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            },
            "need": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_need-assessment-input"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "conversation",
            "session",
            "need",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-need-post-assessment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_need-assessment-result"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_need-enrich-input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {},
      "required": []
    },
    "Request_chat-need-post-enrich": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "need-post-enrich"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            },
            "need": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_need-enrich-input"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "conversation",
            "session",
            "need",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-need-post-enrich": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_need-assessment-result"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Public_need-outcome-input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "record_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "record_id"
      ]
    },
    "Request_chat-need-post-outcome": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "need-post-outcome"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "conversation": {
              "type": "string",
              "format": "uuid"
            },
            "session": {
              "type": "string",
              "format": "uuid"
            },
            "need": {
              "type": "string",
              "format": "uuid"
            },
            "body": {
              "$ref": "#/definitions/Public_need-outcome-input"
            },
            "expected_version": {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^(0|[1-9][0-9]{0,19})$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "idempotency_key": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            }
          },
          "required": [
            "conversation",
            "session",
            "need",
            "body",
            "expected_version",
            "idempotency_key"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-need-post-outcome": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/Public_need-assessment-result"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "External_listConversations": {
      "type": "object",
      "required": [
        "data",
        "meta"
      ],
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/External_Conversation"
          }
        },
        "meta": {
          "$ref": "#/definitions/External_Meta"
        },
        "next_cursor": {
          "type": [
            "string",
            "null"
          ]
        }
      }
    },
    "External_Conversation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "version",
        "properties"
      ],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "version": {
          "type": "string"
        },
        "properties": {
          "type": "object",
          "additionalProperties": false,
          "description": "Only explicitly selected properties are present. Opaque references do not expand related data.",
          "properties": {
            "status": {
              "type": "string"
            },
            "opened_at": {
              "type": "string",
              "format": "date-time"
            },
            "closed_at": {
              "type": [
                "string",
                "null"
              ],
              "format": "date-time"
            },
            "contact_id": {
              "type": "string",
              "format": "uuid"
            },
            "team_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            },
            "owner_principal_id": {
              "type": [
                "string",
                "null"
              ],
              "format": "uuid"
            }
          }
        }
      }
    },
    "External_Meta": {
      "type": "object",
      "required": [
        "correlation_id"
      ],
      "properties": {
        "correlation_id": {
          "type": "string"
        }
      }
    },
    "Request_chat-external-conversations": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "external-conversations"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string",
              "maxLength": 4096
            }
          },
          "required": []
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-external-conversations": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/External_listConversations"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "External_getConversation": {
      "type": "object",
      "required": [
        "data",
        "meta"
      ],
      "properties": {
        "data": {
          "$ref": "#/definitions/External_Conversation"
        },
        "meta": {
          "$ref": "#/definitions/External_Meta"
        }
      }
    },
    "Request_chat-external-conversations-id": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "external-conversations-id"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-external-conversations-id": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/External_getConversation"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "External_listConversationMessages": {
      "type": "object",
      "required": [
        "data",
        "meta"
      ],
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/External_Message"
          }
        },
        "meta": {
          "$ref": "#/definitions/External_Meta"
        },
        "next_cursor": {
          "type": [
            "string",
            "null"
          ]
        }
      }
    },
    "External_Message": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "conversation_id",
        "properties"
      ],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "properties": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "direction": {
              "enum": [
                "inbound",
                "outbound"
              ]
            },
            "status": {
              "type": "string"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "received_at": {
              "type": "string",
              "format": "date-time"
            },
            "text": {
              "type": "string",
              "description": "Sensitive stored plain text or media preview; never an attachment URL."
            }
          }
        }
      }
    },
    "Request_chat-external-conversations-id-messages": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "external-conversations-id-messages"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            },
            "cursor": {
              "type": "string",
              "maxLength": 4096
            }
          },
          "required": [
            "id"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-external-conversations-id-messages": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/External_listConversationMessages"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "External_getConversationMessage": {
      "type": "object",
      "required": [
        "data",
        "meta"
      ],
      "properties": {
        "data": {
          "$ref": "#/definitions/External_Message"
        },
        "meta": {
          "$ref": "#/definitions/External_Meta"
        }
      }
    },
    "Request_chat-external-conversations-id-messages-messageId": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "external-conversations-id-messages-messageId"
        },
        "actor": {
          "$ref": "#/definitions/OwnerActor"
        },
        "command_id": {
          "type": "string",
          "format": "uuid"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid"
            },
            "messageId": {
              "type": "string",
              "format": "uuid"
            }
          },
          "required": [
            "id",
            "messageId"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "actor",
        "command_id",
        "payload"
      ]
    },
    "Reply_chat-external-conversations-id-messages-messageId": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/External_getConversationMessage"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "OwnerExternalReadPolicy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "admission": {
          "$ref": "#/definitions/OwnerAdmission"
        },
        "app_id": {
          "type": "string",
          "format": "uuid"
        },
        "policy_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128
        },
        "predicates": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "all": {
                "type": "boolean"
              },
              "team_ids": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uuid"
                },
                "maxItems": 20
              }
            },
            "required": [
              "all",
              "team_ids"
            ]
          },
          "maxItems": 2
        }
      },
      "required": [
        "admission",
        "app_id",
        "policy_key",
        "predicates"
      ]
    },
    "Request_chat-external-prepare": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "external-prepare"
        },
        "payload": {
          "anyOf": [
            {
              "$ref": "#/definitions/Request_chat-external-conversations"
            },
            {
              "$ref": "#/definitions/Request_chat-external-conversations-id"
            },
            {
              "$ref": "#/definitions/Request_chat-external-conversations-id-messages"
            },
            {
              "$ref": "#/definitions/Request_chat-external-conversations-id-messages-messageId"
            }
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-external-prepare": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-external-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "external-policy"
        },
        "payload": {
          "$ref": "#/definitions/OwnerCommandRef"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-external-policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerExternalReadPolicy"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "chat_workspace_workspace-read-event": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "principal_id": {
          "type": "string",
          "format": "uuid"
        },
        "through_inbound_seq": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        },
        "read_state_revision": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        }
      },
      "required": [
        "conversation_id",
        "principal_id",
        "through_inbound_seq",
        "read_state_revision"
      ]
    },
    "chat_activity_snooze-event": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "until": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "snooze_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "cause": {
          "enum": [
            "scheduled",
            "rescheduled",
            "deadline",
            "inbound",
            "manual",
            "assignment",
            "closed"
          ]
        }
      },
      "required": [
        "conversation_id",
        "until",
        "snooze_revision",
        "cause"
      ]
    },
    "chat_catalogs_catalog-inbox-event": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "inbox_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "enum": [
            "created",
            "updated",
            "shared",
            "archived",
            "transferred"
          ]
        }
      },
      "required": [
        "inbox_id",
        "operation"
      ]
    },
    "chat_catalogs_catalog-snippet-event": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "snippet_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "enum": [
            "created",
            "updated",
            "archived"
          ]
        }
      },
      "required": [
        "snippet_id",
        "operation"
      ]
    },
    "chat_catalogs_catalog-tag-event": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "tag_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "enum": [
            "created",
            "updated",
            "archived"
          ]
        }
      },
      "required": [
        "tag_id",
        "operation"
      ]
    },
    "chat_catalogs_catalog-tag-link-event": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tag_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "enum": [
            "attached",
            "detached"
          ]
        },
        "tag_set_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "conversation_id",
        "tag_id",
        "operation",
        "tag_set_revision"
      ]
    },
    "chat_activity_activity-note-event": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "activity_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "enum": [
            "created",
            "updated",
            "archived"
          ]
        },
        "source_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "conversation_id",
        "activity_id",
        "operation",
        "source_revision"
      ]
    },
    "chat_activity_activity-automation-event": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conversation_id": {
          "type": "string",
          "format": "uuid"
        },
        "source_service": {
          "enum": [
            "workflow"
          ]
        },
        "run_id": {
          "type": "string",
          "format": "uuid"
        },
        "definition_version_id": {
          "type": "string",
          "format": "uuid"
        },
        "state": {
          "enum": [
            "started",
            "paused",
            "resumed",
            "completed",
            "failed",
            "cancelled"
          ]
        },
        "source_revision": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        }
      },
      "required": [
        "conversation_id",
        "source_service",
        "run_id",
        "definition_version_id",
        "state",
        "source_revision"
      ]
    },
    "OwnerChatEvent": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "consumer": {
              "const": "chat.read-marker.v1"
            },
            "event_type": {
              "const": "chat.read_marker.updated"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "$ref": "#/definitions/chat_workspace_workspace-read-event"
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "consumer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "consumer": {
              "const": "chat.snooze.v1"
            },
            "event_type": {
              "const": "chat.snooze.changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "$ref": "#/definitions/chat_activity_snooze-event"
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "consumer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "consumer": {
              "const": "chat.inbox.changed.v1"
            },
            "event_type": {
              "const": "chat.inbox.changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "$ref": "#/definitions/chat_catalogs_catalog-inbox-event"
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "consumer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "consumer": {
              "const": "chat.snippet.changed.v1"
            },
            "event_type": {
              "const": "chat.snippet.changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "$ref": "#/definitions/chat_catalogs_catalog-snippet-event"
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "consumer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "consumer": {
              "const": "chat.tag_definition.changed.v1"
            },
            "event_type": {
              "const": "chat.tag_definition.changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "$ref": "#/definitions/chat_catalogs_catalog-tag-event"
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "consumer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "consumer": {
              "const": "chat.conversation-tag.v1"
            },
            "event_type": {
              "const": "chat.conversation_tag.changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "$ref": "#/definitions/chat_catalogs_catalog-tag-link-event"
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "consumer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "crm"
            },
            "consumer": {
              "const": "chat.activity.note.v1"
            },
            "event_type": {
              "const": "crm.conversation_note.changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "$ref": "#/definitions/chat_activity_activity-note-event"
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "consumer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "workflow"
            },
            "consumer": {
              "const": "chat.activity.automation.v1"
            },
            "event_type": {
              "const": "automation.conversation_activity.v1"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "$ref": "#/definitions/chat_activity_activity-automation-event"
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "consumer",
            "event_type",
            "schema_version",
            "data"
          ]
        }
      ]
    },
    "OwnerEventNotice": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "producer": {
          "enum": [
            "chat",
            "identity",
            "crm",
            "connector",
            "routing",
            "ai-runtime",
            "workflow",
            "reporting",
            "external-api",
            "bff",
            "sales"
          ]
        },
        "consumer": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "event_id": {
          "type": "string",
          "format": "uuid"
        },
        "event_type": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128
        },
        "schema_version": {
          "type": "integer",
          "minimum": 1,
          "maximum": 3
        },
        "aggregate_id": {
          "type": "string",
          "format": "uuid"
        },
        "stream_sequence": {
          "type": "string",
          "pattern": "^[1-9][0-9]{0,19}$"
        },
        "digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      },
      "required": [
        "producer",
        "consumer",
        "event_id",
        "event_type",
        "schema_version",
        "aggregate_id",
        "stream_sequence",
        "digest"
      ]
    },
    "OwnerEventReceipt": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "event_id": {
          "type": "string",
          "format": "uuid"
        },
        "consumer": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "producer": {
          "enum": [
            "chat",
            "identity",
            "crm",
            "connector",
            "routing",
            "ai-runtime",
            "workflow",
            "reporting",
            "external-api",
            "bff",
            "sales"
          ]
        },
        "digest": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "state": {
          "enum": [
            "pending",
            "applied",
            "duplicate",
            "reconciled",
            "quarantined"
          ]
        },
        "watermark": {
          "type": "string",
          "pattern": "^(0|[1-9][0-9]{0,19})$"
        }
      },
      "required": [
        "event_id",
        "consumer",
        "producer",
        "digest",
        "state",
        "watermark"
      ]
    },
    "OwnerDomainEvent": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "identity"
            },
            "event_type": {
              "const": "principal.access_changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "principal_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "auth_revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "principal_id",
                "auth_revision"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "conversation.created"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "contact_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "connection_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "contact_id",
                "connection_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "acquisition_session.opened"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "session_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "conversation_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "status": {
                  "enum": [
                    "active",
                    "closed"
                  ]
                },
                "source_classification": {
                  "enum": [
                    "paid",
                    "organic",
                    "unknown"
                  ]
                },
                "source_ad_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "sequence": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "session_id",
                "conversation_id",
                "status",
                "source_classification",
                "source_ad_id",
                "sequence"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "acquisition_session.closed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "session_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "conversation_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "status": {
                  "enum": [
                    "active",
                    "closed"
                  ]
                },
                "source_classification": {
                  "enum": [
                    "paid",
                    "organic",
                    "unknown"
                  ]
                },
                "source_ad_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 255
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "sequence": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              },
              "required": [
                "session_id",
                "conversation_id",
                "status",
                "source_classification",
                "source_ad_id",
                "sequence"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "need.assessed"
            },
            "schema_version": {
              "const": 2
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "conversation_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "session_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "need_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "assessment_version": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "contact_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "connection_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "conversation_id",
                "session_id",
                "need_id",
                "assessment_version",
                "contact_id",
                "connection_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "need.assessed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "thread_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "session_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "need_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "assessment_version": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "contact_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "connection_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "thread_id",
                "session_id",
                "need_id",
                "assessment_version",
                "contact_id",
                "connection_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "record.assigned"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "record_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "object_type": {
                  "const": "conversation"
                },
                "from_owner_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "to_owner_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "team_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "owner_revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "reason": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 1000
                }
              },
              "required": [
                "record_id",
                "object_type",
                "from_owner_id",
                "to_owner_id",
                "team_id",
                "owner_revision",
                "reason"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "sales"
            },
            "event_type": {
              "const": "lead.accepted"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "lead_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "handoff_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "accepted_by": {
                  "type": "string",
                  "format": "uuid"
                },
                "accepted_at": {
                  "type": "string",
                  "format": "date-time"
                }
              },
              "required": [
                "lead_id",
                "handoff_id",
                "accepted_by",
                "accepted_at"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "message.received"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "conversation_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "message_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "connection_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "conversation_id",
                "message_id",
                "connection_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "message.sent"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "conversation_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "message_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "outbound_intent_id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "conversation_id",
                "message_id",
                "outbound_intent_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "message.delivery_failed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "conversation_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "outbound_intent_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "error_code": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 64
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "conversation_id",
                "outbound_intent_id",
                "error_code"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "conversation.classification_changed"
            },
            "schema_version": {
              "const": 2
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "conversation_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "session_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "version": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "changed_keys": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 128
                  },
                  "maxItems": 100
                }
              },
              "required": [
                "conversation_id",
                "session_id",
                "version",
                "changed_keys"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "conversation.classification_changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "thread_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "session_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "version": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "changed_keys": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 128
                  },
                  "maxItems": 100
                }
              },
              "required": [
                "thread_id",
                "session_id",
                "version",
                "changed_keys"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "sales"
            },
            "event_type": {
              "const": "sales.stage_changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "object_kind": {
                  "enum": [
                    "lead",
                    "deal"
                  ]
                },
                "subject_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "sequence": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "from_stage": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 64
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "to_stage": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 64
                }
              },
              "required": [
                "object_kind",
                "subject_id",
                "sequence",
                "from_stage",
                "to_stage"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "chat"
            },
            "event_type": {
              "const": "session.progress_changed"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "session_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "action": {
                  "enum": [
                    "enroll",
                    "stage",
                    "need",
                    "identify_need",
                    "record",
                    "replace",
                    "retract"
                  ]
                }
              },
              "required": [
                "session_id",
                "revision",
                "action"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "crm"
            },
            "event_type": {
              "const": "contact.created"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
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
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "sales"
            },
            "event_type": {
              "const": "lead.created"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "lead_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "contact_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "conversation_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "lead_id",
                "contact_id",
                "conversation_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "sales"
            },
            "event_type": {
              "const": "lead.qualified"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "lead_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "qualified_at": {
                  "type": "string",
                  "format": "date-time"
                },
                "source_touchpoint_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "lead_id",
                "qualified_at",
                "source_touchpoint_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "sales"
            },
            "event_type": {
              "const": "lead.handoff_requested"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "lead_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "handoff_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "target_team_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "due_at": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "date-time"
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "lead_id",
                "handoff_id",
                "target_team_id",
                "due_at"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "sales"
            },
            "event_type": {
              "const": "deal.created"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "deal_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "contact_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "lead_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "deal_id",
                "contact_id",
                "lead_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "sales"
            },
            "event_type": {
              "const": "deal.won"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "deal_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "contact_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "lead_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "required": [
                "deal_id",
                "contact_id",
                "lead_id"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "crm"
            },
            "event_type": {
              "const": "record.assigned"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "record_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "object_type": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                "from_owner_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "to_owner_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "team_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "owner_revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "reason": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 1000
                }
              },
              "required": [
                "record_id",
                "object_type",
                "from_owner_id",
                "to_owner_id",
                "team_id",
                "owner_revision",
                "reason"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "event_id": {
              "type": "string",
              "format": "uuid"
            },
            "tenant_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "aggregate_type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64
            },
            "aggregate_version": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "stream_sequence": {
              "type": "string",
              "pattern": "^[1-9][0-9]{0,19}$"
            },
            "occurred_at": {
              "type": "string",
              "format": "date-time"
            },
            "correlation_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "causation_id": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                {
                  "type": "null"
                }
              ]
            },
            "actor": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "enum": [
                    "human",
                    "ai",
                    "service",
                    "system"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                }
              },
              "required": [
                "kind",
                "id"
              ]
            },
            "producer": {
              "const": "sales"
            },
            "event_type": {
              "const": "record.assigned"
            },
            "schema_version": {
              "const": 1
            },
            "data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "record_id": {
                  "type": "string",
                  "format": "uuid"
                },
                "object_type": {
                  "enum": [
                    "lead",
                    "deal"
                  ]
                },
                "from_owner_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "to_owner_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "team_id": {
                  "anyOf": [
                    {
                      "type": "string",
                      "format": "uuid"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "owner_revision": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                },
                "reason": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 1000
                }
              },
              "required": [
                "record_id",
                "object_type",
                "from_owner_id",
                "to_owner_id",
                "team_id",
                "owner_revision",
                "reason"
              ]
            }
          },
          "required": [
            "event_id",
            "tenant_id",
            "aggregate_id",
            "aggregate_type",
            "aggregate_version",
            "stream_sequence",
            "occurred_at",
            "correlation_id",
            "causation_id",
            "actor",
            "producer",
            "event_type",
            "schema_version",
            "data"
          ]
        }
      ]
    },
    "chat_control_v1_ChatControlEvent": {
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
          "$ref": "#/definitions/chat_control_v1_ChatRegistrySnapshot"
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
    "chat_control_v1_ChatRegistrySnapshot": {
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
    "OwnerControlEvent": {
      "$ref": "#/definitions/chat_control_v1_ChatControlEvent"
    },
    "OwnerEventPayload": {
      "oneOf": [
        {
          "$ref": "#/definitions/OwnerChatEvent"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "notice": {
              "$ref": "#/definitions/OwnerEventNotice"
            }
          },
          "required": [
            "notice"
          ]
        }
      ]
    },
    "OwnerEventReadResult": {
      "oneOf": [
        {
          "$ref": "#/definitions/OwnerChatEvent"
        },
        {
          "$ref": "#/definitions/OwnerDomainEvent"
        },
        {
          "$ref": "#/definitions/OwnerControlEvent"
        }
      ]
    },
    "Request_chat-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_chat-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_chat-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_identity-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_identity-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_crm-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_crm-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_connector-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_connector-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_routing-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_routing-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_sales-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_sales-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_ai-runtime-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_ai-runtime-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_ai-runtime-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_ai-runtime-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_ai-runtime-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_ai-runtime-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_ai-runtime-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_ai-runtime-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_workflow-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_workflow-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_workflow-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_workflow-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_workflow-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_reporting-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-deliver"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventPayload"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_reporting-event-deliver": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_reporting-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-status"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_reporting-event-status": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReceipt"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_reporting-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-replay"
        },
        "payload": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "consumer": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "aggregate_id": {
              "type": "string",
              "format": "uuid"
            },
            "after_sequence": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            },
            "limit": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": [
            "consumer",
            "aggregate_id",
            "after_sequence",
            "limit"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_reporting-event-replay": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OwnerEventNotice"
              },
              "maxItems": 100
            },
            "high_watermark": {
              "type": "string",
              "pattern": "^(0|[1-9][0-9]{0,19})$"
            }
          },
          "required": [
            "events",
            "high_watermark"
          ]
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    },
    "Request_reporting-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "correlation_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "operation": {
          "const": "event-read"
        },
        "payload": {
          "$ref": "#/definitions/OwnerEventNotice"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "correlation_id",
        "tenant_id",
        "operation",
        "payload"
      ]
    },
    "Reply_reporting-event-read": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "schema_version": {
          "const": 1
        },
        "request_id": {
          "type": "string",
          "format": "uuid"
        },
        "tenant_id": {
          "type": "string",
          "format": "uuid"
        },
        "result": {
          "$ref": "#/definitions/OwnerEventReadResult"
        }
      },
      "required": [
        "schema_version",
        "request_id",
        "tenant_id",
        "result"
      ]
    }
  },
  "$ref": "#/definitions/OwnerCommandBinding"
};
