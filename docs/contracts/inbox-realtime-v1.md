# Inbox realtime v1

CHG-20261027-06, C2 Ready, Codex 2026-10-27, follow-up within FIX-20261027-01. User requests five-minute env-configured polling and socket updates. No business/schema migration; existing authenticated read/mutation APIs and durable events remain authoritative.

## Transport and ownership

One same-origin WebSocket per visible Inbox tab: /api/v1/inbox-realtime?tenant_id=<UUID>, subprotocol crm.inbox.v1. BFF validates exact browser Origin before upgrade. It authenticates the native HttpOnly session, active tenant/membership and Conversation read capability/grant before any application frame; invalid sessions close4401 and denied grants close4403 without data. No token in URL, client principal, message body, record ID, transcript or count is sent on this socket. Client data frames are rejected; compression disabled, payload bound1024bytes, 256connection and3per-session limits, ping/pong and slow-consumer bounds. Authentication/ACL rechecked before each change notification and every30s; revoke/expiry closes and clears client tenant cache. Checks never touch session last-seen, so background connections cannot extend idle sessions.

Chat API and worker publish a versioned ephemeral tenant invalidation hint to Redis only after an owning transaction with an outbox change commits. Rollback/read-only work publishes nothing. Redis transport is a wake-up channel, not a business event consumer: it never ACKs/deletes durable events or grants authorization. Publisher failure never changes committed business results; reconnect and fallback reconcile through existing reads. Internal channel crm.inbox.changed.v1; exact payload {version:1,tenant_id}. Private deployment isolates Redis; no browser Redis access, SQL/FK/UoW shared across services or new durable table.

Browser frames are {version:1,type:"ready"|"invalidate"}. Ready/reconnect triggers reconciliation through tenant-scoped APIs; invalidate is coalesced and refetches active Inbox queries only. Generic tenant activity hints contain no record metadata and are not proof of access to any conversation. Every data read still applies current source/record/field authorization. Worker delivery/status and inbound messages use the same committed Chat outbox path. Explicit note/outbound changes without an outbox hint must mark the owning transaction. Missed/coalesced hints are allowed; no claim of exactly-once socket delivery or delta history replay.

## Client cadence and recovery

NEXT_PUBLIC_INBOX_POLL_INTERVAL_MS defaults300000 (5minutes), validates integer1000..3600000; invalid/missing values use300000. It configures Inbox, views, ownership, sessions and Customer360 polling. Other module polling is unchanged. NEXT_PUBLIC_INBOX_REALTIME_ENABLED enables the socket; backend CHAT_REALTIME_ENABLED enables pub/sub and upgrade. Both are optional for compatible rollout. NEXT_PUBLIC values are Next build-time configuration in production; restart/rebuild web after changing them.

Initial selection/history remain paginated API reads. Socket invalidation refetches active query keys without losing selection/draft/scroll anchor or duplicating message IDs. Hidden/inactive Inbox closes the socket and pauses fallback; visible/reconnect reconciles once. The shared workspace context/catalog also uses five-minute cadence while the selected screen is Inbox. Bounded exponential reconnect with jitter, no overlapping socket or retry loop on401/403. Native API commands and idempotency remain unchanged. Socket connection failure does not trigger continuous API polling; fallback stays at configured cadence.

## Acceptance

Verify env default/override/invalid input; no5s/30s Inbox polls including child panes; initial history and retained drafts; actual committed inbound/message-status invalidation from Chat to another browser; rollback/read-only silence; tenant and origin isolation; expired/revoked session; reconnect/Redis outage fallback and no request storm; browser hidden/unmount cleanup; builds and affected native/security tests. Record local runtime image/config/evidence separately; design Ready does not claim runtime PASS. Host-clock investigation remains deferred per user request.
