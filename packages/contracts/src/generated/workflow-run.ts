/* Generated. Do not edit. */

export interface WorkflowRun {
  data: {
    id: string;
    definition_id: string;
    version_id: string;
    status: "queued" | "running" | "waiting" | "completed" | "failed" | "cancelled";
    current_node: string;
    error_code: string | null;
    attention: boolean;
    cancel_pending: boolean;
    steps: {
      node_key: string;
      status: string;
      attempt: number;
      error_code: string | null;
    }[];
    waits: {
      node_key: string;
      kind: "timer" | "event";
      status: string;
      resume_at: string;
    }[];
  };
  meta: {
    correlation_id: string;
  };
}
