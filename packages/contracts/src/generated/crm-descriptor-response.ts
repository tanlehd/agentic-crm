/* Generated. Do not edit. */

export interface CrmDescriptorResponse {
  data: {
    object_key: string;
    standard: {
      key: string;
      label: string;
      type: string;
      required?: boolean;
      indexed: boolean;
      immutable?: boolean;
      writable: boolean;
      options?: string[];
    }[];
    custom: {
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
      writable: boolean;
    }[];
    order: string[];
  };
  meta: {
    correlation_id: string;
  };
}
