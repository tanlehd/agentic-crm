# External Conversation read API

PLAN-053 / SRC-089, 2026-10-18. Status: Ready for implementation. Additive extension of [private apps](external-api.md); [canonical identity](conversation-identity.md). Chat owns the read application port; Identity owns grants. Existing monolith transaction/registry ports only; extraction requires versioned owner API, never cross-service SQL. No schema, migration, event or ownership changes.

## Grants and DTO

Catalog keys `conversation` / `conversation.messages` use exact scopes `conversations.read` / `conversations.messages.read`. The dotted message catalog key cannot collide with CRM custom object keys. Message grant requires a Conversation grant. Both retain explicit selected properties and independent all/teams restrictions. Every message request checks the intersection of both grants against the current parent Conversation primary/shared teams and active Identity teams. No contact expansion or inheritance from creator Human. Existing apps gain nothing automatically.

Conversation selectable properties: `status`, `opened_at`, `closed_at`, `contact_id`, `team_id`, `owner_principal_id`. References are opaque IDs, never embedded Contact/Identity data. Required envelope item `{id,version,properties}`. Conversation is the persistent channel thread; episode/session metadata remains outside this extension.

Message selectable properties: `direction`, `status`, `occurred_at`, `received_at`, `text` (sensitive). Required envelope item `{id,conversation_id,properties}`. Text is the stored plain text/preview projection, not a rich attachment download. No provider IDs, outbound intents, connection credentials, rich media URLs, internal notes, attribution, session classifications or embedded latest message. Selecting only metadata never grants text. A message detail must belong to the given parent.

## Routes

Base `/api/v1/external`:

| GET | Required scopes |
|---|---|
| `/conversations` | conversations.read |
| `/conversations/{id}` | conversations.read |
| `/conversations/{id}/messages` | conversations.read + conversations.messages.read |
| `/conversations/{id}/messages/{messageId}` | conversations.read + conversations.messages.read |

Lists accept only limit1–100(default50) and opaque signed cursor. Details accept no query. Conversation order `(opened_at,id)` ascending; messages `(received_at,id)` ascending, microsecond precision retained in cursor. Cursor binds tenant/app/policy version/kind/parent, invalid after grant change/rotation or replay at another parent/app. Pagination is a live traversal, not a snapshot/export. Responses `{data,next_cursor?,meta}`; shared auth/error/quota contract applies. Inaccessible/archived/missing parent or message returns404; missing scopes403. Active object metadata required. Recheck token/config inside data transaction. No CRM generic route bypass; no writes.

## Acceptance

- EC-01 explicit catalog/property scopes; dependent grant validation; existing CRM compatibility.
- EC-02 metadata list/detail and message list/detail, selected fields only; text absent without selected text; no implicit embedded data.
- EC-03 current team/shared-team intersection, inactive teams, foreign tenant, archived parent, wrong message parent; safe404.
- EC-04 pagination ties, tampering, cross-parent/app/policy cursor replay; strict query; token lifecycle and shared quota.
- EC-05 developer portal scope choices/docs, OpenAPI schemas and real HTTP calls; backend/frontend checks and retained synthetic evidence.

Compatibility: additive routes/catalog; no automatic grant expansion or schema migration. Old CRM-only apps keep original behavior. Writes/OAuth/webhooks remain PLAN-052. Rollback disable new routes and retain configs; older binaries reject these grants rather than expand rights.
