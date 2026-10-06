/* Generated. Do not edit. */

export interface FacebookPageList {
  data: {
    id: string;
    channel: "messenger";
    channel_id: string;
    page_id: string;
    app_id: string;
    name: string;
    team_id: string;
    credential_status: "stored" | "missing";
    version: string;
    connected_at: string;
  }[];
  next_cursor: string | null;
  oauth_configured: boolean;
  meta: {
    correlation_id: string;
  };
}
