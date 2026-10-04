# Checkpoint — điểm tiếp tục

Updated 2026-10-04, S-20261004-05.

## Trạng thái thực tế

**SRC-001…014 DONE (14/25), M1 gate PASS. SRC-015 READY, chưa claim; không task active.** [SRC-014 evidence](details/SRC-014.md), [tracker](tasks.md).

Preview [localhost:8080](http://localhost:8080) giữ M1 OIDC/Identity Admin/CRM UI; backend mới có Conversation queue/detail/timeline/note/transition và outbound intent/mock sender. Chưa có channel seed/public inbound hoặc inbox UI — thuộc SRC-015/016. Không suy diễn hoàn tất M2.

Migration v1–v9 đã áp dụng preview, immutable; v9 additive channel_connection/contact_identity/conversation/message/outbound/mock receipt. 27 bảng M1 exact count/hash giữ nguyên qua upgrade. Seed v1/v2/v3 không đổi, không reset volume/credential. Lead Conversation/session/touchpoint refs vẫn guarded tới Sales M2.

Final verification: 67 MySQL integration (14 Conversation), 9 verify gates (42 unit/contract +7 tooling), build/typecheck/docs/schema/generated/smoke PASS. Canonical Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11; Node25 host chỉ Compose driver. Artifacts `artifacts/SRC-014/` local ignored. M1 browser evidence giữ ở SRC-013; không chạy browser inbox khi UI chưa có.

## Điểm nối source

- `apps/backend/src/modules/conversation/domain.ts`: `Conversations.receive(TransactionScope, normalizedMessage)` là intake port; lock identity→Contact→Conversation, tạo registry ownerNULL/team từ channel connection, atomic message/audit/outbox, duplicate/provider-payload conflict. Caller SRC-015 phải đưa durable delivery/Contact resolution/touchpoint vào cùng UoW.
- `modules/channels/ports.ts`: Channels-owned connection/identity reads; v9 channel_connection chỉ mock_messenger, active/disabled/team FK; credentials/delivery/referral chưa triển khai. `mock-sender.ts` persisted fake receipt tenant+intent, lookup reconcile không resend.
- `modules/conversation/outbound.ts`: queued→sending→sent/failed/unknown, token CAS, auth/owner/connection recheck; sending quá60s→unknown; retry chỉ failed pre-dispatch. Reliability worker tick gọi dispatcher. Unknown không auto-resend.
- `cancelQueued` export phải nối assignment UoW dưới registry lock tại SRC-017; close gọi hook orchestration được compose tại SRC-020. AI send chưa exposed, fail closed tới SRC-018. Test dùng assignment harness, không gọi là routing implementation.
- CRM conversation ports tạo Activity note và unassigned registry, Contact archive guard. Exact schema/OpenAPI/TS ở packages/contracts; [contract](../contracts/conversation.md).
- Domain outbox chưa có automation/reporting consumer, unknown events giữ failed theo ADR-014. Không provider/AI thật.

## Bước tiếp theo

Claim **SRC-015 — Mock Messenger intake, identity resolution, attribution**. Dependency SRC-014 DONE; đọc Channels, normalized inbound/API/service actor credential binding, data dictionary, AC-05/referral/duplicate delivery trước code. Thêm physical/contract refinement bằng CHG trước phần phụ thuộc; không tự mở task/agent song song.

## Workspace / runtime

Nhánh `main`, HEAD `f575a8e` (M1), tracking origin/main. Working tree dirty gồm SRC-014 implementation/docs/contracts/tests; chưa commit/push, không deploy. Không blocker/quyết định pending.

7 services preview gateway/web/API/worker/MySQL/Redis/Keycloak healthy; migration/provision/grants one-shots exit0, status `Schema ready: 9`. Worker logs không tick error. Integration tmpfs projects cleanup, không runner/automation active. Remote CI/AMD64/Windows native NOT_RUN. Không reset DB; recovery theo [migration runbook](../development/migrations.md).
