/* Generated. Do not edit. */

export interface RoutingTarget {
  id: string;
  kind: "human" | "ai";
  eligible: boolean;
  reason: null | "unavailable" | "team" | "capability" | "role" | "field" | "policy" | "capacity";
}
