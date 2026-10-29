# Review D4 và nhóm image — PLAN-058

**Rollout policy hiện hành CHG-20261023-19:** [ADR-029](../governance/service-delivery-scope.md) yêu cầu liệt kê đúng unit đổi + lý do + pins/checks/rollback; mặc định chỉ service đang bàn giao. Dùng lại dependency tương thích, không rebuild/restart toàn nhóm core hay toàn stack vì producer/consumer liên kết. Snapshot trạng thái ngày 2026-10-19 bên dưới là lịch sử; xem [progress](../tracking/service-progress.md) cho hiện trạng.

Source organization follow-up: [PLAN-059 repository map](../architecture/repository-map.md) (2026-10-21) bổ sung path hiện tại/đích và tiêu chí build/service independence. Review này giữ ý nghĩa deployment grouping; không dùng baseline core group làm source layout cuối cùng cho các owner. Số 17 và snapshot vận hành ngày 2026-10-19 bên dưới là lịch sử; catalog hiện tại có 14 boundaries theo ADR-027.

2026-10-19 · Codex · CHG-20261019-03. Review tài liệu, source và inventory Docker; không triển khai source/runtime. Áp dụng ADR-023, giữ hướng đích ADR-017/022. [Trạng thái chuẩn](../tracking/tasks.md), [tiến độ](../tracking/service-progress.md).

## Kết luận

D4 là mốc **chọn phạm vi Workflow/AI có lợi ích vận hành cụ thể**, không phải service thứ tư hay nhóm chứa toàn bộ phần còn lại của 17 services. D4 chưa có exact Ready scope, task triển khai hoặc ETA. D3/SRC-109 mới là việc đang active: T01–T03 DONE, 2/6 gates; T04 chưa bắt đầu. Hai service đã tách phục vụ local là Reporting và Connector; Chat mới có owning test storage, chưa cutover.

Không cần tách Identity, CRM, Sales và mọi module core thành image riêng lúc này. ADR-023 đã cho phép chung deploy group khi còn transaction/policy coupling. Tách image không tự tạo data authority hoặc release độc lập; API/worker có thể chạy container riêng từ cùng image. Không gộp lại database của Reporting/Connector hay bỏ các gate Chat đang thực hiện.

## 17 ranh giới thuộc nhóm nào?

Các nhóm sau phục vụ báo cáo và lựa chọn triển khai; không biến nhóm thành một service/data owner mới. Mỗi catalog entry xuất hiện đúng một lần. ADR-027 gộp Workflow thành một service và bỏ Chatflow; UI là component, không catalog service.

| Nhóm | Ranh giới trong catalog | Số | Quan hệ với mốc |
|---|---|---:|---|
| Backend core/platform | Identity, CRM Core & Metadata, Sales, Routing, Ticket, Operations, API Gateway & Workspace BFF | 7 | Phần đã có tiếp tục baseline API/worker; Ticket và phạm vi Draft không được xem là đã chạy |
| Messaging | Connector, Chat, Media | 3 | D1/D2 hoàn tất phạm vi Connector; D3 tách Chat; Media giữ backlog/gate riêng |
| Automation/AI | Workflow, AI Runtime | 2 | Một Workflow cho mọi flow; AI Runtime thực thi bounded inference/tools |
| Reporting | Reporting & Analytics | 1 | Đã có image/schema/local runtime riêng |
| Marketing | Marketing | 1 | Backlog riêng; thư viện/storage không đồng nghĩa daemon đã triển khai |
| Tổng | Current responsibility catalog after ADR-027 | 14 | Không phải mục tiêu14images hoặc tỷ lệ hoàn thiện; số triển khai thực tế không tăng |

## Image/source và runtime thực tế

| Nhóm image | Source / cấu hình | Vai trò runtime | Trạng thái |
|---|---|---|---|
| Web | apps/web; Dockerfile target web; compose.yaml: agentic-crm-web:local | Một Next.js app chứa các màn hình, gồm Workflow CMS | Có cấu hình image; docker ps phiên này không có container web. Local host18080 là topology đã ghi nhận, chưa probe lại |
| Backend core | services/core-baseline; target backend hoặc backend-runtime; compose.yaml: agentic-crm-backend:local | API3001 và worker3002 dùng cùng image; D2 Identity3012, Chat3013, coordinator3015 dùng cùng OUTBOUND_BACKEND_IMAGE với command khác | Ba container D2 đang healthy, cùng image ID01476af4e863; vẫn cùng baseline data/release boundary |
| Connector | services/crm-connector; target connector; compose.connector*.yaml và compose.human-outbound.yaml | API3010, ingress worker3011, dispatch3014 | API/worker cùng image IDc2f78a186c94; dispatch dùng candidate58ab68ad7b40. Đây là hai revision của cùng nhóm service, không phải ba service |
| Reporting | services/reporting; target reporting; compose.reporting.yaml | HTTP3004 | agentic-crm-reporting:local healthy |
| Chat đích | services/chat hiện có package/storage; T07 mới đóng runtime/image | API/worker Chat riêng sau owning adapters | Chưa có Docker target Chat; container D2 tên chat không phải Chat extraction |
| Workflow/AI đích | packages/workflow-definition hiện là validator; execution hiện có còn baseline | Chưa có daemon/image độc lập cho D4 | Chưa Ready; không đóng gói thư viện rồi tính thành runtime |

[Dockerfile](../../infra/docker/Dockerfile), [Compose chính](../../compose.yaml), [D2 Compose](../../compose.human-outbound.yaml). Một Dockerfile multi-stage có nhiều target không có nghĩa tất cả là một image. Ngược lại, nhiều container từ cùng image không phải nhiều service độc lập. MySQL/Redis/nginx thuộc hạ tầng; nginx routing trong Compose chưa chứng minh target Gateway/BFF nghiệp vụ đã tách.

Inventory read-only `docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'` ngày2026-10-19: 10 container, tất cả Docker health healthy; 7 app processes +3 hạ tầng (2 MySQL,1 Redis). Không có web/public API/legacy worker container trong snapshot. Đây không phải kiểm thử traffic/khả năng nghiệp vụ. Docker read ban đầu bị sandbox chặn; đọc lại với quyền read-only được chấp thuận và thành công.

## Vì sao chậm và thay đổi cách đo

1. **Mục tiêu báo cáo bị lẫn:** 2/17 chỉ đo extraction; D2 đã thêm luồng gửi bền vững nhưng tỷ lệ vẫn đứng yên. Báo delivery gates/capability trước, số image/service sau. Giữ số lịch sử, không đổi mẫu số để làm đẹp.
2. **D3 là di chuyển dữ liệu và quyền của một domain lớn:** T01 có181operations/515schemas, T02 có117table reviews, T03 có59bảng Chat/43FK nội bộ. Đây là bằng chứng phạm vi lớn, không phải chỉ viết Dockerfile. Chưa có timing đủ để kết luận test là nguyên nhân chính.
3. **Kết quả chạy nằm cuối chuỗi:** T04 ownership → T05 workspace → T06 consumers → T07 image → T08 parity → T09 cutover. Số substep DONE chưa tạo thêm service phục vụ local. Handoff từng thread là lựa chọn người dùng hiện hành; không tự bỏ hoặc mở agent song song.
4. **Phân mảnh cơ chế trước composition:** review PLAN-056 đã ghi15task SRC-092…106 không thêm local service, build/harness lặp. Áp dụng focused tests theo thay đổi, boundary integration khi ghép, composed acceptance khi candidate hoàn chỉnh; không lặp full suite/build trên cùng revision không đổi. Giữ required CI/security/tenant/recovery checks.

## Đề xuất triển khai gọn

- Giữ bốn nhóm image ứng dụng đã có cấu hình: **web, backend core, connector, reporting**. Hoàn tất D3 sẽ thêm **chat** thành nhóm thứ năm; đây là số nhóm đóng gói ứng dụng, không phải service extraction5/17. Chưa gọi toàn bộ năm nhóm là đang chạy Docker.
- Core API và worker dùng cùng artifact theo revision, chạy process/container riêng khi cần scale/lifecycle. Không mở task tách Identity/CRM/Sales/Routing/Operations chỉ để tăng số image. Build backend-runtime đã tránh rebuild web ở D2; tận dụng đường build này, không tạo framework packaging mới.
- Hoàn tất D3 trong scope đã chốt, tận dụng D1/D2 transport/registry và T01–T03 evidence. Không viết lại phần DONE hoặc chạy lại toàn bộ nếu input không đổi. Runtime/single-writer/rollback vẫn là gate bắt buộc; T04 chưa được claim bởi review này.
- D4 chỉ chọn **một đầu ra**: Workflow execution phục vụ nhu cầu automation cụ thể hoặc AI execution cần cô lập latency/failure/quota. Chưa có benchmark/incident/release evidence đủ để tự chọn một trong hai. Đưa nhu cầu, boundary, schema/contracts và acceptance vào một delivery scope trước khi code; không mở đồng loạt bốn service.
- Workflow là một service sở hữu authoring/execution trong crm_workflow; UI/API/engine/worker là components có thể scale riêng. Không giữ API/Core activation saga hoặc Chatflow engine riêng. AI Runtime giữ authority thực thi provider/tools, không business flow engine.

Tiêu chí duyệt một image/service mới: có nhu cầu scale, failure, security hoặc release độc lập cụ thể; scope owner/API/data Ready; vận hành và migration/recovery nghiệm thu được. Nếu thiếu, giữ module trong nhóm hiện tại. Không đưa ETA giả khi chưa có throughput các bước còn lại.

Acceptance review: REV-01 giải thích D1–D4 và số17; REV-02 đối chiếu source/Compose/Docker thực tế; REV-03 khuyến nghị nhóm core và D4 theo ADR; REV-04 đồng bộ tracker/build plan/topology/progress/log/checkpoint, kiểm docs/whitespace. Runtime suites, image build, migration và traffic acceptance NOT_RUN trong review này; evidence cũ chỉ là tham chiếu.
