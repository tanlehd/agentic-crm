/* Generated. Do not edit. */

export interface CatalogTagResponse {
  data: CatalogTag;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface CatalogTag {
  id: string;
  name: string;
  color: "gray" | "blue" | "green" | "amber" | "red" | "purple";
  version: string;
  archived: boolean;
  allowed_actions: string[];
}
