/* Generated. Do not edit. */
export const workflowCatalogSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://agentic-crm.local/schemas/workflow-catalog.json",
  "title": "WorkflowCatalog",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schema_version",
    "tenant_id",
    "principal_id",
    "authorization_revision",
    "revision",
    "objects",
    "relations"
  ],
  "properties": {
    "schema_version": {
      "const": 1
    },
    "tenant_id": {
      "type": "string",
      "format": "uuid"
    },
    "principal_id": {
      "type": "string",
      "format": "uuid"
    },
    "authorization_revision": {
      "type": "string",
      "pattern": "^[1-9][0-9]{0,19}$"
    },
    "revision": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "objects": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "key",
          "label",
          "kind",
          "version",
          "schema_version",
          "owner_service",
          "properties",
          "capabilities"
        ],
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "key": {
            "type": "string",
            "pattern": "^[a-z][a-z0-9_]{0,63}$"
          },
          "label": {
            "type": "string",
            "maxLength": 255,
            "minLength": 1
          },
          "kind": {
            "enum": [
              "standard",
              "custom"
            ]
          },
          "version": {
            "type": "string",
            "pattern": "^[1-9][0-9]{0,19}$"
          },
          "schema_version": {
            "type": "string",
            "pattern": "^[1-9][0-9]{0,19}$"
          },
          "owner_service": {
            "enum": [
              "crm",
              "sales",
              "chat",
              "ticket"
            ]
          },
          "properties": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "id",
                "key",
                "label",
                "type",
                "required",
                "nullable",
                "options",
                "indexed",
                "readable",
                "writable",
                "filter_operators",
                "version"
              ],
              "properties": {
                "id": {
                  "type": "string",
                  "pattern": "^(standard:[a-z][a-z0-9_]{0,63}|[a-fA-F0-9-]{36})$"
                },
                "key": {
                  "type": "string",
                  "pattern": "^[a-z][a-z0-9_]{0,63}$"
                },
                "label": {
                  "type": "string",
                  "maxLength": 255,
                  "minLength": 1
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
                    "enum",
                    "reference",
                    "opaque"
                  ]
                },
                "required": {
                  "type": "boolean"
                },
                "nullable": {
                  "type": "boolean"
                },
                "options": {
                  "anyOf": [
                    {
                      "type": "array",
                      "items": {
                        "type": "string",
                        "maxLength": 255,
                        "minLength": 1
                      },
                      "maxItems": 100,
                      "minItems": 0
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "indexed": {
                  "type": "boolean"
                },
                "readable": {
                  "const": true
                },
                "writable": {
                  "type": "boolean"
                },
                "filter_operators": {
                  "type": "array",
                  "items": {
                    "enum": [
                      "eq",
                      "in",
                      "gte",
                      "lte"
                    ]
                  },
                  "maxItems": 4,
                  "minItems": 0
                },
                "version": {
                  "type": "string",
                  "pattern": "^[1-9][0-9]{0,19}$"
                }
              }
            },
            "maxItems": 200,
            "minItems": 0
          },
          "capabilities": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "record_read",
              "record_query",
              "record_update",
              "workflow_actions",
              "object_change_events",
              "change_images",
              "relation_traversal"
            ],
            "properties": {
              "record_read": {
                "type": "boolean"
              },
              "record_query": {
                "type": "boolean"
              },
              "record_update": {
                "type": "boolean"
              },
              "workflow_actions": {
                "const": false
              },
              "object_change_events": {
                "const": false
              },
              "change_images": {
                "const": false
              },
              "relation_traversal": {
                "const": false
              }
            }
          }
        }
      },
      "maxItems": 100,
      "minItems": 0
    },
    "relations": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "key",
          "label",
          "version",
          "source_object_type_id",
          "target_object_type_id",
          "cardinality"
        ],
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "key": {
            "type": "string",
            "pattern": "^[a-z][a-z0-9_]{0,63}$"
          },
          "label": {
            "type": "string",
            "maxLength": 255,
            "minLength": 1
          },
          "version": {
            "type": "string",
            "pattern": "^[1-9][0-9]{0,19}$"
          },
          "source_object_type_id": {
            "type": "string",
            "format": "uuid"
          },
          "target_object_type_id": {
            "type": "string",
            "format": "uuid"
          },
          "cardinality": {
            "enum": [
              "one_to_one",
              "one_to_many",
              "many_to_many"
            ]
          }
        }
      },
      "maxItems": 500,
      "minItems": 0
    }
  }
};
