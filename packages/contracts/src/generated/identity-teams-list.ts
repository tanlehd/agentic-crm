/* Generated. Do not edit. */

export interface TeamsList {
  data: TeamsEntity[];
  meta: {
    correlation_id: string;
  };
  next_cursor: string | null;
}
export interface TeamsEntity {
  id: string;
  tenant_id: string;
  version: string;
  name: string;
  purpose: "chat" | "sales" | "service" | "general";
  active: boolean;
}
