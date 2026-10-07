/* Generated. Do not edit. */

export interface SnoozeResponse {
  data: SnoozeState;
  meta: {
    as_of?: string;
    correlation_id?: string;
  };
}
export interface SnoozeState {
  conversation_id: string;
  until: string | null;
  snooze_revision: string;
  version: string;
  reason?: string;
}
