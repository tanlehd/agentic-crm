/* Generated. Do not edit. */

export interface M2DeliveriesList {
  /**
   * @maxItems 50
   */
  data: {
    id: string;
    connection_id: string;
    status: "failed";
    attempts: number;
    error_code: string | null;
    next_attempt_at: string | null;
    received_at: string;
    can_retry: boolean;
  }[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
