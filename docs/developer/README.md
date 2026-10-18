# Agentic CRM Developer API

Private apps give an integration explicit access to CRM data in one tenant. API v1 initially supports **reading Contacts, Companies, Leads, Deals and custom objects**. App scopes, selected properties and optional team limits determine exactly what data can leave the platform. Conversation metadata and message text reads are available with separate explicit scopes. No write scopes, public OAuth or webhooks are available in this release.

See the [exact contract and security model](../contracts/external-api.md). The Developer Portal at `/developer` provides the onboarding guide and private-app management. Native login and tenant-super-admin permission are required to manage apps.

## Quickstart

1. Sign in to CRM, open Developer Portal, select your tenant and create a private app.
2. Select an object, the fields the integration needs, and tenant-wide or selected-team record access. The resulting scope is `crm.objects.<object key>.read`; custom object keys have their own scopes.
3. Generate a token, copy it once into your integration's secret manager, and set an expiry. Treat it as a password. It cannot be retrieved later.
4. Call your deployment's API over HTTPS. Local backend is `http://localhost:3001/api/v1`.

```sh
curl "$CRM_API_BASE/external/crm/objects/contact?limit=50" \
  -H "Authorization: Bearer $CRM_APP_TOKEN"
```

The variable contains your token; examples never contain usable credentials. Credentials belong in the Authorization header, never URLs or browser storage. Native session cookies do not authenticate external calls.

## Data and scopes

One exact scope per object: `crm.objects.contact.read`, `crm.objects.company.read`, `crm.objects.lead.read`, `crm.objects.deal.read`, or `crm.objects.<custom_key>.read`. The administrator selects a nonempty list of properties for each grant. New properties remain unavailable until explicitly approved. An app is a separate service identity, not the administrator's session. Team access includes primary team or explicit record-team share; tenant-wide means all readable active records of that object within the app's one tenant.

GET `/external/scopes` inspects approved access. GET `/external/crm/properties/contact` returns selected property metadata. GET `/external/crm/objects/contact/{id}` reads one record. List returns `data`, `next_cursor`, `meta`; each record has `id`, `object_key`, `version`, `properties`. No related records expand automatically.

```json
{"data":[{"id":"01900000-0000-7000-8000-000000000099","object_key":"contact","version":"1","properties":{"display_name":"Synthetic contact"}}],"next_cursor":null,"meta":{"correlation_id":"example-only"}}
```

## Pagination, limits and errors

### Conversation and message access

In the app editor, select **Conversation** (`conversations.read`) for metadata and optionally **Conversation messages** (`conversations.messages.read`) for messages. Message grants require a Conversation grant. Select `text` explicitly to retrieve stored text/preview; selecting message status alone does not expose text. Both grants' team restrictions apply to the parent Conversation on every request. References remain IDs; Contact fields need a separate CRM scope and call.

| GET path under `/api/v1/external` | Required scope(s) |
|---|---|
| `/conversations` | conversations.read |
| `/conversations/{id}` | conversations.read |
| `/conversations/{id}/messages` | conversations.read + conversations.messages.read |
| `/conversations/{id}/messages/{messageId}` | conversations.read + conversations.messages.read |

Conversation properties: status, opened_at, closed_at, contact_id, team_id, owner_principal_id. Message properties: direction, status, occurred_at, received_at, text. Only chosen keys appear. Conversation items contain id/version/properties; message items id/conversation_id/properties. Lists return next_cursor. Conversation order is opened_at/id; message order received_at/id, ascending. Detail queries accept no parameters; lists accept limit/cursor only. Cursor also binds parent and resource kind. This is live pagination, not a snapshot export.

```sh
curl "$CRM_API_BASE/external/conversations/$CONVERSATION_ID/messages?limit=50" \
  -H "Authorization: Bearer $CRM_APP_TOKEN"
```

```json
{"data":[{"id":"01900000-0000-7000-8000-000000000098","conversation_id":"01900000-0000-7000-8000-000000000099","properties":{"direction":"inbound","text":"Synthetic message"}}],"next_cursor":null,"meta":{"correlation_id":"example-only"}}
```

`conversation_id` means the persistent channel thread. Sessions/episodes, internal notes, rich attachments/download URLs, provider IDs and attribution are not exposed. No external send, close, assignment or takeover command. [Exact Conversation contract](../contracts/external-conversations.md).

### Shared paging and errors

Pass `next_cursor` unchanged as the next `cursor` query parameter, using URL encoding. Stop at null. Limit1–100, default50. Cursors are opaque, scoped to the app/configuration/object/tenant; restart pagination after configuration changes. Lists exclude archived records. Filter/sort/search/batch are unavailable in v1.

Each app has120 authenticated admissions per minute across tokens/processes; rotation does not reset quota.429 returns Retry-After60; retry with jitter.401 requires checking expiry/revocation and replacing the secret;403 requires administrator approval of the exact scope;404 intentionally covers missing and inaccessible records;400 means invalid input/cursor;503 means temporary unavailability. Responses include correlation IDs for support and never echo secrets. No-store applies to all responses. Integration consumers must protect any downloaded personal data.

## Lifecycle

Tokens last90days by default, configurable1–365. Rotate atomically invalidates the previous token immediately; coordinate replacement in your integration. Lost token response: fetch app's current version and rotate again. Disable temporarily stops calls; revoke is permanent and erases the verifier. App grants apply live and do not require token reissue. Tokens cannot create apps or change scopes. Administrator mutations use native CSRF/Origin and quoted If-Match versions; stale409 means reload before retry. Creation uses a client-generated UUID to prevent accidental duplicates.

## HubSpot reference and differences

Official pages read2026-10-18: [Authentication](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview), [Scopes](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/scopes), [Private apps](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview). These describe single-account static auth versus multi-account OAuth, endpoint scope requirements and private-app token lifecycle. This platform adopts that packaging, with explicit per-property/team grants and one-time token display. It does not claim HubSpot wire compatibility or implement HubSpot OAuth.

Malformed JSON or oversized bodies are rejected by the shared parser before route authentication. Those400responses may omit message/correlation metadata; they never echo the submitted body. Other documented route errors include correlation IDs. The machine-readable reference is [openapi.json](openapi.json), also served at /api/v1/external/openapi.json.
