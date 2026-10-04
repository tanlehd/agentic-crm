/* Generated. Do not edit. */

export interface CrmPropertyResponse {
  data: CrmProperty;
  meta: {
    correlation_id: string;
  };
}
export interface CrmProperty {
  key: string;
  label: string;
  type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
  required: boolean;
  default_value: unknown;
  options: string[] | null;
  indexed: boolean;
  sensitive: boolean;
  id: string;
  version: string;
}
