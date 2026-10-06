/* Generated. Do not edit. */

export interface WorkspaceSidebar {
  data: {
    scopes: {
      key: string;
      team_id?: string;
      as_of: string;
      conversation_count: string;
      unread_conversation_count: string;
      waiting_conversation_count: string | null;
      waiting_metric_coverage: "partial" | "complete";
      metrics_state: "ready";
    }[];
    inboxes: {
      id: string;
      name: string;
      creator_principal_id: string;
      shared: boolean;
      version: string;
      conversation_count: string;
      unread_conversation_count: string;
    }[];
    metrics_state: "ready";
  };
  meta: {
    correlation_id: string;
    as_of?: string;
  };
}
