# External Conversation reads on Chat

CHG-20261025-01, SRC-109/T06, Codex 2026-10-25, Ready. Existing four GET paths from the external API retain their DTO, app scopes, quotas, selected properties and cursor ordering. This is Chat read compatibility, not new app administration or Reporting functionality.

## Owner boundary

External API is a Gateway/BFF facade and uses the existing authenticated bff workload identity; no additional external-api service/runtime is introduced. The prior unmounted private caller label is refined to bff; public app scopes and credentials are unchanged.

External API validates the credential format and tenant header, charges the existing Identity quota once per public request and allocates a fresh read command. Chat external-prepare validates the original typed request and persists a minimized command binding/query, without credentials or response data. Identity then verifies the original credential and exact Chat proof, current app status/version/expiry and parent/message scopes under its existing tenant gate. It stores app_id and allowed fields in the existing identity_owner_admission table. No schema change or app delegation table is needed.

Chat reads current external-policy from Identity over authenticated workload HTTP. The policy is bound to the exact prepared command/admission; both Conversation and message grants independently restrict the parent. Identity returns active approved teams and selected properties, never the token. Chat queries only its own schema and commits the read receipt, then settles admission. Result bodies stay in request memory only. A terminal command does not replay data; each public GET starts a new authorized read. Query/cursor digest is stored without credentials or transcript.

App rotation/revoke/configuration and Identity team/policy changes use the existing tenant barrier, abort/drain pending Chat admissions before completion. Lost ACK and process failure retain proof/admission for recovery. Public requests without the corresponding admission cannot read data. An app actor cannot use Human endpoints. Owner policy/read failure remains explicit; no baseline SQL fallback.

## Compatibility and acceptance

Conversation list/detail and parent-scoped message list/detail preserve app/team intersection, metadata-only redaction, archived/wrong-parent/foreign tenant 404, microsecond tuple order and original HMAC cursor binding to tenant/app-version/kind/parent. The existing retained cursor key must be supplied at composition. Quota 120/minute and token errors remain Identity/External API behavior. Public paths and schemas are unchanged; private external-prepare and Identity external-policy are additive.

Verify actual Chat and Identity HTTP/own databases: all four reads, both grant intersections, field filtering, missing scope/invalid or expired token, cursor continuation/tamper/parent/app-version mismatch, current revoke/rotation drain, concurrent abort/read, wrong workload/tenant and outage. Evidence must distinguish native owner tests from public forwarding and runtime packaging. Main traffic remains unchanged until T09. T06 boundary review is complete per [acceptance](../quality/t06-chat-boundary-acceptance.md); runtime packaging and main activation remain T07–T09.
