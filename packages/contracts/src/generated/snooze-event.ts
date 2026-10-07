/* Generated. Do not edit. */

export interface SnoozeEvent {
  conversation_id: string;
  until: string | null;
  snooze_revision: string;
  cause: "scheduled" | "rescheduled" | "deadline" | "inbound" | "manual" | "assignment" | "closed";
}
