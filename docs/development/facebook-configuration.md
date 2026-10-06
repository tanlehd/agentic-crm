# Facebook configuration demo runbook

SRC-031: actual OAuth adapter and Page discovery, locally verified with synthetic Graph responses. Live Meta NOT_RUN until app setup. [Contract](../contracts/facebook-configuration.md). Admin → Channels → Facebook → choose receiving team → Connect Facebook → select Pages/permissions on Facebook → return to catalog. Receiving team must be active chat/general; existing Page keeps its original team on reconnect.

## Server configuration

Use private local environment/secrets; never paste token/App Secret/key into chat, tracker, source or screenshots. API reads `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_TOKEN_ENCRYPTION_KEY` (32 random bytes encoded64 lowercase hex), optional `FACEBOOK_LOGIN_CONFIG_ID`. `APP_ORIGIN` determines exact callback: `/api/v1/admin/channels/facebook/callback`. Register that complete URL in the Meta app's valid OAuth redirect URIs and configure permitted domains. Public/demo HTTPS and the app's valid Facebook Login configuration are operator prerequisites. Local HTTP is accepted only for localhost/127.0.0.1 in development/test; Meta may require a public HTTPS callback for the selected login product.

Graph version pinned v26.0. Login without config ID requests pages_show_list, pages_messaging, pages_manage_metadata, business_management; Business Login config ID must grant equivalent appropriate Page access. App review/development-mode user roles and Page tasks govern actual results. A valid Page token alone does not configure OAuth: App ID/secret/login redirect are still needed. User access token is not stored. OAuth stores returned Page tokens encrypted in facebook_page.token_ciphertext; DB key is separate and must be backed up securely. Do not rotate key blindly; existing ciphertext requires re-encryption or reconnect with the original key available.

Apply additive schema19 using existing migration command, then runtime grants and updated API/web images. Existing migrations/checksums remain intact. Stop old writers for migration/cutover; provider columns are compatible with legacy mock writes, but old builds cannot operate new Page configuration. Do not drop schema19 or roll back to a runtime that treats real channels as mock. This task does not upgrade running preview automatically.

Authorization: admin seat plus `integration.read`/`integration.configure` scope all; active team. New seeded tenant_admin includes grants. Existing deployments do not silently change roles: authorized admin can add those two permissions through the existing role editor, or explicitly refresh local fixtures using supported seed flow. The team selector uses `team.read` and lists the first100 teams (larger deployments need future searchable team selection).

Gateway callback route disables access/error logging and sends no-referrer policy. Apply equivalent redaction to any external proxy/APM before exposing OAuth. Browser receives only authorization URL, Page metadata and sanitized completion status.

## Replace a Page token manually

First connect Facebook so catalog has a stable channel_id and page_id. To replace a Page token, execute built `dist/modules/channels/facebook-token-cli.js TENANT_UUID CHANNEL_UUID` in API environment (or `pnpm --filter @agentic-crm/backend exec tsx src/modules/channels/facebook-token-cli.ts TENANT_UUID CHANNEL_UUID` with equivalent local DB/config). Feed token on stdin from a no-echo secret prompt or secret manager; never pass token as command-line argument, SQL literal or environment echoed in terminal output. CLI is restricted to development/test, verifies Graph `me.id` equals catalog Page ID before writing AES256GCM ciphertext and an ID-only audit entry. Reports only success/failure; no token printed. Direct plaintext assignment to token_ciphertext will not produce a usable credential.

## Meaning of state and next integration gate

“Đã lưu thông tin kết nối” means a Page token was obtained/stored, not that messaging/subscriptions are live. Page catalog is cumulative and reconnect does not automatically remove assets omitted by a later authorization. No automatic token validity/expiry guarantee; reconnect refreshes returned tokens. Catalog Page is disabled for transport until a later subscription/ingestion/send gate is implemented. Independent Connector signed capture still needs explicit provisioning and is not automatically linked by this flow. No calls send messages or subscribe Pages during setup.

Conversation channel is messenger or mock_messenger; channel_id is stable internal connection UUID, Page ID remains external string. Inbox options show only channels with conversations readable by the current user. Page ID/channel/channel_id filters are server-side, tenant-scoped and bound to pagination cursors; archived/disabled-channel history remains readable. Report engine is not introduced; these fields provide report grouping/filter dimensions.
