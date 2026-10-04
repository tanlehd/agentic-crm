/* Generated. Do not edit. */

export interface RolesCreate {
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
