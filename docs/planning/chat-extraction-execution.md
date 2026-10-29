# Kế hoạch thực thi Chat: 9 bước và cổng nghiệm thu

**Scope override2026-10-23 / CHG-20261023-19:** [ADR-029](../governance/service-delivery-scope.md) applies to every service. T06 closes Chat APIs/producer/local consumers and required compatibility; T08 accepts that scope on actual runtime. [Other-owner business backlog](chat-extraction/consumer-handoff.md) does not gate Chat. Each T07/T09 rollout lists only changed units with reasons/pins/checks/rollback. Current T01–T09 DONE; D3 Human-first6/6, local3/14, with accepted main post-write recovery. Earlier dated status/stop instructions below are historical; existing authorization through T09 remains, subject to the narrowed gates.

Execution override2026-10-22 / CHG-20261022-02: user requests Chat server through DONE. Continue T05→T09 sequentially in the same workstream, including local cutover/restart/rollback after acceptance; do not stop solely because an older step says to open another thread. Dependency and all six delivery gates remain mandatory. Current catalog14; service count becomes3/14 only after T09. No parallel agents, schedule, production or commit/push.

ADR-027 current orchestration scope: one Workflow service; conversational qualification/routing flows share its run/step/wait model. Any legacy Chatflow consumer in historical source inventories is compatibility, not a service to extract. CHG-20261021-08 retired legacy Chatflow source/data; T06 exposes the Chat boundary for one Workflow owner; Workflow business consumer acceptance is tracked separately and T06 does not rebuild a legacy adapter/drain prerequisite. Historical Workflow evidence remains preserved.


**Phạm vi hiện hành CHG-20261019-23:** [Human-first](human-first-omni-crm.md) áp dụng cho T04–T09. AI Runtime capacity/execution/composition được hoãn; Human parity và bảo toàn trạng thái dùng chung vẫn bắt buộc. Các yêu cầu AI parity trong bảng/prompt cũ bên dưới tuân phạm vi mới này.

Historical execution override2026-10-19 (superseded by 2026-10-22/23): user requests continuing T05. T04 DONE with [Human acceptance](../quality/t04-human-acceptance.md); T05 claimed IN_PROGRESS by Codex2026-10-19. Stop after T05, with T06–T09 still dependency-gated. Preserve local HTTP and Human-first scope; no parallel agents/schedules/automatic commit/push.

PLAN-057, 2026-10-18. Người dùng yêu cầu chia kế hoạch thành từng thread để giữ context. Phạm vi là hoàn thành **SRC-109/D3: Chat có database, quyền truy cập, API/worker độc lập và phục vụ app local**. Catalog hiện hành có14ranhgiới; đây không phải kế hoạch triển khai toàn bộ service. Giữ [sáu cổng nghiệm thu](../contracts/chat-extraction-runtime.md), [chính sách test](../development/testing-policy.md) và toàn bộ tính năng đang chạy.

Historical audit2026-10-22 (OPS issue subsequently closed per tracker): [progress](../tracking/service-progress.md), catalog14/local delivery2, D3 2/6; T01–T04 DONE/T05 partial. OPS-20261022-01 current D2 worker failure must be addressed before next outbound acceptance.

## Cách dùng

1. Mở thread mới trong cùng project/checkout `D:\Work\Labs\agentic-crm`, sau khi thread trước đã dừng và lưu handoff. Workspace đang có nhiều thay đổi chưa commit; thread mới không được dùng checkout sạch rồi bỏ qua chúng.
2. Copy prompt của bước tương ứng bên dưới. Agent đọc file kế hoạch của bước, [tracker](../tracking/tasks.md), [checkpoint](../tracking/checkpoint.md) và [handoff](../tracking/chat-extraction-handoff.md). Repo là nguồn chuẩn; không cần copy lịch sử chat dài.
3. Mỗi bước T01…T09 có scope và evidence/handoff riêng. Theo override hiện hành, tiếp tục các bước tuần tự trong cùng workstream qua T09 sau dependency gates; không tự mở thread khác. Nếu chưa đạt acceptance thì tiếp tục **cùng bước**, không tăng tỷ lệ bằng việc đánh DONE phần nhỏ.
4. Chỉ một thread triển khai active; không agent song song, lịch nền, tự commit/push. Quyết định kỹ thuật trong scope được tự chốt theo change control. Nếu phát hiện thay đổi nghiệp vụ thì ghi rõ discrepancy trước khi thực hiện phần phụ thuộc.

Chín thread là chín phạm vi bàn giao, **không cam kết mỗi thread chỉ một lượt chat**. T04–T06 có nhiều integration nhất; nếu dài thì lưu handoff trong cùng bước. Không mở thêm chuỗi task helper chỉ để ghi tiến độ.

## Thứ tự và đầu ra

| Thread | Dependency | Đầu ra phải bàn giao | Cổng D3 có thể đạt lũy kế |
|---|---|---|---|
| [T01 — Contract ranh giới](chat-extraction/01-contracts.md) | SRC-108 DONE; dùng audit SRC-109 | Exact API/events/authority/saga cho các capability còn thiếu, compatibility và failure cases | 0/6; phần contract của D3-01 |
| [T02 — Schema và kế hoạch chuyển dữ liệu](chat-extraction/02-data-design.md) | T01 DONE | Đủ table templates, ledger partitions, grants, backfill/fencing/reverse replay | 1/6 khi toàn D3-01 đạt |
| [T03 — Database và migration chạy thật](chat-extraction/03-database.md) | T02 DONE | Own DB/role, immutable migrations, retained backfill/resume/reconcile được kiểm thử | 2/6 |
| [T04 — Registry, quyền và ownership](chat-extraction/04-ownership.md) | T03 DONE | Chat sở hữu record/version/ACL/owner; assignment/takeover qua boundary thật | 2/6; phần D3-03 |
| [T05 — Messaging và workspace](chat-extraction/05-messaging-workspace.md) | T04 DONE | Ingress/history/outbound/Contact/notes/workspace/session dùng Chat DB và owner APIs | 2/6; phần D3-03 |
| [T06 — Chat producer và local consumers](chat-extraction/06-consumers.md) | T05 DONE | Chat APIs/events/inbox/scanners, required compatibility và old Chat writer fence inventory; other-owner nghiệp vụ bàn giao riêng | 3/6 khi toàn D3-03 đạt |
| [T07 — Runtime và image độc lập](chat-extraction/07-runtime.md) | T06 DONE | Chat API/worker image, own configuration/grants, lifecycle/metrics, không domain import khác | 4/6 |
| [T08 — Nghiệm thu đầy đủ tính năng](chat-extraction/08-parity.md) | T07 DONE | Composed candidate đạt Chat-owned và required compatibility trong matrix, producer boundary/local consumer recovery; other-owner backlog riêng | 5/6 |
| [T09 — Chuyển traffic local](chat-extraction/09-cutover.md) | T08 DONE | Main local single writer, reconcile, restart, rollback/reapply và lưu runbook | 6/6; **3/14** |

Các số trên là **đích có điều kiện**, không phải kết quả đã đạt. Trạng thái thực tế từng bước chỉ ghi tại mục PLAN-057 trong tracker. T01–T08 không tăng con số service phục vụ local; D3 chỉ đóng khi T09 có evidence. Không thay tiêu chí D3-01…06 để khớp số thread.

## Prompt mở từng thread

Copy đúng một dòng; file được chỉ định chứa phạm vi chi tiết và điều kiện dừng.

```text
Thực hiện T01 theo docs/planning/chat-extraction/01-contracts.md trong repo D:\Work\Labs\agentic-crm. Đọc AGENTS.md và handoff, claim bước, hoàn tất contract còn thiếu của SRC-109. Chỉ làm T01; cập nhật tracker/evidence/checkpoint/handoff và báo gate D3 cùng tỷ lệ service trước khi kết thúc.
```

```text
Thực hiện T02 theo docs/planning/chat-extraction/02-data-design.md trong repo D:\Work\Labs\agentic-crm. Kiểm tra T01 DONE và handoff. Hoàn tất thiết kế schema/partition/migration của SRC-109; chỉ làm T02 rồi bàn giao đầy đủ.
```

```text
Thực hiện T03 theo docs/planning/chat-extraction/03-database.md trong repo D:\Work\Labs\agentic-crm. Kiểm tra T02 DONE và handoff. Triển khai database/grants/migration/backfill đã Ready trên môi trường retained phù hợp; chỉ làm T03 rồi bàn giao đầy đủ.
```

```text
Thực hiện T04 theo docs/planning/chat-extraction/04-ownership.md trong repo D:\Work\Labs\agentic-crm. Kiểm tra T03 DONE và handoff. Triển khai Chat registry/quyền/assignment qua owner boundary thật; chỉ làm T04 rồi bàn giao đầy đủ.
```

```text
Thực hiện T05 theo docs/planning/chat-extraction/05-messaging-workspace.md trong repo D:\Work\Labs\agentic-crm. Kiểm tra T04 DONE và handoff. Nối messaging/workspace/session qua Chat DB và owner APIs, giữ đủ capability đã triển khai; chỉ làm T05 rồi bàn giao đầy đủ.
```

```text
Thực hiện T06 theo docs/planning/chat-extraction/06-consumers.md trong repo D:\Work\Labs\agentic-crm. Kiểm tra T05 DONE và handoff. Hoàn thiện Chat producer/local consumers/endpoints và compatibility/fences theo consumer-handoff; không triển khai nghiệp vụ owner khác. Ghi evidence T06 trước khi tiếp tục bước sau theo override hiện hành.
```

```text
Thực hiện T07 theo docs/planning/chat-extraction/07-runtime.md trong repo D:\Work\Labs\agentic-crm. Kiểm tra T06 DONE và handoff. Đóng gói và chạy candidate Chat API/worker độc lập bằng own DB/grants; chỉ làm T07, chưa chuyển main traffic, rồi bàn giao đầy đủ.
```

```text
Thực hiện T08 theo docs/planning/chat-extraction/08-parity.md trong repo D:\Work\Labs\agentic-crm. Kiểm tra T07 DONE và handoff. Nghiệm thu composed candidate theo Chat-owned và required compatibility, producer boundary/local consumer recovery; downstream business E2E không là gate Chat. Ghi evidence T08 trước T09 theo override hiện hành.
```

```text
Thực hiện T09 theo docs/planning/chat-extraction/09-cutover.md trong repo D:\Work\Labs\agentic-crm. Kiểm tra T08 DONE và handoff. Thực hiện chuyển traffic app local sang Chat độc lập theo runbook đã kiểm chứng, gồm single-writer/reconcile/restart/rollback/reapply. Giữ dữ liệu và credentials, không production/commit/push. Chỉ đóng SRC-109 và báo 3/14 khi toàn bộ evidence đạt.
```

## Quy tắc nhận và bàn giao

Trước khi code: kiểm dependency DONE thực tế, xem diff hiện có, đọc contracts/templates của bước. Không chạy lại audit/D2 để lấy lại context; dùng artifacts và source refs, chỉ refresh phần có thay đổi. Kế hoạch này cho phép thực hiện **design** T01; không tự làm các scope thiết kế còn thiếu thành Ready.

Mỗi bước cập nhật đồng phiên: trạng thái/owner/ngày trong tracker, acceptance cụ thể trong `docs/tracking/details/SRC-109.md`, execution log, current checkpoint và handoff. Handoff phải có file thay đổi, working-tree/commit thật nếu có, lệnh đã chạy/result/artifact, schema/image/config reference không chứa secret, service/process đang chạy, phần chưa xong và đúng một next action. Nếu có artifact bị ignore cần giữ trong workspace thì ghi đường dẫn và snapshot hash; không coi Git HEAD là đại diện cho dirty source.

Thư mục artifact đề xuất `artifacts/chat-extraction/t01`…`t09`; **chưa tồn tại/chưa có PASS** cho đến khi bước thực thi. Đường dẫn mới như `services/chat` là target của implementation, không phải package đã sẵn sàng. Kiểm script/package.json/file thật trước mọi lệnh; không đoán flags.

Test theo thay đổi: docs/schema ở T01–T02; native owning DB ở T03; focused + boundary integration ở T04–T06; image/startup ở T07; composed Chat parity theo owner split ở T08; main operations ở T09. Không full E2E mỗi edit, không lặp nguyên suite chỉ vì đổi thread. Required CI/release checks vẫn giữ; nếu candidate thay đổi sau PASS thì chạy lại phần bị ảnh hưởng và ghi rõ evidence nào hết hiệu lực.

## Baseline lịch sử khi lập kế hoạch 2026-10-18

SRC-108 D2 DONE6/6; SRC-109 D3 0/6; packages/local2/17. Main agentic_crm42, Reporting và Connector độc lập; D2 Identity/Chat còn baseline. D1 MySQL không publish13307, dùng network đã ghi trong runbook; TLS leaves D2 có hạn24h, kiểm expiry khi dùng và bảo trì theo contract hiện có, không tự reset config. Latest known runtime/source evidence ở [handoff](../tracking/chat-extraction-handoff.md). Phiên lập kế hoạch không kiểm lại health hoặc thay runtime.
