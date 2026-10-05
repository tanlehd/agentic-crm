/* Generated. Do not edit. */

export interface ChatflowMutation {
  data: {
    id: string;
    version?: string;
    number?: number;
    state?: "draft";
    status?: "running" | "waiting_message" | "paused_human" | "completed" | "failed" | "cancelled";
    outcome?: "qualified" | "disqualified" | "needs_attention" | null;
    lead_id?: string | null;
  };
  meta: {
    correlation_id: string;
  };
}
