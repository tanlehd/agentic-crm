/* Generated. Do not edit. */

export interface M2RunsList {
  /**
   * @maxItems 50
   */
  data: {
    id: string;
    status: string;
    current_node: string;
    attention: boolean;
    started_at: string;
    conversation_id: string;
  }[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
