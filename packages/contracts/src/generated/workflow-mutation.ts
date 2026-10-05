/* Generated. Do not edit. */

export interface WorkflowMutation {
  data: {
    id: string;
    version?: string;
    number?: number;
    state?: "draft";
    definition_version?: string;
    status?: "cancelled" | "completed" | "failed";
  };
  meta: {
    correlation_id: string;
  };
}
