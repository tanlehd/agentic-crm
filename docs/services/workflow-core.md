# Workflow Core — execution engine

SRC-065 implements [pure authoring kernel](../../services/workflow-core/README.md) and typed node catalog; [evidence](../tracking/details/SRC-065.md). No runtime/server/database entrypoint yet; valid drafts always executable=false. Architecture below remains target for future execution slices.

PLAN-024 / ADR-022, 2026-10-13. Architecture Ready; exact Kafka/runtime/action/DDL contracts thuộc PLAN-024B/C/D. Proposed deploy unit `workflow-core`, NestJS/TypeScript; private schema `crm_workflow_core`, API/consumer/scheduler/worker entrypoints của cùng service. Chưa có service độc lập deployed.

## Trách nhiệm và data authority

Nhận immutable artifact từ Workflow API; giữ installed artifact, active generation, Kafka inbox/evaluation work, enrollment guard/selection, durable run/step/wait/timer, cancellation requests, action/per-target receipts và attention/reconciliation. Không đọc definition DB hoặc business DB của service khác. Shared CRM metadata là refs/revisioned manifest, không canonical copy tự sửa.

Node registry versioned, typed bindings, graph validation và capabilities handshake; worker chỉ thực thi version đã install. Actor/role pin xác định intent; current Identity + owning service rights quyết định effect. Bảy primitive M2 được map/adapt có test, không import shared TransactionScope qua network.

## Execution contracts

Kafka at-least-once commit offset sau durable inbox; producer authority/schema/tenant/digest verification, contiguous offset progress, ordered per-record change evaluation và DLQ/replay. [Architecture](../system/workflow-architecture.md) định nghĩa no blind re-enrollment, event-before-wait, guard chống workflow cycle, action identity, batch partial và remote unknown.

Internal commands install/activate/disable/cancel có tenant+caller+operation id/digest; expected deployment generation/run version. Runtime read/current record ACL; operation status phục vụ API reconcile. Owner actions qua typed query/command/status APIs. Network ngoài SQL transaction. Receipts/fencing bảo vệ Core; owner API vẫn phải enforce CAS/idempotency và live admission tại effect.

## Vận hành và migration

MySQL timer/recovery là source of truth, Redis chỉ optional wakeup. Scale Kafka consumers theo partitions, execution workers theo run leases/quota; fairness tenant, graceful drain và restart fenced. Metrics lag/oldest event, due timer lateness, retries, unknown receipts, step/run outcomes. DLQ replay có audit, giữ event/action identity, không tự repeat sends.

Mọi bảng business/system có tenant_id NOT NULL; own grants/journal; physical fields/indexes/retention/migration/templates chưa Ready. API→Core transport auth audience/scopes/TTL/replay protection phải chốt ở PLAN-024C, không tin header tenant đơn lẻ.

Legacy M2 runs drain ở monolith; single starter theo definition generation, shadow không side effects, in-flight Core runs không copy ngược monolith. [Plan](../planning/workflow-platform.md) và [WF-04…13/15](../quality/workflow-platform-acceptance.md) là release gate. Kafka/independent engine/provider/HA/load tests NOT_RUN, không dùng evidence SRC-019 thay bằng chứng distributed execution.
