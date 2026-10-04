/* Generated. Do not edit. */

export interface RolesList {
  data: RolesEntity[];
  meta: {
    correlation_id: string;
  };
  next_cursor: string | null;
}
export interface RolesEntity {
  id: string;
  tenant_id: string;
  version: string;
  key: string;
  name: string;
  /**
   * @maxItems 200
   */
  permissions: {
    resource: string;
    action: string;
    scope: "own" | "team" | "all";
  }[];
}
