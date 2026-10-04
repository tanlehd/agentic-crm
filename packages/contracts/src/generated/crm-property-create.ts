/* Generated. Do not edit. */

export interface CrmPropertyCreate {
  key: string;
  label: string;
  type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
  required: boolean;
  default_value?: unknown;
  options?: string[] | null;
  indexed: boolean;
  sensitive: boolean;
}
