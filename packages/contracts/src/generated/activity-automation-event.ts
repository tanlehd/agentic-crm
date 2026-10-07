/* Generated. Do not edit. */

export interface ActivityAutomationEvent {
  conversation_id: string;
  source_service: "workflow" | "chatflow";
  run_id: string;
  definition_version_id: string;
  state: "started" | "paused" | "resumed" | "completed" | "failed" | "cancelled";
  source_revision: string;
}
