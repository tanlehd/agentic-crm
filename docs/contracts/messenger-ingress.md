# Messenger signed durable capture v1

PLAN-004C / CHG-20261006-09. Scoped contract implemented in SRC-029; status/evidence in tracker, local synthetic verification only. Sources: [webhooks](../references/meta/2026-10-06/messenger-webhooks.md.txt), [messages](../references/meta/2026-10-06/messenger-messages.md.txt), [echoes](../references/meta/2026-10-06/messenger-message-echoes.md.txt), [standby](../references/meta/2026-10-06-plan003/messenger-webhooks--webhook-events--standby.md.txt). Graph v26.0 subscription is an operator prerequisite, not proven by accepting JSON. This slice captures provider events in Connector and never calls the mock bridge or creates a Chat turn.

## HTTP and security

Optional endpoints GET/POST `/connector/v1/messenger/:appId/webhook`. Apps explicitly configured with app ID and environment references to App Secret and verification token. Disabled by default when no config. No secret values in DB/config JSON/logs. Read env on each request for rotation; unknown app or missing/short secret fails closed. Tokens >=32 characters; App Secret >=32 characters. Page ID and App ID decimal strings (1–32 digits), opaque strings never parsed as numbers.

GET requires exactly `hub.mode=subscribe`, constant-time matching `hub.verify_token`, decimal `hub.challenge` up to128 digits. Response text/plain with exact challenge, no-store/nosniff. Unknown app/token403; malformed query400. No side effects.

POST application/json only, uncompressed raw bytes <=64KiB. Reject queries, Cookie/Origin/X-Tenant-Id and malformed/absent X-Hub-Signature-256 (sha256=64hex). HMAC-SHA256 over exact raw bytes with App Secret, constant-time compare before normalization/DB. Invalid signature403. JSON/parser/size/content-encoding errors400. No body logging, raw parser errors sanitized. Valid `object:page`, 1–100 entries, max100 events across messaging/standby; nonempty event streams, no entry changes mixed silently. Unknown top-level/entry keys rejected to avoid dropping events. Provider event extensions retained only through digest and quarantined classification; this minimized capture cannot reconstruct discarded extension fields. Raw payload replay/reprocessing for unsupported/control events requires a later retention contract, not inferred from a digest.

Every entry Page must have active immutable `(app_id,page_id)→tenant_id,binding_id` mapping, explicitly provisioned by CLI; tenant never comes from payload. Entire batch one local SQL transaction, bindings share-locked in sorted order; event unique-key inserts sorted by Page/key to avoid reversed batch deadlocks. Unknown/disabled Page403; no partial ACK/persistence. Storage failure503 retryable. Return200 EVENT_RECEIVED only after commit. Client disconnect/response loss replay returns200 with existing IDs; no provider send is made. Event/body sizes are bounded; database lock-wait limits, load/rate testing and the production5s response SLO remain deployment gates.

## Normalization and stable identity

Store version1 `platform:messenger`, stream messaging/standby, kind inbound/echo/delivery/read/control/postback/unsupported, Page and sender/recipient refs, occurred_at, external_msg_id if available, original text, reply_to, bounded attachment descriptors (type, URL or opaque provider ID), referral (source/type/ref/ad_id), and original event digest. Preserve Unicode/text exactly; never infer consent from attachments, buttons or postbacks. HTTPS media URLs are private untrusted descriptors, never fetched or returned to a browser in this task. No OCR/media resolution, original text unchanged.

Message mid is mandatory for message events; stable key hash of stream+kind+mid. Echo identified only by boolean is_echo=true; malformed truthy echo is rejected rather than processed as inbound. Inbound recipient must equal entry Page; echo sender must equal Page. Standby remains quarantined, never a second active turn. Messages with unsupported or extra semantics are retained as unsupported/attention, not silently dispatched. Non-message notifications lacking stable provider IDs use canonical event digest key, scoped Page+stream+kind. This deduplicates exact semantic replays only, never text/time heuristics. Distinct receipts/control observations are allowed; they do not change CRM owner.

Same key+same digest returns existing event. Same key+different event digest409 with no batch changes; operator attention required, never overwrite old evidence. Parsed canonical digest ignores object key order; wrapper entry time/order not part of event identity. Status captured for supported inbound; attention for echo/standby/control/unknown pending downstream contract. Captured is not Chat completion. No dispatcher reads these rows yet.

## Private Connector migration2

Additive to immutable schema1; all monolith1–18 unchanged. Journal supports sequential versions, verifies every historical checksum/name/state before applying new DDL; applying/unknown version fails closed. Upgrade1→2 preserves existing bridge rows. Runtime requires both applied migrations. Never auto-migrate on API startup.

- `connector_meta_page`: id/tenant UUID, app_id/page_id VARCHAR32 ASCII, active/disabled, unique(app_id,page_id), unique(tenant_id,id). Immutable binding CLI repeat-safe, no rebind across tenants.
- `connector_meta_event`: UUID, tenant_id+binding_id local composite FK, event_key/digest CHAR64, normalized JSON object, kind/stream, status captured/attention, created_at; unique(tenant_id,binding_id,event_key). Index status/time. Private content has no public read API. Initial local retention manual only; production cleanup/retention approval gate remains.
- `connector_meta_audit`: UUID, tenant_id+binding_id+event_id local FK, action received, created_at; no transcript/secret/URL.

Runtime: SELECT only Page bindings; SELECT/INSERT/UPDATE event (duplicate insert uses an ID no-op update under unique lock), SELECT/INSERT audit. No provider-config mutation/DDL/cross-DB reads. Privileged CLI provision separate. Per-app secret rotation changes request verification immediately; disabling Page fails before write. No in-flight external effects in this slice.

## Acceptance SRC-029

Real local HTTP + MySQL: valid challenge, unknown app, missing/incorrect signature, exact Unicode/raw whitespace, compressed/oversize/malformed body, wrong Page/tenant, multi-entry batch rollback, concurrent dedup, conflict rollback, reordered batches, echo/standby/control isolation, revoked Page/rotated secret, post-commit response-loss replay and API restart. Private grants and schema1→2/no-op/corrupt journal tested; prior bridge still works. No network to Meta, no real credentials, no source/raw transcript in logs. Canonical build/typecheck/unit/contracts/docs and integration. Sandbox, Chat dispatch/control, provider lifecycle/UI, media and M3 release remain separate gates.
