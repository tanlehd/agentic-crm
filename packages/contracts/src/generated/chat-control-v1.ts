/* Generated private design contract. No endpoint deployment implied. */

export type ChatControlProtocol =
  | ChatControlRequest
  | ChatRegistryReply
  | ChatControlEventReply
  | ChatReferenceReply
  | ChatControlFailure
  | ChatControlEvent
  | ChatControlNotice;
export type ChatControlRequest =
  | ChatRegistryRead
  | ChatControlEventRead
  | ChatContactCheck
  | ChatConnectionCheck
  | ChatPrincipalCheck
  | ChatMetadataCheck;

export interface ChatRegistryRead {
  schema_version: 1;
  request_id: string;
  operation: "registry-read";
  tenant_id: string;
  conversation_id: string;
  minimum_revision: string;
}
export interface ChatControlEventRead {
  schema_version: 1;
  request_id: string;
  operation: "event-read";
  notice: ChatControlNotice;
}
export interface ChatControlNotice {
  schema_version: 1;
  event_id: string;
  tenant_id: string;
  conversation_id: string;
  registry_revision: string;
}
export interface ChatContactCheck {
  schema_version: 1;
  request_id: string;
  operation: "contact-check";
  tenant_id: string;
  connection_id: string;
  crm_contact_id: string;
  crm_identity_id: string;
  external_subject_id: string;
  mapping_revision: "1";
}
export interface ChatConnectionCheck {
  schema_version: 1;
  request_id: string;
  operation: "connection-check";
  tenant_id: string;
  connection_id: string;
  platform: "mock_messenger";
}
export interface ChatPrincipalCheck {
  schema_version: 1;
  request_id: string;
  operation: "principal-check";
  tenant_id: string;
  principal_id: string;
  kind: "human" | "ai";
  team_id: string | null;
}
export interface ChatMetadataCheck {
  schema_version: 1;
  request_id: string;
  operation: "metadata-check";
  tenant_id: string;
  object_key: "conversation";
  schema_revision: string;
}
export interface ChatRegistryReply {
  schema_version: 1;
  request_id: string;
  snapshot: ChatRegistrySnapshot;
}
export interface ChatRegistrySnapshot {
  tenant_id: string;
  conversation_id: string;
  registry_revision: string;
  record_version: string;
  owner_revision: string;
  control_revision: string;
  pause_through_revision: string;
  cancel_through_revision: string;
  crm_contact_id: string;
  crm_identity_id: string;
  connection_id: string;
  owner_principal_id: string | null;
  owner_kind: "human" | "ai" | null;
  team_id: string | null;
  /**
   * @maxItems 200
   */
  shared_team_ids: string[];
  active_session_id: string | null;
  status: "open" | "pending" | "closed";
  archived: boolean;
}
export interface ChatControlEventReply {
  schema_version: 1;
  request_id: string;
  event: ChatControlEvent;
}
export interface ChatControlEvent {
  schema_version: 1;
  event_type: "chat.registry.changed.v1";
  producer: "chat";
  event_id: string;
  tenant_id: string;
  conversation_id: string;
  registry_revision: string;
  occurred_at: string;
  correlation_id: string;
  snapshot: ChatRegistrySnapshot;
}
export interface ChatReferenceReply {
  schema_version: 1;
  request_id: string;
  status: "current";
  observed_revision: string;
}
export interface ChatControlFailure {
  schema_version: 1;
  request_id: string;
  code:
    | "INVALID_REQUEST"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "REVOKED"
    | "DEPENDENCY_UNAVAILABLE";
}
