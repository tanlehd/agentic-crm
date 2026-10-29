# Nghiệm thu và triển khai theo trách nhiệm service

Ready — ADR-029 / CHG-20261023-19, 2026-10-23. Áp dụng cho mọi service trong [catalog](../services/README.md), theo yêu cầu người dùng: nghiệm thu đúng owner, tránh triển khai lan sang service khác. Bổ sung [PLAN-056](../planning/service-delivery-reset.md), giữ các boundary ADR-017/023/027/028.

## Điểm kết thúc trách nhiệm

| Phần bàn giao | Điều kiện nghiệm thu của owner | Phần do owner khác nghiệm thu |
|---|---|---|
| API/query/command | Runtime thực nhận request, kiểm tenant/quyền/schema, commit state/receipt hoặc trả trạng thái pending/error đúng contract; replay/CAS/recovery phù hợp | UI hoặc nghiệp vụ riêng của caller; không suy command đã thành công từ một event đã phát |
| Event producer | Mutation và outbox atomic; đúng schema/version/key/tenant; relay thực tới transport đã chọn, ACK theo contract, retry/restart/replay giữ identity và ordering; theo dõi backlog | Consumer xử lý nghiệp vụ, projection, workflow, report hoặc side effect của service nhận |
| Consumer thuộc service đang bàn giao | Inbox/dedup, effect cục bộ, recovery và semantics ACK của chính consumer đó | Producer hoặc các consumer khác triển khai toàn bộ nghiệp vụ của họ |
| Service extraction | Own storage/credentials/API/worker cần thiết, không remote SQL/UoW/domain import; compatibility, single writer, migration/reconcile và cutover/recovery có evidence | Tách image/DB, hoàn thiện tính năng hoặc rollout các service liên quan chỉ vì có kết nối |

Với Kafka đã được chọn và triển khai cho luồng tương ứng, producer hoàn tất khi phát bền vững và broker xác nhận theo contract; **không đợi consumer hoàn tất nghiệp vụ**. Một lời gọi publish chưa chứng minh atomic outbox hoặc recovery. Không tự cài/chuyển broker để đủ checklist: mỗi stream giữ transport đã được chốt. Chat D3 hiện dùng [HTTP outbox bridge](../contracts/chat-owner-v1.md), Kafka object-change vẫn có gate riêng.

HTTP bridge hiện chỉ ghi delivery acknowledged khi có terminal receipt theo wire contract; không đổi `pending` thành `applied`. Nghiệm thu producer có thể dùng receiver kiểm contract có durable inbox/status và fault injection, ghi rõ đó là boundary test. Receipt của receiver này không được dùng để ACK subscription nghiệp vụ thật. Subscription chưa triển khai vẫn giữ backlog/position/trạng thái thật, không chặn producer DONE chỉ vì consumer chưa hoàn tất. Consumer runtime thực và kết quả nghiệp vụ được ghi ở backlog của owner nhận.

## Dependency thực sự chặn service

Chỉ đưa dependency vào gate nếu thiếu nó thì một API/command đang bàn giao không thể đáp ứng contract, quyền/dữ liệu bị sai, hoặc còn writer cũ có thể phá single writer. Ghi operation/invariant bị ảnh hưởng và thay đổi tối thiểu cần thiết. Dùng API baseline đang tương thích; không buộc dependency phải được extract trước.

Luồng đồng bộ như assignment, gửi tin, ghi note hoặc link outcome phải trả đúng kết quả/receipt đã công bố. Bảo toàn đường tương thích đang dùng và các effect đã phát sinh; không dùng việc thu hẹp scope để làm mất chức năng đang phục vụ. Chỉ sửa adapter/fence cần cho chuyển owner, không mở rộng nghiệp vụ của dependency. Feature mới hoặc consumer chưa triển khai có owner/backlog riêng, trạng thái rõ; không tuyên bố end-to-end PASS khi chưa chạy.

## Phạm vi triển khai tối thiểu

Trước mỗi rollout, runbook ghi một bảng ngắn: **unit thay đổi, lý do bắt buộc, source/image/config/schema pin, lệnh tác động đúng unit, kiểm tra và rollback**. Mặc định chỉ service được bàn giao cùng API/worker của nó. Chỉ thêm BFF/router, compatibility adapter hoặc writer fence nếu thay đổi thực sự cần cho đường chuyển; ghi rõ từng unit. Runtime dependency tương thích đang chạy được tái sử dụng, không rebuild/restart hàng loạt.

Không chạy lệnh deploy/up/build toàn stack để bàn giao một service. Với Compose, chọn service cụ thể và dùng `--no-deps` khi các dependency cần thiết đã chạy/tương thích; kiểm file/script thật trước khi dùng. Nếu cần khởi động dependency còn thiếu, liệt kê chính xác dependency đó. Cùng image baseline không có nghĩa phải restart mọi process dùng image. Rollback chỉ tác động tập unit đã đổi và các effect liên quan đã được runbook chỉ rõ.

## Báo cáo và kiểm thử

Phân biệt **producer/API accepted**, **service phục vụ runtime đã bàn giao**, **consumer/business integration của owner khác**. Một service không đợi tất cả consumer mới DONE; cũng không được tính là đã deploy từ source hoặc contract test. Scope hẹp hơn không tự đổi trạng thái gate hay cộng số service.

Áp dụng [testing policy](../development/testing-policy.md): focused contract/integration tại boundary; composed acceptance cho hành vi của service đang bàn giao và dependency trực tiếp cần thiết. Whole-system E2E là mốc tích hợp riêng với owner, scope và evidence riêng. Required CI/security/recovery checks giữ nguyên. Với Chat xem [T06](../planning/chat-extraction/06-consumers.md) và [bàn giao consumer](../planning/chat-extraction/consumer-handoff.md).
