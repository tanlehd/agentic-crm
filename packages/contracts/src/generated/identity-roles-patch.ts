/* Generated. Do not edit. */

export interface RolesPatch {
  name?: string;
  /**
   * @maxItems 200
   */
  permissions?: {
    resource: string;
    action: string;
    scope: "own" | "team" | "all";
  }[];
}
