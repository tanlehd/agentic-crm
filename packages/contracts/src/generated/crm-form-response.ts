/* Generated. Do not edit. */

export interface CrmFormResponse {
  data: CrmForm;
  meta: {
    correlation_id: string;
  };
}
export interface CrmForm {
  /**
   * @maxItems 100
   */
  fields: string[];
  id: string;
  key: string;
  version: string;
}
