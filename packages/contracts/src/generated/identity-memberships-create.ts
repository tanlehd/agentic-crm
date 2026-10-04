/* Generated. Do not edit. */

export interface MembershipsCreate {
  account_id: string;
  seat_code: "viewer" | "chat" | "sales" | "service" | "admin";
  /**
   * @maxItems 100
   */
  role_ids: string[];
  /**
   * @maxItems 100
   */
  team_ids: string[];
}
