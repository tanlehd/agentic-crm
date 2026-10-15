# Workflow Web — CMS

SRC-066 implements an early integrated Next.js screen on [M2 CMS contract](../contracts/workflow-cms-m2.md): seven-node editor and existing version/publish/enable APIs. This does not deploy an independent workflow-web service or complete distributed PLAN-024E.

SRC-067 upgrades that screen to a [visual builder](../contracts/workflow-visual-builder.md), using pinned React Flow12.12.0. Layout lives in tenant/definition/version-scoped sessionStorage as numeric positions only. Execution graph, shared CRM metadata ownership and M2 APIs are unchanged. Native browser evidence covers the scoped canvas; broader distributed Web scenarios below remain pending.

PLAN-024 / ADR-022, 2026-10-13. Architecture Ready; source/exact UX gate PLAN-024E chưa Ready. Proposed deploy unit `workflow-web`, Next.js/TypeScript, tích hợp navigation/tenant context của CRM; chưa có thư mục source hoặc service đang chạy riêng.

## Trách nhiệm

CMS gồm danh sách workflow, draft canvas có keyboard/list alternative, trigger/re-enrollment editor, node palette theo capability, node config và shared CRM metadata picker, validation errors tại node/field, review/publish/activation status, run timeline và cancel có quyền. Template follow-up chỉ là prefilled draft, không tự enable/gửi tin.

Workflow Web gọi Workflow API; không gọi Kafka/Core trực tiếp, không truy cập MySQL. Native Identity session/CSRF qua cùng gateway/BFF convention; auth không dùng Keycloak. Tenant switch clear/cancel queries, không giữ graph hoặc data picker của tenant trước. Secret/template provider credentials không về browser.

## State và failure

Draft save dùng ETag/CAS, stale conflict cho reload/compare; không overwrite thay đổi của người khác. Autosave nếu thêm sau phải có explicit UX, không tự publish. Placeholder node lưu draft được nhưng chặn validate/publish. Canvas hỗ trợ node insert/delete/connect, branch/default/timeout/error edges, undo local draft, zoom và keyboard traversal; reference invalid sau delete phải hiển thị lỗi.

Run view dùng sanitized Core read qua API, nêu version, record refs có quyền, step status, due_at, retry/attention và effect receipt; accepted/delivered/unknown khác nhau. Metadata/API unavailable hiển thị retry, không fallback data giả. Disable dừng enroll mới, cancel áp run riêng. Simulation ghi rõ read-only, không gửi communication.

## Data và acceptance

Không có business schema. Browser caches không authority. [Metadata](../data/workflow-metadata.md), [architecture](../system/workflow-architecture.md), [WF-14](../quality/workflow-platform-acceptance.md): save/reopen đúng graph, stale CAS, graph accessibility, tenant switch/field deny, placeholder publish blocked, activate failure và actual API-backed timeline. Tất cả kiểm thử Web mới NOT_RUN.
