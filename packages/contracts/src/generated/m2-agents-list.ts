/* Generated. Do not edit. */

export interface M2AgentsList {
  /**
   * @maxItems 50
   */
  data: {
    id: string;
    status: string;
    attention: boolean;
    conversation_id: string;
    created_at: string;
    error_code: string | null;
  }[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
