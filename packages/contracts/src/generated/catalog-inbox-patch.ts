/* Generated. Do not edit. */

export interface CatalogInboxPatch {
  name?: string;
  predicate_schema_version?: 1;
  predicate?: CatalogPredicateInput;
  sort?: "latest_message_desc" | "latest_message_asc" | "waiting_longest";
  creator_principal_id?: string;
}
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
