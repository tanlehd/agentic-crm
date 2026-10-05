# MOD-10 — Reporting & Dashboard

Status: Ready for implementation metric semantics/fixtures; custom report engine/API Draft M5. Requirements: REQ-11.

## Mục tiêu và phạm vi

Đo acquisition → conversation → qualified Lead → accepted Lead → Deal/Customer, đồng thời đo latency và hiệu suất Human/AI. Template ngành và mục tiêu dùng cùng semantic model với custom report.

## Actor và quyền

Viewer xem dữ liệu có quyền; analyst thiết kế report khi có report.design; admin publish template. Quyền report không vượt quyền object/field; các trường bị deny không được filter/group/export. Không cache chung kết quả khác scope quyền.

## Use case và state machine

Report definition draft → published version → archived; dashboard tham chiếu version. Run queued → running → completed/failed. M2 chỉ xác nhận metric bằng fixture/query test, chưa có report execution UI production.

## Entity và invariant

Metric definition chỉ rõ grain, time basis, numerator/denominator, join path, null handling và version. M1–M2 source là DB nghiệp vụ; event projection eventual consistency phải có watermark. M5 có thể dùng read model/warehouse bằng ADR, không query SQL do người dùng gửi.

| Metric key | Grain / công thức | Time basis |
|---|---|---|
| inbound_messages | count distinct inbound message_id | received_at trong window |
| new_conversations | count distinct conversation_id | opened_at trong window |
| ctm_conversations | distinct Conversation có CTM touchpoint | cohort opened_at; touchpoint known tại as_of |
| unique_contacts | distinct contact_id từ new_conversations | cùng cohort Conversation |
| qualified_leads | distinct Lead với qualified_at non-null | qualified_at trong window |
| ctm_to_qualified | CTM cohort conversations có ≥1 Lead qualified tới as_of / CTM cohort conversations | cohort opened_at, không chia hai event count khác cohort |
| lead_acceptance_rate | Lead qualified trong window đã accepted tới as_of / Lead qualified trong window | cohort qualified_at |
| handoff_acceptance_latency | accepted_at − handoff requested_at; median/p95 | handoff cohort; pending không tính latency đã hoàn tất |
| first_response_latency | first sent outbound − first received inbound | Conversation cohort; pending báo riêng |
| customer_conversion | distinct Contact có first won Deal tới as_of / distinct qualified Contact cohort | M4; Contact grain, không Lead grain |

Denominator 0 trả null/“—”, không 0%. Window `[from,to)` UTC, UI convert theo timezone tenant. Report luôn ghi as_of; snapshot không tự thay nghĩa vì data đến trễ. First response tính tin đã sent, không tính note/queued/unknown.

Phân tổ agent cho qualification dùng owner tại qualified_at từ audit/ownership history, không dùng owner hiện tại. Acceptance phân tổ accepted_by. So sánh Human/AI kèm số lượng mẫu và pending; không tự điều chỉnh routing M2.

## API và event

Consume domain events để projection future; M2 dùng persisted state và fixtures. Report authoring contract sẽ định nghĩa measure/dimension/filter/join allowlist trước M5. Template dự kiến: Healthcare acquisition, Chat conversion, Sales follow-up, Service SLA.

## UI

Dashboard card có metric label/definition, window, timezone, as_of và freshness. Custom report builder chọn source/grain, dimensions, measures, filters; preview thể hiện join relationship và guard fan-out. Export kiểm tra quyền lại lúc chạy.

## Failure handling

Pre-aggregate theo grain trước join one-to-many; không fix fan-out bằng DISTINCT amount. Khi schema/field archived, report lỗi rõ field unavailable, không silently bỏ filter. Cache key tenant + permission fingerprint/auth_revision + definition version + params + watermark.

## Acceptance và dependency

[AC-11](../quality/acceptance.md), [healthcare fixtures](../business/healthcare.md); phụ thuộc CRM metadata, Identity, mọi module producer.

## Mở rộng còn Draft

Query planner, limits, joins, metric version migration, dashboard sharing, refresh schedule, export và attribution đa chạm cần thiết kế trước M5. M2 không hứa tính ROAS khi chưa có cost/revenue data.

M2 private query verification and continuous percentile/as_of rules: [healthcare fixture contract](../contracts/healthcare-fixture.md). No production report execution or cache is introduced.
