# MOD-XX — Module name

Status: Draft. Milestone: M?. Requirements: REQ-?.

## Mục tiêu và phạm vi

Mục tiêu, capability của phiên bản này, phần hoãn và dependency.

## Actor và quyền

Actor, seat/entitlement, permission action, record scope và field policy.

## Use case và state machine

Happy path, trạng thái bắt đầu/kết thúc, transition, trigger, guard và hành động.

## Entity và invariant

Link dictionary; relationship, uniqueness, transaction boundary, concurrency.

## API và event

Link contract chuẩn; producer/consumer, idempotency, version, compatibility.

## UI

Entrypoint, bố cục, hành động và trạng thái empty/loading/error/forbidden.

## Failure handling

Retry, timeout, cancellation, reconciliation, audit và recovery.

## Acceptance và dependency

Link AC, fixtures, kết quả mong đợi; module upstream/downstream.

## Mở rộng còn Draft

Ghi cụ thể capability và quyết định phải hoàn thiện trước implement.

## Database placement bắt buộc

Liệt kê bảng mới/thay đổi với current physical DB, target schema trong [catalog](../data/schema-catalog.md), owning aggregate, business/system scope và tenant_id NOT NULL. Điền [table template](database-table.md) cho từng nhóm invariant; remote refs qua API/events, không cross-schema SQL/FK. Nêu compatibility/backfill và reusable synthetic fixture evidence.
