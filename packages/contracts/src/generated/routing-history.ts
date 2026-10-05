/* Generated. Do not edit. */

export interface RoutingHistory {
  /**
   * @maxItems 100
   */
  data: RoutingHistoryEntry[];
  meta: {
    correlation_id: string;
  };
}
export interface RoutingHistoryEntry {
  from_owner_id: string | null;
  to_owner_id: string | null;
  from_team_id: string | null;
  to_team_id: string | null;
  owner_revision: string;
  reason: string;
  actor_kind: "human" | "ai" | "service" | "system";
  actor_id: string;
}
