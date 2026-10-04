/* Generated. Do not edit. */

export interface PrincipalsResponse {
  data: PrincipalsEntity;
  meta: {
    correlation_id: string;
  };
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
