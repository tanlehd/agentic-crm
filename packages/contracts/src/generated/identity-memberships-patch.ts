/* Generated. Do not edit. */

export interface MembershipsPatch {
  seat_code?: "viewer" | "chat" | "sales" | "service" | "admin";
  /**
   * @maxItems 100
   */
  role_ids?: string[];
  /**
   * @maxItems 100
   */
  team_ids?: string[];
  status?: "active" | "suspended";
}
