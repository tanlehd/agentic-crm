# Workflow platform acceptance — PLAN-024

SRC-0652026-10-13: WF-01/02/07/13 **catalog and pure validator sub-scopes** now tested:325 unit/8 native groups; [evidence](../tracking/details/SRC-065.md). The full runtime scenarios below remain NOT_RUN: no new execution/producer/Kafka/canvas or provider delivery claim.

2026-10-13. Scenario design Ready; **toàn bộ runtime checks dưới đây NOT_RUN** cho Web/API/Core/Kafka mới. Evidence SRC-019/020/021 chỉ chứng minh baseline M2. [Architecture](../system/workflow-architecture.md) · [Plan/gates](../planning/workflow-platform.md).

| ID | Scenario và kết quả phải chứng minh | Gate |
|---|---|---|
| WF-01 | Contact/Lead/Deal và custom Appointment dùng cùng CRM object/property/relation IDs trong CRM UI và Workflow; đổi label giữ binding; không có schema master riêng | A |
| WF-02 | Graph sai type, reference nhánh không dominator, cycle, thiếu default/timeout, field archived, node adapter unavailable hoặc traversal vượt bound đều bị chặn publish; draft thiếu vẫn lưu được | A/C |
| WF-03 | Two publishers race: chỉ expected generation hợp lệ active; crash sau Core install/activate trước API ACK reconcile cùng operation; new version không đổi run đang wait | C |
| WF-04 | Owner commit trước relay crash, Kafka duplicate/consumer restart/rebalance, DB commit trước offset: đúng một selection/run; digest conflict quarantine; không commit offset vượt item chưa durable | B |
| WF-05 | Event sequence 8 tới trước7: lưu/reconcile7 rồi evaluate theo sequence; before/after đúng change_ref dù current record đã đổi; retention gap/unknown schema → attention, không enrollment suy đoán | B |
| WF-06 | only_when_entering, disabled selection, active-run guard xuyên version, re-enroll off/on, old event sau activation và replay; action→event self-cycle/multi-workflow cycle dừng theo bounded policy | B |
| WF-07 | one/many/zero related records, relation label/direction, hidden record/field, duplicate association paths, pagination/overflow; update dùng exact target set và ổn định từng action key; không cross-service SQL | A/D |
| WF-08 | Human sửa record sau search → CAS conflict không overwrite; batch target1 thành công/target2 lỗi → partial receipts và attention; retry không gửi lại target1 hay tìm tập target mới | D |
| WF-09 | Kill worker sau remote commit trước local receipt → query/retry cùng key một effect; stale fence không complete; permission revoke/cancel in-flight ghi đúng outcome thực, không hứa undo | C/D |
| WF-10 | Delay sống qua process restart/Redis outage, due_at UTC không drift qua retry; until date quá hạn resume một lần; early wait signal, timeout race và cancellation chỉ một transition | D |
| WF-11 | Routing Human/AI eligibility/capacity/current owner CAS, no eligible queue; Sales transition qua owner; service actor không làm owner; follow-up task giữ đúng root/assignee/due refs | D |
| WF-12 | Message/email/notify dùng adapter thật trong scope test; accepted/delivered/unknown khác nhau; lost ACK không resend mù; consent/channel window/suppression/revoked sender block; no token/body ở Core audit; Kafka outage không mất DB timers | B/D |
| WF-13 | Hai retained synthetic tenants, actor revoked, record own/team/all, field deny cả read/filter/write, cross-tenant event/ref/template, service audience/replay/expiry, current ACL khi xem run; không đổi quyền account có sẵn | A/C/D |
| WF-14 | Browser tạo graph từ catalog → save/reopen → validate → publish/reconcile → actual run timeline; stale ETag, API errors, tenant switch, keyboard/list/mobile, unavailable nodes, cancel/disable semantics; không static fake runtime | E |
| WF-15 | Legacy M2 graph/API vẫn chạy, legacy waiting runs drain; definition cutover chỉ một starter; shadow không effects; rollback không repeat effect; forward migration/checksum/IDs/data giữ; broker/DB restore với receipts/watermarks và tenant isolation | C/E |

Integrated follow-up scenario dùng Lead đủ điều kiện → related Deal search → routing hoặc allowed property update → durable delay → fresh check → one permitted message/email → internal notify. Cases riêng cho no related record, already followed up, removed association, Human takeover, no consent, unavailable provider, permission revoke, duplicate event và partial update. Mock adapters chỉ chứng minh engine contract; live send cần evidence provider riêng, không test bằng dữ liệu bệnh nhân/transcript thật.

Mỗi implementation slice ghi command, Node/MySQL/Kafka/client versions, environment, result counts, artifact/log refs và coverage limitations. Giữ tenant/user synthetic qua lần chạy; no DB/Redis reset mặc định. Load/soak/HA/restore thresholds chốt ở E trước release; không ghi PASS từ document review.
# SRC-066 scoped evidence

[M2 CMS release](../tracking/details/SRC-066.md) covers WF-14 sub-scope: real save/reopen, graph editing, native CAS/revoke/tenant negatives and desktop/mobile. The eleven-node CRM/Kafka/distributed Web/API/Core acceptance below remains open; no full WF-14/15 completion claimed.
