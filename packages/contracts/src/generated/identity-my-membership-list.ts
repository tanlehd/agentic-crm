/* Generated. Do not edit. */

export interface MyMembershipList {
  data: MyMembershipEntity[];
  meta: {
    correlation_id: string;
  };
  next_cursor: string | null;
}
export interface MyMembershipEntity {
  id: string;
  tenant_id: string;
  version: string;
  seat_code: "viewer" | "chat" | "sales" | "service" | "admin";
  principal_id: string;
  tenant_name: string;
}
