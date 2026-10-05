/* Generated. Do not edit. */

export interface SalesHandoffData {
  id: string;
  version: string;
  owner_revision: string;
  owner_principal_id: string | null;
  team_id: string;
  handoff_id: string;
  status: "pending" | "accepted" | "cancelled";
  due_at: string;
  accepted_at: string | null;
  attention: boolean;
}
