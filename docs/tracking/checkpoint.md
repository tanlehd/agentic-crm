# Checkpoint — điểm tiếp tục

Updated 2026-10-05, S-20261005-05 (Git handoff sau SRC-017).

## Trạng thái thực tế

**SRC-001…017 DONE (17/25), M1 gate PASS. SRC-018 READY, chưa claim; không task active.** [SRC-017 evidence](details/SRC-017.md), [tracker](tasks.md).

Preview [localhost:8080](http://localhost:8080) có OIDC/Identity Admin/CRM, mock intake/Chat inbox và **Phân công & lịch sử**: eligible Human/AI selector, team/capability, disabled reasons, assignment, takeover, history và stale review. Không Meta/AI runtime production hoặc full M2/Workflow/Sales.

Schema v11 routing_capacity applied; v1–v10 immutable. Fingerprint13 existing tables exact before/after upgrade, trước seed. Routing seed first2/repeat0 thêm role routing_operator cho Alpha/Beta admins, không phục hồi quyền bị thu hồi; AI fixture policy vẫn fail closed. Credentials chỉ private .env.

Validation PASS: 96 MySQL integration; 9 canonical verify gates (46 unit/contract +7 tooling); release preview build; Chrome154/OIDC real API E2E Alpha/Beta/viewer. Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11; host Node25 chỉ driver/diagnostic. Artifacts local ignored `artifacts/SRC-017/`.

## Điểm nối source

- `modules/agents/routing.ts`: Human assignment/takeover receipt/CAS; internal route UoW primitive và routeService live role allowlist; UUID round-robin tenant/team/capability; unassigned fallback/attention. Internal Human route caller phải loadHuman exclusive trong cùng UoW trước record lock. Không public route execution endpoint; workflow chưa được xây.
- `modules/identity/routing-port.ts`: live candidate projection (active/availability/membership/seat/role/team/AI policy). Field policies qua CRM port. Conversation tool conversation.propose_reply, Lead qualification.save; allowed_actions resource.action. Không generic AI SQL/tools.
- `modules/agents/capacity.ts`: principal lock + execution UUID reservation ledger, idempotent không gia hạn, released/expired không tái dùng, max30s. SRC-018 phải reserve cùng transaction chuyển agent_execution running và release terminal; queue30s/deadline/fencing/late output vẫn chưa triển khai.
- `modules/conversation/ownership-port.ts`: cancelQueued cùng assignment UoW, giữ sending. `OwnershipChanged` callback để nối pause session/cancel tool/runtime ở SRC-018/020; không fake engine. Lead owner độc lập. Existing onClose hook vẫn chờ SRC-020.
- `modules/agents/access-consumer.ts`: routing.access.v1 durable principal.access_changed consumer; attention owner_ineligible dựa live state, không tự reassign. Capacity bận không đánh owner revoked. record.assigned consumers cho runtime/session/projection vẫn pending theo ADR-014; cancellation queued đồng bộ không phụ thuộc outbox delivery.
- `apps/web/app/crm/ownership.tsx`: API-backed current-team target selector/history/takeover, exact key/payload/version khi mất ACK; version changed bắt review. Inbox drafts/reply owner_revision review tiếp tục SRC-016. Cross-team assignment hiện API-only.
- `pnpm seed:routing`, `pnpm test:routing`; synthetic browser intake records retained, refs trong browser-facts.json. No test-only ownership fixture used by SRC-017 E2E.

## Bước tiếp theo

Claim **SRC-018 — Agent Runtime adapter + deterministic mock + tools**. SRC-017 DONE; mock M2 runtime design Ready. Đọc Agent Runtime contract, Agents/Chatflow design, dictionary và AC-07 trước code. Nối actual execution với capacity ledger/cancellation hook; giữ tool allowlist/deadline/live auth-owner revision, late-result reject, private deterministic harness. Chưa implement Chatflow engine thay SRC-020. Một task active; không agent song song/lịch nền.

## Workspace / runtime

Branch main: snapshot SRC-017 được commit/push theo yêu cầu người dùng trong S-20261005-05 (parent153a1e4). Hash/trạng thái thực kiểm tra git log/status và remote sau thao tác; không deploy. Người dùng yêu cầu tiếp tục SRC-019, nhưng SRC-018 chưa DONE: đang xác nhận thứ tự 018→019 hoặc chỉ018; chưa claim task mới. Evidence chức năng giữ ở SRC-017.

Seven preview services gateway/web/API/worker/MySQL/Redis/Keycloak healthy; one-shots complete. Worker sampled tail không tick error. Disposable test projects cleanup; verify/browser runners completed, không automation. Remote CI/native AMD64/Windows/production provider NOT_RUN. Không reset database/volume; recovery theo [runbook](../development/migrations.md).
