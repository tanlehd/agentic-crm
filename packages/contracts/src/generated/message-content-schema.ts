/* Generated. Do not edit. */
export const messageContentSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://agentic-crm.invalid/schemas/message-content.json",
  "title": "MessageContent",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "version": {
          "type": "integer",
          "const": 1
        },
        "message_type": {
          "const": "text"
        },
        "text": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000,
          "pattern": "\\S"
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
                }
              },
              "required": [
                "external_msg_id"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "attachment": {
          "type": "null"
        }
      },
      "required": [
        "version",
        "message_type",
        "text",
        "reply_to",
        "attachment"
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
        "message_type": {
          "const": "media"
        },
        "text": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 4000,
              "pattern": "\\S"
            },
            {
              "type": "null"
            }
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
                }
              },
              "required": [
                "external_msg_id"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "attachment": {
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
        "text_source": {
          "enum": [
            "extracted",
            "preview"
          ]
        }
      },
      "required": [
        "version",
        "message_type",
        "text",
        "reply_to",
        "attachment"
      ],
      "not": {
        "properties": {
          "text_source": {
            "const": "extracted"
          },
          "text": {
            "type": "null"
          }
        },
        "required": [
          "text_source",
          "text"
        ]
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "version": {
          "type": "integer",
          "const": 1
        },
        "message_type": {
          "const": "template"
        },
        "text": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 4000,
              "pattern": "\\S"
            },
            {
              "type": "null"
            }
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
                }
              },
              "required": [
                "external_msg_id"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "attachment": {
          "oneOf": [
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
            }
          ]
        },
        "text_source": {
          "enum": [
            "extracted",
            "preview"
          ]
        }
      },
      "required": [
        "version",
        "message_type",
        "text",
        "reply_to",
        "attachment"
      ],
      "not": {
        "properties": {
          "text_source": {
            "const": "extracted"
          },
          "text": {
            "type": "null"
          }
        },
        "required": [
          "text_source",
          "text"
        ]
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "version": {
          "type": "integer",
          "const": 1
        },
        "message_type": {
          "const": "unsupported"
        },
        "text": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 4000,
              "pattern": "\\S"
            },
            {
              "type": "null"
            }
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
                }
              },
              "required": [
                "external_msg_id"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "attachment": {
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
        },
        "text_source": {
          "enum": [
            "extracted",
            "preview"
          ]
        }
      },
      "required": [
        "version",
        "message_type",
        "text",
        "reply_to",
        "attachment"
      ],
      "not": {
        "properties": {
          "text_source": {
            "const": "extracted"
          },
          "text": {
            "type": "null"
          }
        },
        "required": [
          "text_source",
          "text"
        ]
      }
    }
  ]
};
