/* Generated. Do not edit. */

export interface RoutingResponse {
  data: RoutingEntity;
  meta: {
    correlation_id: string;
  };
}
export interface RoutingEntity {
  id: string;
  tenant_id: string;
  object_key: string;
  version: string;
  owner_revision: string;
  owner_principal_id: string | null;
  team_id: string | null;
}
