/* Generated. Do not edit. */

export interface RoutingTargets {
  data: RoutingTarget[];
  meta: {
    correlation_id: string;
  };
}
export interface RoutingTarget {
  id: string;
  kind: "human" | "ai";
  eligible: boolean;
  reason: null | "unavailable" | "team" | "capability" | "role" | "field" | "policy" | "capacity";
}
