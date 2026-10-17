/* Generated. Do not edit. */

export interface CatalogInboxOptions {
  data: {
    /**
     * @maxItems 6
     */
    filter_fields:
      | []
      | ["status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ];
    can_share: boolean;
    /**
     * @maxItems 200
     */
    teams: {
      id: string;
      name: string;
    }[];
    /**
     * @maxItems 500
     */
    principals: {
      id: string;
      name: string;
    }[];
  };
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
