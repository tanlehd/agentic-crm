/* Generated. Do not edit. */

export interface MembershipsList {
  data: MembershipsEntity[];
  meta: {
    correlation_id: string;
  };
  next_cursor: string | null;
}
export interface MembershipsEntity {
  id: string;
  tenant_id: string;
  version: string;
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
  principal_id: string;
  principal_version: string;
  auth_revision: string;
  status: "invited" | "active" | "suspended";
}
