/* Generated. Do not edit. */

export interface CatalogInboxList {
  data: CatalogInbox[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface CatalogInbox {
  id: string;
  name: string;
  creator_principal_id: string;
  predicate_schema_version: 1;
  predicate: CatalogPredicate;
  sort: "latest_message_desc" | "latest_message_asc" | "waiting_longest";
  version: string;
  archived: boolean;
  shared: boolean;
  /**
   * @maxItems 50
   */
  shares?: {
    kind: "principal" | "team";
    id: string;
  }[];
  allowed_actions: string[];
}
export interface CatalogPredicate {
  scope: "all" | "mine" | "unassigned" | "team";
  team_id?: string;
  /**
   * @minItems 1
   * @maxItems 3
   */
  status:
    | ["open" | "pending" | "closed"]
    | ["open" | "pending" | "closed", "open" | "pending" | "closed"]
    | ["open" | "pending" | "closed", "open" | "pending" | "closed", "open" | "pending" | "closed"];
  snooze: "exclude" | "include" | "only";
  unread: "any" | "only";
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
