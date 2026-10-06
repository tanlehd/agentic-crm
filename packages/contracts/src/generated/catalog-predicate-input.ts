/* Generated. Do not edit. */

export interface CatalogPredicateInput {
  scope?: "all" | "mine" | "unassigned" | "team";
  team_id?: string;
  /**
   * @minItems 1
   * @maxItems 3
   */
  status?:
    | ["open" | "pending" | "closed"]
    | ["open" | "pending" | "closed", "open" | "pending" | "closed"]
    | ["open" | "pending" | "closed", "open" | "pending" | "closed", "open" | "pending" | "closed"];
  snooze?: "exclude" | "include" | "only";
  unread?: "any" | "only";
  channel?: "messenger" | "mock_messenger";
  channel_id?: string;
  /**
   * @maxItems 10
   */
  tag_ids?:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string];
}
