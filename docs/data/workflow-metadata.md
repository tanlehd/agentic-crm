# Shared CRM Base metadata cho Workflow

PLAN-028 bổ sung [shared entity lifecycle/consumer bindings](no-code-entity-model.md) và [report/workflow integration direction](../contracts/no-code-object-platform.md). Canonical IDs/owner giữ nguyên, structural manifests và authorized catalog views tách ở contract mới; v1 combined revision không bị diễn giải lại. No runtime changes.

PLAN-024A/SRC-065: [exact catalog/binding contract](../contracts/workflow-catalog.md) and native discovery now implemented. Existing CRM object/property/association data only; no new tables. [Evidence](../tracking/details/SRC-065.md). Owner query/execution capabilities remain explicit and change-image/Kafka unavailable until following gates.

PLAN-024 · 2026-10-13. Ready về ownership/semantic direction; exact API/schema và physical tables thuộc PLAN-024A/C. Không thêm/sửa bảng hoặc migration trong tài liệu này. [Architecture](../system/workflow-architecture.md) · [existing registry](../contracts/registry.md) · [record types](../contracts/crm-records.md).

## Canonical catalog

Object model, thuộc tính và association phải dùng cùng identifiers với CRM Base. Không tạo workflow_object_type/workflow_property_definition làm schema master thứ hai. Workflow chỉ sở hữu graph, binding và immutable metadata manifest cần cho version đã publish. Reporting có semantic metrics/projection riêng; không dùng Reporting mock catalog thay CRM canonical schema.

| Descriptor | Nguồn chuẩn | Nội dung Workflow cần |
|---|---|---|
| ObjectType | CRM object registry, với domain capability do owner công bố | Stable id/key, label, standard/custom, owner_service, catalog_revision, read/query/command/event capabilities |
| Property | CRM property definitions + registered standard domain fields | id/key, object ref, type/options/nullability, read/filter/write flags, indexed/query operators, immutable/reserved/sensitive classification |
| AssociationType | CRM association metadata | id/key/label, source/target object, direction, cardinality, labels, max traversal capability |
| BusinessCommand | Owning CRM/Sales/Chat/Ticket capability registry | Name/version, input/output schemas, supported transitions, expected revision, scopes, idempotency/status contract |
| EventCapability | Owning producer manifest | Event/schema version, create/update/archive coverage, changed field coverage, change-image and sequence/replay support |
| Policy | Native Identity + owning service | Current actor/action/record scope, field read/filter/write deny, owner revision, consent; schema visibility không là grant |

Standard domain fields được đăng ký bởi owner qua CRM catalog contract; CRM không được sửa business state machine. Custom properties cho external aggregate lưu/value/index tại owning service sau extraction, metadata canonical ở CRM; không cross-service SQL. Association instance dùng refs `{tenant,service,object_type,record}`; generic navigation phải validate cả hai đầu và relation status.

## Chọn data model trong CMS

1. Chọn enrolled object từ CRM descriptor API; chỉ hiển thị trigger có producer capability Ready.
2. Thêm related object bằng association type/label/chiều. Cho thấy one/many ngay trong picker; một field trên collection không được coi là scalar.
3. Chọn thuộc tính từ cùng CRM metadata renderer. Bỏ field bị deny; không tạo dropdown field hard-coded trong Workflow Web.
4. Bật operator theo type/index/capability. Bound path ban đầu tối đa 3 hops; query chưa hỗ trợ traversal thì UI báo unavailable, không giả là một API đang có.
5. Chọn target `root`, `one_related` hoặc `selected_collection`; one_related có zero/multiple outcome rõ, không tùy tiện lấy record đầu. Multi-target phải có explicit sort/limit và overflow error.

`RecordRef` gồm tenant_id, owner_service, object_type_id, record_id; `PropertyRef` gồm object_type_id, property_id, catalog_revision; `RelationPath` gồm association_type_id, direction, optional label và cardinality ở từng hop. Không bind qua display label hoặc free-text SQL/JS. Exact serialized shape/UUID semantics ở PLAN-024A, không dùng pseudo IDs trong architecture làm contract fixture.

Registry extensions không thay đổi M1 property types: string/text/integer/decimal/boolean/date/datetime/enum. Entity refs và collection là binding types, không tự thêm field type vào CRM. Currency là coupled amount+currency; comparison khác currency lỗi. Null, absent, archived và forbidden là trạng thái khác nhau; forbidden không trở thành null làm bypass branching.

## Versioning và authorization

API lưu catalog revision + manifest digest trong published version. Core pin manifest cho type checking/replay nhưng revalidate live rights tại query/dispatch. Cache key tenant+catalog revision+authorization revision+actor/scope; tenant switch clear Web cache. Stale/missing revision → refresh/fail closed, không dùng metadata tenant khác.

Rename label giữ ID, không phá binding. Property/relation removal/type change hoặc capability removal block publish mới, tạo impact report cho active versions; không tự rewrite graph published. Run đã pin vẫn phải chặn write bị owner từ chối. PLAN-024A định nghĩa retain/deprecate manifests đủ cho run retention; bản snapshot không giữ quyền đã thu hồi.

Search áp row scope và field filter ACL trước pagination; không leak hidden count hoặc sort denied fields. Update kiểm lại target membership/relation policy và current target permissions; đã từng tìm thấy không nghĩa còn được sửa. Core input/output traces sanitize theo current viewer field ACL. External refs unresolved/forbidden không auto-create canonical records.

## Logical data ownership, chưa phải physical table catalog

| Logical state | Writer / target schema | Constraint cần chuyển thành DDL ở PLAN-024C |
|---|---|---|
| Draft/definition/immutable version, publish request/audit | Workflow API / crm_workflow | Tenant+definition key; version monotonic; draft CAS; artifact checksum; immutable published content |
| Installation artifact/receipt, active deployment generation | Workflow Core / crm_workflow_core | Tenant+version+digest identity; expected generation CAS; one active pointer |
| Event inbox/evaluation cursor, enrollment selection/guard | Core | Tenant+producer+consumer+event uniqueness/digest; per-record sequence; unique definition/root active guard |
| Run/step/wait/timer/cancellation | Core | Version/executor pin; fenced step commit; persisted due_at; terminal CAS |
| Action/target receipt, delivery/reconciliation work | Core | Tenant+run+node+target stable key; request digest; remote operation status |
| Catalog cache / bindings | Consumer-local, rebuildable | Canonical refs/revisions only; no second metadata master or auth authority |
| Outbox/inbox/audit/journal | Mỗi owning service độc lập | Atomic local effect; append-only audit; business/system scope tách explicit |

Tất cả application tables tương lai bắt buộc tenant_id NOT NULL; journal dùng registered system tenant, không wildcard/default. Không FK API↔Core hoặc sang CRM/Identity. Không đưa bảng legacy workflow_run sang schema mới bằng rename DB rồi gọi đó là extraction. [Schema catalog](schema-catalog.md), [DB guideline](database-guidelines.md), [table template](../templates/database-table.md) phải được điền **cho từng bảng** với fields/keys/indexes/retention/grants/migration/test fixtures trước DDL; bảng trên chỉ chốt logical ownership.

Legacy dictionary vẫn mô tả monolith hiện tại. Migration map từng legacy entity/ID, manifest history, trace redaction/retention và replay tombstones sẽ được chốt ở PLAN-024C/E; không sửa applied history, không reset dữ liệu synthetic.
