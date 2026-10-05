# Checkpoint — điểm tiếp tục

Updated 2026-10-05, S-20261005-03 (Git handoff sau S-20261005-02).

## Trạng thái thực tế

**SRC-001…016 DONE (16/25), M1 gate PASS. SRC-017 READY, chưa claim; không task active.** [SRC-016 evidence](details/SRC-016.md), [tracker](tasks.md).

Preview [localhost:8080](http://localhost:8080) có OIDC/Identity Admin/CRM UI và tab **Chat**: queue, timeline, Activity notes, quick reply, Contact/CTM context, Human/AI owner và polling5s. Mock Messenger intake/worker/outbound thật trong local; chưa Meta/AI production hoặc full M2/Workflow/Sales.

V1–v10 immutable; SRC-016 không có migration. Seed `pnpm seed:inbox` first2/repeat0 thêm inbox_operator cho Alpha/Beta admins, không phục hồi quyền đã thu hồi. Channel seed/token giữ nguyên. Credentials private .env, không in/copy vào log.

Validation PASS: 82 MySQL integration; 9 canonical verify gates (44 unit/contract +7 tooling); release preview build; Chrome154 E2E Alpha/Beta/read_only. Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11. Full verify trước one-line textarea aria-label fix; fix cuối đã qua canonical preview build/browser và host lint/typecheck. Host Node25 chỉ driver/diagnostic. Artifacts local ignored `artifacts/SRC-016/`.

## Điểm nối source

- `apps/web/app/crm/inbox.tsx`: real cursor queues/messages/notes; loaded pages poll5s, paused background. Prefix search in loaded pages, explicit team-ID filter. Drafts/keys/pending exact send payload/review revisions live in tenant memory; tenant switch destroys workspace/cache. Ambiguous send checks original payload/key. Closed read-only, unknown no resend. No dummy takeover/qualification buttons.
- Conversation optional `owner_kind`, `allowed_actions`, `latest_message`; current seat/scope/field/owner enforced at API and mutation. Latest-message snapshot receipt replay also checks current text read permission. Contact and attribution are projected by ports.
- GET `/conversations/{id}/notes`: Conversation read then independent Activity scope/field ACL; UUID cursor ASC ID; UI sorts loaded notes by time. CRM owns SQL; Identity port supplies owner kind. Contracts/schema/generated synchronized.
- `pnpm seed:inbox` and `pnpm test:inbox` available. Browser-only runtime fixture restricts assignment to identity `src016-synthetic-`, uses registry/UoW/audit/outbox and cancelQueued hook, no public assignment API. Synthetic records retained; `browser-facts.json` gives refs. Fault-injected unknown/403 checks are distinct from real worker/send/ownership/tenant checks.
- SRC-015 intake retains durable ACK, canonical hash/event dedup, message dedup before Contact creation, worker claim/fencing/backoff, atomic identity/contact/conversation/message/touchpoint. [Intake contract](../contracts/mock-intake.md), [SRC-015 evidence](details/SRC-015.md).
- `cancelQueued` awaits actual assignment integration SRC-017; `onClose` orchestration SRC-020; AI send fail closed until SRC-018. Lead M2 references guarded. Domain outbox consumers still pending according to ADR-014.

## Bước tiếp theo

Claim **SRC-017 — Routing/capability/capacity, assignment/takeover**. Dependency SRC-016 DONE; Agent/Routing M2 design Ready. Read module, assignment contracts, dictionary, acceptance AC-06/18 and current owner ports before code. Implement actual eligibility/capacity/round-robin, fallback and independent Conversation ownership; cancel queued intents in same assignment UoW, leave sending results accurate. Do not treat browser fixture as production routing. One task active; no parallel agents/background schedule.

## Workspace / runtime

`main`: snapshot SRC-015/016 được gom vào commit chứa checkpoint này theo yêu cầu người dùng (parent `8cceb22`). Hash thực xem `git log -1`; kiểm tra working tree sau commit bằng `git status`. Không push/deploy; không blocker hoặc pending decision. Evidence chức năng vẫn theo các task, Git handoff ghi S-20261005-03.

Seven preview services gateway/web/API/worker/MySQL/Redis/Keycloak healthy; one-shots complete; schema v10 unchanged. Worker sampled tail has no tick error. Disposable MySQL test projects cleaned up; browser/verify runners completed, no automation active. Remote CI/native AMD64/Windows/production Meta NOT_RUN. No database/volume reset; recovery per [runbook](../development/migrations.md).
