/* Generated. Do not edit. */

export interface WorkflowVersions {
  data: {
    id: string;
    number: number;
    state: "draft" | "published";
    /**
     * Read-only immutable version history, including retired node types. Authoring and execution still require workflow-graph.
     */
    graph: {
      trigger: {
        event_type: "conversation.created" | "need.assessed";
        connection_id: string;
      };
      entry_node: string;
      /**
       * @minItems 1
       * @maxItems 50
       */
      nodes: [
        {
          key: string;
          type: string;
          config: {
            [k: string]: unknown;
          };
          next?: string;
          on_timeout?: string;
        },
        ...{
          key: string;
          type: string;
          config: {
            [k: string]: unknown;
          };
          next?: string;
          on_timeout?: string;
        }[]
      ];
    };
    execution_role_id: string;
  }[];
  meta: {
    correlation_id: string;
  };
}
