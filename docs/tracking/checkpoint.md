# Checkpoint — điểm tiếp tục

Updated 2026-10-04, S-20261004-04.

## Trạng thái thực tế

**SRC-001…013 DONE (13/25), base CRM M1 gate PASS. SRC-014 READY, chưa claim; không task active.** [Evidence SRC-013](details/SRC-013.md), [tracker](tasks.md).

Preview [localhost:8080](http://localhost:8080) có OIDC/tenant selector, Identity Admin UI, Contact/Company/Activity, Lead draft/consent/qualification, custom Appointment/ServiceOffering CRUD, metadata/property/form/view, typed index/query và association. Quyền vẫn kiểm ở backend; query cache/form tách tenant.

Migration v1–v8 immutable; v7 properties/custom records, v8 CRM core/Lead. Upgrade v6→v8 giữ exact fingerprint 13 bảng cũ trước seed. Seed Identity v1/registry v2 giữ nguyên; M1 v3 additive dedicated roles/metadata, first2/repeat0 created. Synthetic E2E records được giữ trong preview. Không reset volume/credential.

Final verification: 53 MySQL integration, 9 verify gates (40 unit/contract +7 tooling), real Chrome154 E2E, cold tmpfs và warm stop/start preservation đều PASS. Canonical Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11; Node25 host chỉ driver. DEF-001 concurrent auth touch đã sửa và regression PASS. Artifacts local `artifacts/SRC-011/`, `SRC-012/`, `SRC-013/`, `artifacts/verify/`.

## Điểm nối source

- CRM properties/records/core/ui/http trong `apps/backend/src/modules/crm/`; Sales Lead core trong `modules/sales/leads.ts`. Transaction/reference/archive qua application ports, không truy cập chéo bảng module.
- Frontend `apps/web/app/crm/`: API/query provider, records, administration, metadata. Tenant unmount hủy query và clear cache; stale version có reload rõ ràng.
- Contracts CRM records/core/ui cùng OpenAPI/generated TS; local seed `pnpm seed:m1` và E2E `pnpm test:m1`.
- Session lock bounded wait tối đa2.5s/25ms, reread/CAS và logout revocation giữ nguyên. CHG-20261004-06/DEF-001.
- Lead session-origin/M2 references fail closed; chưa Conversation/Chatflow/Sale handoff. Domain outbox reporting/automation chưa consumer, unknown events được giữ failed theo ADR-014. Không giả production integration.

## Bước tiếp theo

Khi tiếp tục M2, claim **SRC-014**: Conversation/message domain, outbound intent/mock sender. Dependency SRC-013 DONE; thiết kế text inbox M2 Ready. Đọc module Conversation/Channels, data dictionary, contracts/events và acceptance trước khi code; gap cần change entry. Không tự mở task/agent song song.

## Workspace / runtime

Nhánh `main`, base implementation trước M1 là `7c05518`, tracking origin/main. Người dùng yêu cầu commit/push SRC-011…013 ngày 2026-10-04; commit chứa checkpoint này là bản bàn giao M1, kết quả Git xác minh sau thao tác. Remote CI/AMD64/Windows native NOT_RUN, không deploy. Không blocker hoặc quyết định pending.

7 services preview gateway/web/API/worker/MySQL/Redis/Keycloak healthy sau stop/start; migrations/provision one-shots exit0. Cold/integration projects đã cleanup; không automation hoặc test runner active. [Local runbook](../development/local.md), [verification](../development/verification.md). Không reset DB nếu gặp sự cố; recovery theo runbook.
