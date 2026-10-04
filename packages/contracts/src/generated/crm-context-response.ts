/* Generated. Do not edit. */

export interface CrmContextResponse {
  data: {
    principal_id: string;
    capabilities: string[];
    grants: {
      resource: string;
      action: string;
      scope: "own" | "team" | "all";
    }[];
    objects: {
      id: string;
      key: string;
      label: string;
      kind: "standard" | "custom";
      version: string;
    }[];
  };
  meta: {
    correlation_id: string;
  };
}
