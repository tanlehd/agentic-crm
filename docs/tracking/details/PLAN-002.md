# PLAN-002 — M3 provider/connector direction

Owner: Codex, 2026-10-06. Dependency SRC-025 DONE. Scope: planning/documentation only, user direction authorized; no production implementation acceptance.

## Deliverables

[M3 plan](../../planning/m3-provider-plan.md), [message envelope Draft](../../contracts/messaging-platforms.md), [Meta dossier](../../references/meta/README.md), ADR-016 and CHG-20261006-03. Updated README/index, module Agents/Channels/Conversation, runtime/conversation contracts, data model/dictionary, architecture, UX, roadmap/build plan, acceptance and tracker/checkpoint/log.

AI Agent provider setup treats Meta Business Agent as a hosted platform; CRM Connector integrates messaging transport/routing independently. Message base fields platform/message_type/external_msg_id/text/reply_to/attachment and compatibility documented without changing M2 wire schema or migrations. Human/AI CRM ownership distinguished from provider app/thread control. WhatsApp Meta Agent eligibility excludes Health in current overview; synthetic catering/retail case study replaces no healthcare M2 evidence. Exact implementation contracts remain Draft; PLAN-003/004 carry remaining design work.

## Sources and verification

Host macOS ARM64, Node v25.9.0 only for doc checker, Python3 for download/hash checks; no application runtime test on host. Browsed official Messenger Webhooks page, observed View as Markdown, followed official docs/index URLs. Downloaded 20 Markdown pages +2 llms indexes, immutable bytes and provenance in [manifest](../../references/meta/2026-10-06/manifest.json). Selected source corpus, not a full Meta mirror. No authenticated provider API calls.

Commands used: `curl -fL --max-time 30 <official-url> -o <local-file>`; Python urllib download of selected URLs discovered in official llms indexes (4 download workers, not agents); Python hashlib manifest verification; `node scripts/check-docs.mjs`; `git diff --check`; `docker ps --format '{{.Names}}\t{{.Status}}'`.

Initial sandbox curl DNS failed; approved network fetch succeeded. Initial docs check rejected upstream HTML-escaped JSON examples; preserved raw snapshots as `.md.txt` so they are references, not repository JSON contracts. No checker bypass/change. An intermediate check before evidence file creation found missing PLAN-002 link; final check must rerun after all files exist. Earlier errors are not PASS.

Final checks and artifact references recorded in session log S-20261006-05. Runtime, provider sandbox, account eligibility and all M3 AC scenarios NOT_RUN. Mermaid checks only headers, not rendering. Existing M1–M2 release evidence retained without rerun or expanded claim.

## Handoff

Working-tree reference: main starting HEAD `1111839`; docs changes uncommitted. No product source/API/event/schema/migration changed, no commit/push/deploy. Read-only Docker snapshot: seven existing preview services healthy, no test containers listed; no service lifecycle action. No subagents or background automation. Next task PLAN-003 completes provider source/capability/gap matrix; production integration requires PLAN-004 design gates. Provider discrepancy list in dossier remains open deliberately.
