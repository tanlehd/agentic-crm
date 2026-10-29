/* Generated. Do not edit. */

export interface WorkflowAuthoringOptions {
  data: {
    /**
     * @maxItems 200
     */
    actors: {
      id: string;
      key: string;
      role_id: string;
      role_name: string;
    }[];
    /**
     * @maxItems 200
     */
    teams: {
      id: string;
      name: string;
      purpose: string;
    }[];
    /**
     * @maxItems 200
     */
    connections: {
      id: string;
      name: string;
      provider: "mock_messenger";
    }[];
  };
  meta: {
    correlation_id: string;
  };
}
