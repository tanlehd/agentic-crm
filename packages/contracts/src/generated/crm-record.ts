/* Generated. Do not edit. */

export interface CrmRecord {
  id: string;
  tenant_id: string;
  object_key: string;
  version: string;
  owner_revision: string;
  owner_principal_id: string | null;
  team_id: string | null;
  archived: boolean;
  fields: {
    [k: string]: unknown;
  };
  custom_values: {
    [k: string]: unknown;
  };
}
