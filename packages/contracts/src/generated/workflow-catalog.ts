/* Generated. Do not edit. */

export interface WorkflowCatalog {
  schema_version: 1;
  tenant_id: string;
  principal_id: string;
  authorization_revision: string;
  revision: string;
  /**
   * @minItems 0
   * @maxItems 100
   */
  objects: {
    id: string;
    key: string;
    label: string;
    kind: "standard" | "custom";
    version: string;
    schema_version: string;
    owner_service: "crm" | "sales" | "chat" | "ticket";
    /**
     * @minItems 0
     * @maxItems 200
     */
    properties: {
      id: string;
      key: string;
      label: string;
      type:
        "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum" | "reference" | "opaque";
      required: boolean;
      nullable: boolean;
      options: string[] | null;
      indexed: boolean;
      readable: true;
      writable: boolean;
      /**
       * @minItems 0
       * @maxItems 4
       */
      filter_operators:
        | []
        | ["eq" | "in" | "gte" | "lte"]
        | ["eq" | "in" | "gte" | "lte", "eq" | "in" | "gte" | "lte"]
        | ["eq" | "in" | "gte" | "lte", "eq" | "in" | "gte" | "lte", "eq" | "in" | "gte" | "lte"]
        | [
            "eq" | "in" | "gte" | "lte",
            "eq" | "in" | "gte" | "lte",
            "eq" | "in" | "gte" | "lte",
            "eq" | "in" | "gte" | "lte"
          ];
      version: string;
    }[];
    capabilities: {
      record_read: boolean;
      record_query: boolean;
      record_update: boolean;
      workflow_actions: false;
      object_change_events: false;
      change_images: false;
      relation_traversal: false;
    };
  }[];
  /**
   * @minItems 0
   * @maxItems 500
   */
  relations: {
    id: string;
    key: string;
    label: string;
    version: string;
    source_object_type_id: string;
    target_object_type_id: string;
    cardinality: "one_to_one" | "one_to_many" | "many_to_many";
  }[];
}
