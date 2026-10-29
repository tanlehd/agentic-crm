# Canonical reference candidate — T05

2026-10-20, CHG-20261020-01. [Contract](../contracts/chat-ingress-references.md), [evidence](../tracking/details/SRC-109.md#t05--canonical-reference-candidate-partial). T05 remains IN_PROGRESS. This candidate is not mounted into main or the D1 worker.

| Handler / operation | Owner and implementation |
|---|---|
| contact-binding-read | CRM NativeCrmContactReferences in services/core-baseline/src/modules/crm/owner-contact.ts; canonical Contact/identity SQL only |
| connection-binding-read | Channels NativeChannelReferences in services/core-baseline/src/modules/channels/owner-reference.ts; active mock connection/Page/team |
| reference-reserve/status/release | OwnerReferenceLedger infrastructure in backend kernel; each adapter supplies its own pool, allowed kinds and local validator |
| close/cancelClose | Trusted local writer ports; close creates gate before first use, drains via real Chat proof/abort; does not itself archive/disable |
| command-proof/command-abort | services/chat/src/owner-http.ts; CRM metadata scope preserved, ingress reference proof scope added for CRM/Connector |

For CRM composition, spread crmOwnerMetadataRoutes first, then crmContactOwnerRoutes(contacts, metadata), so the shared reference paths dispatch explicitly by kind. Contact routes alone reject metadata; no silent stub/fallback. Channel reference routes coexist with history-platform-read, which intentionally supports disabled historical connections.

Run with pinned Node24.21.0/pnpm10.33.0:

```powershell
$env:PATH = "$PWD\.local\node-v24.21.0-win-x64;$env:PATH"
node .local/tooling/node_modules/pnpm/bin/pnpm.cjs test:chat:references:native
```

First explicit retained-fixture provision uses `node scripts/identity-owner-native-test.mjs --focus="Chat references" --provision` after builds. The test only permits native_identity_test and existing test_crm_chat_owner. It extracts immutable reviewed Connector T02 DDL and pins its hash; CRM tables already provisioned by T04. No schema auto-sync, reset, password replacement or volume removal. Private .local/chat-ownership/reference-fixture.json contains reusable synthetic IDs and two restricted runtime passwords; never print/copy into evidence. Reference-schema.json pins the two new test tables. Test listeners/pools close in finally; HTTP Chat is temporarily stopped/reopened inside the outage test only.

Native coverage8groups: canonical live and tenant mismatches/least privileges; concurrent reserve/lost ACK/status/terminal/no rearm; proof field/subject/revision and recovery allowlists; archived Contact/disabled channel; outage-safe barriers/late reserves/cancel replay; close before first use and committed terminal race/restart; simultaneous reserve/close and commit/close; real Chat HTTP outage without Contact creation. Native Identity signs current workload registry admission in both directions. Synthetic command commit verifies ledger races only, not a message effect or service business authorization.

Current ingress/message/session/referral/denial evidence is recorded in [T05](../planning/chat-extraction/05-messaging-workspace.md). Remaining work follows that plan, starting with own-schema D2 Human send. Archived-Contact/retirement fixture cases above are retained source compatibility tests, not a requirement to build distributed Contact archive. See [compatibility inventory](../contracts/legacy-record-archive.md).
