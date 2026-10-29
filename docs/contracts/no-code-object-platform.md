# Object Platform integration boundaries — PLAN-028

2026-10-15 · **Contract direction; exact wire/API/schema gate PLAN-028A/B/C chưa DONE.** Không dùng pseudo-shapes dưới đây như endpoint đã deployed. [Plan](../planning/no-code-object-platform.md), [logical data](../data/no-code-entity-model.md).

## 1. Registry và owner contracts

Reuse [registry](registry.md), [custom record](crm-records.md), [descriptor/UI](crm-ui.md) và [Workflow catalog v1](workflow-catalog.md). Object/Property/Association IDs canonical; object key và custom property key immutable. `RecordRef` logical gồm tenant + owner service + object ID + record ID. Standard property identity hiện là `standard:<key>` scoped by object; không đổi thành generated UUID khi compile consumer model.

PLAN-028A phải xuất executable OpenAPI/JSON Schema, permissions/error catalog, CAS/idempotency, pagination/bounds và compatibility tests cho các surfaces mới: unified admin catalog, object presentation/display field, property compatibility, association reverse labels/unlink, dependency usage, form/view/placement config, ERD discovery. Endpoint names quyết định ở gate, không ngầm đưa fields vào strict v1 responses. Native session/CSRF/current tenant + quyền configure/schema theo policy hiện hành; mỗi mutation receipt bind tenant/actor/command/payload/version.

Mỗi object/field/relation công bố capability thực tế: schema_read/manage, record_read/create/update và capability riêng đã có use case, query/filter/sort, association/traversal, report_source, event operations/change-image, workflow commands. Discovery metadata không cấp execution authority. Standard owner inventory phải chỉ rõ Contact/Company/Activity, Lead/Deal, Conversation, Ticket hỗ trợ gì và custom values ghi ở đâu; unsupported owner không nhận property write rồi âm thầm bỏ dữ liệu.

Association create giữ read cả hai đầu + update source + association action; cardinality locks/CAS theo M1. Unlink hoặc thay đổi metadata không tương thích cần permission/version contract theo thao tác cụ thể. Standard domain relationship chỉ owner command được sửa. Cross-service target verification failures phân biệt unavailable/not-found/forbidden nội bộ, public response không leak existence; không SQL/FK/UoW xuyên service.

## 2. Shared catalog publication và schema evolution

Catalog structurally versioned; authorized view riêng theo principal/policy revision. Consumer nhận stable refs, type/cardinality/owner/capabilities và digest. Cache key tenant + structural revision + authorization revision + actor/scope; tenant switch clears cache. Current v1 combined digest vẫn supported, không diễn giải lại.

Save metadata không tự bật consumer. Reporting source registration và Workflow trigger availability chỉ ready sau validate adapter/rights/coverage. Dependency index cung cấp impact cho metadata đang được sử dụng; không tạo giao thức hỏi mọi consumer hoặc chặn thao tác độc lập khi consumer không liên quan unavailable. Concurrent metadata edit với publish có revision fence. Rename label giữ bindings; incompatible type/remove/index capability change block publish/run mới hoặc cần explicit upgrade; published artifacts không tự mutate. Retained manifests không lưu quyền đã thu hồi.

PLAN-028A chốt atomic publish scope: metadata/schema changes, presentation configs và workspace placement có receipts/CAS riêng, không pretend distributed transaction với Reporting/Workflow. Failure ở consumer có thể pending/retry; schema có thể active trong CRM dù reporting chưa ready và UI phản ánh đúng.

## 3. Connected Reporting — PLAN-028B

CRM owns authorized producer APIs/snapshots/change events. Reporting owns model compiler/projections/query/export trong crm_reporting; không đọc agentic_crm/crm_core SQL. Trong baseline monolith producer dùng owner application ports; Reporting độc lập vẫn gọi authenticated API. Versioned IDs namespace giữ mapping canonical, không map bằng display label hoặc mock catalog key gần giống.

Tạo datasource binding connected riêng; existing mock bindings/reports giữ nguyên. Initial consistent snapshot có schema revision, source cursor/watermark và coverage; incremental record/property/link changes có stable event ID, entity revision, tombstone và replay dedup. Snapshot→change handoff phải có gap/duplicate tests; không advertise fresh khi thiếu sequence/coverage. PLAN-028B chốt refresh mode, lag budget, retention, supported scalar/field widths và query cost/row/time/export limits, không tự bật cron.

Source availability ≠ record grant. Query/filter/group/aggregate trên tập authorized; joined records/fields cũng kiểm current policy. ACL apply trước aggregation/pagination; server rechecks trước result/cache/CSV delivery. Nếu producer không thể xác nhận rights/freshness thì deny/unavailable, không trả snapshot privileged. Hidden targets không trở thành evidence rằng relationship không tồn tại để suy đoán forbidden values; authorized projection semantics và aggregate disclosure phải exact ở gate.

**Model builder:** root object + allowed relation paths/direction/label + grain + field/measure refs. Tối đa traversal ban đầu đề xuất 3 hops theo Workflow binding; hạn mức final cần benchmark. 1:N/N:N trả collections; không implicit first-row. Path ambiguity phải chọn association cụ thể. Root-only query không cần traversal nhưng không được claim related-source support.

| Ý định | Semantics kế hoạch |
|---|---|
| Root with/without child | Giữ root không có authorized matching child, nullable child dimensions; filter placement explicit |
| Root with matching child | EXISTS trên authorized child set; không join nhân root |
| Root count | COUNT DISTINCT root ID trong từng nhóm; tổng recompute ở root grain |
| Child count | Distinct child ID theo grain lựa chọn; group overlap có thể không additive |
| Root amount qua N:N | Preaggregate/dedup tại root; group theo many label là overlap, không cộng group totals; allocation chỉ khi contract riêng |
| Two independent child collections | Preaggregate từng collection hoặc reject unsupported fan-out; không Cartesian join |
| Monetary value | Amount + currency, split currency; không tự FX convert hoặc coi numeric field là money |

Fixture: Request R1 amount100 liên kết Offering O1/O2; R2 amount50 chưa có offering. Root total=2, amount=150; with matching offering=1, amount=100. Group offering O1/O2 có thể cùng hiện100, nhưng grand total phải150 khi giữ unlinked group; không200/250. Chart cần additive partition phải reject overlap hoặc yêu cầu allocation đã định nghĩa. Optional relation filter semantics hiển thị rõ keep root versus require match.

Report version pin model/field refs/semantic revision; run pin authorized snapshot generation + executor version theo existing durable runs. New property thêm bằng metadata rồi adapter validation/compiler; không thêm hard-coded object enum/query case cho từng tenant. Dashboard chỉ tham chiếu saved report version; model upgrade explicit và widgets báo unavailable khi schema/rights không còn hợp lệ. Custom object scope không tự hoàn tất connected Marketing SRC-049.

## 4. Workflow — PLAN-028C cùng PLAN-024B…E

Học cấu trúc Salesforce trigger → criteria → actions; CRM v1 dùng **post-commit asynchronous events**. Salesforce after-save không được coi là bằng chứng cùng transaction với CRM distributed Flow. Before-save field update/validation engine vẫn deferred; runtime bất đồng bộ không được rollback transaction đã commit của người dùng.

Owning service ghi mutation + audit + outbox cùng local transaction; CRM custom records producer, Sales/Chat/Ticket producers riêng. Kafka theo ADR-022/PLAN-024B; event logical gồm tenant/object/record/event ID, operation, committed sequence/schema version, changed property IDs, immutable change-image ref, occurred_at và causation/correlation. Không nhúng transcript/token/record snapshot nhạy cảm vào broad topics. Exact event schema/partition/ACL/retention/activation boundary thuộc PLAN-024B, không tạo event tên tùy ý ở đây.

Create/update trigger và changed-fields criteria chỉ active khi coverage được chứng minh. Enrollment dùng change image tại event, không latest row để suy prior state; modes every qualifying update hoặc transitions into criteria có điều kiện re-entry rõ. Dedup bằng definition/version/event/root; replay không enroll hai lần; per-record ordering/gaps/late arrivals có policy. Causation chain + maximum depth/run budget ngăn A→B→A và self-trigger; numeric limits phải chốt trước source. Không block tất cả events mang actor workflow vì có business chain hợp lệ.

Allowed first-slice nodes: Get record, Find related, bounded Create/Update qua owner commands, Decision, Delay, End; owner assignment chỉ qua Routing/owner guards; message/email/notify chỉ khi adapter/consent ready. Generic CRUD không ghi system attribution/status/owner của standard business objects. Existing Core v1 validator chỉ có subset, create/fault/re-entry là contract extensions cần versioning. Collections cần explicit selection/aggregate; loops/subflow/parallel chưa bật.

Run pin graph, root/schema/manifest/executor version; runtime rechecks current field/record/action rights lúc read/write/resume. Service actor + approved execution scope, không mượn quyền admin thiết kế flow. Durable step/action receipts theo tenant/run/node/target và payload digest; crash sau remote effect dùng operation status/reconcile, không blindly retry. Updates CAS và bounded conflict policy; partial multi-target có từng target receipt, không claim atomicity.

Delay chốt persisted due_at/timezone, date change reschedule/cancel policy, archive/root unavailable và revoke handling; replay timer không double action. Fault connectors phân biệt retryable/terminal/unknown; sanitized run inspector. Debug default dry-run, live test phải explicit command và scope fixture. Definition new version không đổi existing run; enable/disable/activation generation và legacy drain chỉ một starter theo PLAN-024C/E. PLAN-028C phải liệt kê **source runtime prerequisite tasks** trước SRC-076 READY, không coi DONE design là runtime available.

## 5. Compatibility và rollout

Không sửa applied migrations/IDs/data; optional additions forward-only, schema auto-sync disabled. PLAN-028A/B/C phải chỉ ra từng owner schema/table template/index/backfill/rollback strategy và retained fixture tests trước DDL. Existing M1 forms/views, native sessions, saved mock reports, M2 graphs/runs và Alpha data phải mở lại được. Legacy UI chuyển navigation sau E2E gate, không xóa data hoặc regrant roles theo startup. Source release tách khỏi service extraction/live provider cutover.
