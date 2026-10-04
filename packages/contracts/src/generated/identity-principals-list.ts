/* Generated. Do not edit. */

export interface PrincipalsList {
  data: PrincipalsEntity[];
  meta: {
    correlation_id: string;
  };
  next_cursor: string | null;
}
export interface PrincipalsEntity {
  id: string;
  tenant_id: string;
  version: string;
  kind: "human" | "ai";
  status: "active" | "suspended";
  availability: "available" | "unavailable";
  auth_revision: string;
}
