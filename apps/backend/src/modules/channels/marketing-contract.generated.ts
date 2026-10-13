// Generated from reviewed Marketing contracts; do not hand edit.
export const authoritySchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:agentic-crm:marketing-authority:v1",
  "description": "PLAN-011E request contracts. Design only; no deployed endpoints implied. Private requests derive tenant from authenticated integration registration.",
  "definitions": {
    "uuid": {
      "type": "string",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    },
    "opaque": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "pattern": "^[A-Za-z0-9_-]+$"
    },
    "revision": {
      "type": "string",
      "pattern": "^[1-9][0-9]{0,19}$"
    },
    "hash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "graphRead": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "credential_ref",
        "operation"
      ],
      "properties": {
        "credential_ref": {
          "$ref": "#/definitions/uuid"
        },
        "operation": {
          "enum": [
            "account",
            "ads_page",
            "campaign",
            "ad_set",
            "ad",
            "creative",
            "audience"
          ]
        },
        "external_id": {
          "$ref": "#/definitions/opaque"
        },
        "after": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2048,
          "pattern": "^[\\x21-\\x7e]+$"
        }
      },
      "allOf": [
        {
          "if": {
            "properties": {
              "operation": {
                "enum": [
                  "account",
                  "ads_page"
                ]
              }
            }
          },
          "then": {
            "not": {
              "required": [
                "external_id"
              ]
            }
          },
          "else": {
            "required": [
              "external_id"
            ]
          }
        },
        {
          "if": {
            "not": {
              "properties": {
                "operation": {
                  "const": "ads_page"
                }
              }
            }
          },
          "then": {
            "not": {
              "required": [
                "after"
              ]
            }
          }
        }
      ]
    },
    "pageCheck": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "credential_ref",
        "page_id"
      ],
      "properties": {
        "credential_ref": {
          "$ref": "#/definitions/uuid"
        },
        "page_id": {
          "$ref": "#/definitions/opaque"
        }
      }
    },
    "admit": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "operation_id",
        "credential_ref",
        "expected_credential_revision",
        "page_id",
        "expected_page_revision",
        "external_ad_id",
        "payload_sha256",
        "run_id",
        "fence",
        "fetched_at"
      ],
      "properties": {
        "operation_id": {
          "$ref": "#/definitions/uuid"
        },
        "credential_ref": {
          "$ref": "#/definitions/uuid"
        },
        "expected_credential_revision": {
          "$ref": "#/definitions/revision"
        },
        "page_id": {
          "$ref": "#/definitions/opaque"
        },
        "expected_page_revision": {
          "$ref": "#/definitions/revision"
        },
        "external_ad_id": {
          "$ref": "#/definitions/opaque"
        },
        "payload_sha256": {
          "$ref": "#/definitions/hash"
        },
        "run_id": {
          "$ref": "#/definitions/uuid"
        },
        "fence": {
          "$ref": "#/definitions/revision"
        },
        "fetched_at": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "credentialCreate": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "operation_id",
        "app_id",
        "external_account_id",
        "token"
      ],
      "properties": {
        "operation_id": {
          "$ref": "#/definitions/uuid"
        },
        "app_id": {
          "$ref": "#/definitions/opaque"
        },
        "external_account_id": {
          "$ref": "#/definitions/opaque"
        },
        "token": {
          "type": "string",
          "minLength": 1,
          "maxLength": 8192,
          "writeOnly": true
        }
      }
    },
    "credentialReplace": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "operation_id",
        "expected_version",
        "token"
      ],
      "properties": {
        "operation_id": {
          "$ref": "#/definitions/uuid"
        },
        "expected_version": {
          "$ref": "#/definitions/revision"
        },
        "token": {
          "type": "string",
          "minLength": 1,
          "maxLength": 8192,
          "writeOnly": true
        }
      }
    },
    "revoke": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "operation_id",
        "expected_version"
      ],
      "properties": {
        "operation_id": {
          "$ref": "#/definitions/uuid"
        },
        "expected_version": {
          "$ref": "#/definitions/revision"
        }
      }
    },
    "setEnabled": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "operation_id",
        "expected_version",
        "enabled"
      ],
      "properties": {
        "operation_id": {
          "$ref": "#/definitions/uuid"
        },
        "expected_version": {
          "$ref": "#/definitions/revision"
        },
        "enabled": {
          "type": "boolean"
        }
      }
    },
    "bindingCreate": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "operation_id",
        "credential_ref",
        "external_account_id",
        "app_id"
      ],
      "properties": {
        "operation_id": {
          "$ref": "#/definitions/uuid"
        },
        "credential_ref": {
          "$ref": "#/definitions/uuid"
        },
        "external_account_id": {
          "$ref": "#/definitions/opaque"
        },
        "app_id": {
          "$ref": "#/definitions/opaque"
        }
      }
    },
    "syncNow": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "operation_id"
      ],
      "properties": {
        "operation_id": {
          "$ref": "#/definitions/uuid"
        }
      }
    }
  }
};
export const metadataProfile = {
  "schema_version": 1,
  "profile": "object_metadata_v1",
  "status": "Ready design; backend NOT_IMPLEMENTED",
  "api_version": "v25.0",
  "provider_origin": "https://graph.facebook.com",
  "required_read_permission": "ads_read",
  "credential_authority": "channels-v1",
  "source_dictionary": "marketing-storage-dictionary.json",
  "metadata_field_count": 88,
  "queries": [
    {
      "operation": "account",
      "table": "marketing_account",
      "method": "GET",
      "path": "/v25.0/act_{authorized_account_id}",
      "fields": [
        "id",
        "account_id",
        "name",
        "account_status",
        "disable_reason",
        "currency",
        "timezone_id",
        "timezone_name",
        "timezone_offset_hours_utc",
        "business{id}",
        "spend_cap"
      ],
      "columns": [
        "provider_node_id",
        "external_account_id",
        "name",
        "account_status_code",
        "disable_reason_code",
        "currency",
        "provider_timezone_id",
        "timezone_name",
        "observed_utc_offset_hours",
        "business_id",
        "spend_cap_raw"
      ],
      "authorization": "credential-scoped account; Page admission before child persistence",
      "live_verification": "NOT_RUN"
    },
    {
      "operation": "campaign",
      "table": "marketing_campaign",
      "method": "GET",
      "path": "/v25.0/{validated_external_id}",
      "fields": [
        "id",
        "account_id",
        "name",
        "objective",
        "buying_type",
        "status",
        "effective_status",
        "daily_budget",
        "lifetime_budget",
        "budget_remaining",
        "bid_strategy",
        "special_ad_categories",
        "special_ad_category_country",
        "is_adset_budget_sharing_enabled",
        "start_time",
        "stop_time",
        "created_time",
        "updated_time"
      ],
      "columns": [
        "external_campaign_id",
        "external_account_id",
        "name",
        "objective",
        "buying_type",
        "configured_status",
        "effective_status",
        "daily_budget_raw",
        "lifetime_budget_raw",
        "budget_remaining_raw",
        "bid_strategy",
        "special_ad_categories",
        "special_ad_category_country",
        "is_adset_budget_sharing_enabled",
        "start_time",
        "stop_time",
        "provider_created_at",
        "provider_updated_at"
      ],
      "authorization": "credential-scoped account; Page admission before child persistence",
      "live_verification": "NOT_RUN"
    },
    {
      "operation": "ad_set",
      "table": "marketing_ad_set",
      "method": "GET",
      "path": "/v25.0/{validated_external_id}",
      "fields": [
        "id",
        "account_id",
        "campaign_id",
        "name",
        "status",
        "effective_status",
        "destination_type",
        "optimization_goal",
        "billing_event",
        "bid_strategy",
        "bid_amount",
        "daily_budget",
        "lifetime_budget",
        "budget_remaining",
        "start_time",
        "end_time",
        "adset_schedule",
        "is_dynamic_creative",
        "attribution_spec",
        "promoted_object",
        "targeting",
        "learning_stage_info",
        "issues_info",
        "created_time",
        "updated_time"
      ],
      "columns": [
        "external_adset_id",
        "external_account_id",
        "external_campaign_id",
        "name",
        "configured_status",
        "effective_status",
        "destination_type",
        "optimization_goal",
        "billing_event",
        "bid_strategy",
        "bid_amount_raw",
        "daily_budget_raw",
        "lifetime_budget_raw",
        "budget_remaining_raw",
        "start_time",
        "end_time",
        "adset_schedule",
        "is_dynamic_creative",
        "attribution_spec",
        "promoted_object",
        "targeting",
        "learning_stage_info",
        "issues_info",
        "provider_created_at",
        "provider_updated_at"
      ],
      "authorization": "credential-scoped account; Page admission before child persistence",
      "live_verification": "NOT_RUN"
    },
    {
      "operation": "ad",
      "table": "marketing_ad",
      "method": "GET",
      "path": "/v25.0/{validated_external_id}",
      "fields": [
        "id",
        "account_id",
        "campaign_id",
        "adset_id",
        "name",
        "creative{id}",
        "status",
        "effective_status",
        "issues_info",
        "created_time",
        "updated_time"
      ],
      "columns": [
        "external_ad_id",
        "external_account_id",
        "external_campaign_id",
        "external_adset_id",
        "name",
        "external_creative_id",
        "configured_status",
        "effective_status",
        "issues_info",
        "provider_created_at",
        "provider_updated_at"
      ],
      "authorization": "credential-scoped account; Page admission before child persistence",
      "live_verification": "NOT_RUN"
    },
    {
      "operation": "creative",
      "table": "marketing_creative",
      "method": "GET",
      "path": "/v25.0/{validated_external_id}",
      "fields": [
        "id",
        "account_id",
        "name",
        "actor_id",
        "object_story_spec",
        "instagram_user_id",
        "object_story_id",
        "effective_object_story_id",
        "effective_instagram_media_id",
        "body",
        "title",
        "asset_feed_spec",
        "image_hash",
        "video_id",
        "thumbnail_url",
        "call_to_action_type",
        "url_tags",
        "degrees_of_freedom_spec"
      ],
      "columns": [
        "external_creative_id",
        "external_account_id",
        "name",
        "actor_id",
        "object_story_spec",
        "instagram_user_id",
        "object_story_id",
        "effective_object_story_id",
        "effective_instagram_media_id",
        "provider_body",
        "provider_title",
        "asset_feed",
        "image_hash",
        "video_id",
        "thumbnail_url",
        "call_to_action_type",
        "provider_url_tags",
        "creative_transformation_spec"
      ],
      "authorization": "credential-scoped account; Page admission before child persistence",
      "live_verification": "NOT_RUN"
    },
    {
      "operation": "audience",
      "table": "marketing_audience_reference",
      "method": "GET",
      "path": "/v25.0/{validated_external_id}",
      "fields": [
        "id",
        "account_id",
        "name",
        "subtype",
        "lookalike_spec"
      ],
      "columns": [
        "external_audience_id",
        "external_account_id",
        "name",
        "subtype",
        "lookalike_spec"
      ],
      "authorization": "credential-scoped account; Page admission before child persistence",
      "live_verification": "NOT_RUN"
    }
  ],
  "scan": {
    "operation": "ads_page",
    "method": "GET",
    "path": "/v25.0/act_{authorized_account_id}/ads",
    "fields": [
      "id",
      "account_id",
      "campaign_id",
      "adset_id",
      "name",
      "creative{id}",
      "status",
      "effective_status",
      "issues_info",
      "created_time",
      "updated_time"
    ],
    "limit": 50,
    "max_pages": 1000,
    "cursor_max_bytes": 2048,
    "follow_next_url": false
  },
  "schedule": {
    "interval_seconds": 21600,
    "min_interval_seconds": 900,
    "max_interval_seconds": 604800,
    "tick_seconds": 15,
    "lease_seconds": 60,
    "renew_seconds": 20,
    "max_consecutive_failures": 8,
    "max_global_accounts": 4,
    "max_account_writers": 1,
    "enabled_without_verified_binding": false
  },
  "limits": {
    "request_timeout_ms": 10000,
    "response_bytes": 1048576,
    "json_depth": 12,
    "json_array_elements": 1000,
    "selected_json_bytes": 1048576
  },
  "page_evidence": {
    "typed_fields": [
      "object_story_spec.page_id",
      "actor_id"
    ],
    "conflict": "defer",
    "absent": "defer",
    "foreign": "skip",
    "parse_post_id_prefix": false,
    "require_authority_revision": true,
    "credential_page_token_substitution": false
  },
  "separate_scope": [
    "insight_ad_daily_v1",
    "insight_ad_age_daily_v1",
    "insight_ad_region_daily_v1",
    "report_builder"
  ],
  "source_refs": [
    {
      "file": "ad-account.md.txt",
      "line": 137,
      "contains": "`id`"
    },
    {
      "file": "ad.md.txt",
      "line": 115,
      "contains": "/act_<AD_ACCOUNT_ID>/ads"
    },
    {
      "file": "creative.md.txt",
      "line": 250,
      "contains": "Page ID"
    },
    {
      "file": "creative.md.txt",
      "line": 295,
      "contains": "Page ID"
    }
  ]
};
