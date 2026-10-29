/* Generated private design contract. No endpoint deployment implied. */

export type DispatchProtocol =
  DispatchRequest | DispatchReply | DispatchFailure | ChatClaimProofRead | ChatClaimProofReply;
export type DispatchRequest =
  IdentityIssue | IdentityConsume | ChatClaim | ConnectorPrepare | ConnectorBegin | ConnectorResult | ReceiptRead;
export type ConnectorResult =
  | {
      schema_version: 1;
      operation: "connector-result";
      request_id: string;
      binding: DispatchBinding;
      outcome: "sent";
      provider_message_id: string;
    }
  | {
      schema_version: 1;
      operation: "connector-result";
      request_id: string;
      binding: DispatchBinding;
      outcome: "unknown";
      error_code: "DELIVERY_UNKNOWN";
    };
export type DispatchReply =
  | {
      schema_version: 1;
      request_id: string;
      receipt_id: string;
      state: "issued";
      grant_id: string;
      expires_at: string;
      resource_context: DispatchResourceContext;
    }
  | {
      schema_version: 1;
      request_id: string;
      receipt_id: string;
      state: "claimed";
      claim_id: string;
    }
  | {
      schema_version: 1;
      request_id: string;
      receipt_id: string;
      state: "consumed";
      grant_id: string;
      claim_id: string;
      resource_context: DispatchResourceContext;
    }
  | {
      schema_version: 1;
      request_id: string;
      receipt_id: string;
      state: "prepared" | "admitting" | "started" | "unknown" | "rejected" | "cancelled" | "expired" | "revoked";
    }
  | {
      schema_version: 1;
      request_id: string;
      receipt_id: string;
      state: "sent";
      provider_message_id: string;
    };

export interface IdentityIssue {
  schema_version: 1;
  operation: "identity-issue";
  request_id: string;
  binding: DispatchBinding;
  resource_context: DispatchResourceContext;
}
export interface DispatchBinding {
  tenant_id: string;
  conversation_id: string;
  crm_contact_id: string;
  connection_id: string;
  intent_id: string;
  attempt_id: string;
  principal_id: string;
  delegation_id: string;
  actor_kind: "human" | "ai";
  owner_revision: string;
  record_version: string;
  payload_digest: string;
}
export interface DispatchResourceContext {
  object_key: "conversation";
  owner_principal_id: string;
  owner_revision: string;
  record_version: string;
  team_id: string | null;
  /**
   * @maxItems 200
   */
  shared_team_ids: string[];
}
export interface IdentityConsume {
  schema_version: 1;
  operation: "identity-consume";
  request_id: string;
  binding: DispatchBinding;
  grant_id: string;
  claim_id: string;
  fence_id: string;
}
export interface ChatClaim {
  schema_version: 1;
  operation: "chat-claim";
  request_id: string;
  binding: DispatchBinding;
  grant_id: string;
}
export interface ConnectorPrepare {
  schema_version: 1;
  operation: "connector-prepare";
  request_id: string;
  binding: DispatchBinding;
  grant_id: string;
}
export interface ConnectorBegin {
  schema_version: 1;
  operation: "connector-begin";
  request_id: string;
  binding: DispatchBinding;
  grant_id: string;
  claim_id: string;
}
export interface ReceiptRead {
  schema_version: 1;
  operation: "receipt-read";
  request_id: string;
  binding: DispatchBinding;
  receipt_id: string;
}
export interface DispatchFailure {
  request_id: string;
  code:
    | "INVALID_REQUEST"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "STALE_OWNER"
    | "REVOKED"
    | "EXPIRED"
    | "INVALID_TRANSITION"
    | "DEPENDENCY_UNAVAILABLE";
}
export interface ChatClaimProofRead {
  schema_version: 1;
  operation: "chat-claim-proof";
  request_id: string;
  binding: DispatchBinding;
  claim_id: string;
}
export interface ChatClaimProofReply {
  schema_version: 1;
  request_id: string;
  receipt_id: string;
  state: "claimed";
  binding: DispatchBinding;
  grant_id: string;
  claim_id: string;
  resource_context: DispatchResourceContext;
}
