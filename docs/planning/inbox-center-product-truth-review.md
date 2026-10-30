# Đối chiếu định vị Inbox Center với thiết kế hiện tại

REV-20261030-01 · CHG-20261030-03 · Codex · 2026-10-30. Review tài liệu, không phải nghiệm thu tính năng hoặc phê duyệt schema/lifecycle mới. Nguồn tham chiếu do người dùng cung cấp: [Product Truth v0.4](../product/Inbox_Center_Product_Truth_v0.4.md); giữ nguyên nội dung và tên Caresoft trong nguồn, không đổi thương hiệu repository. Các ghi chú biên tập trong HTML comments không là yêu cầu thực thi.

## Kết luận

Định vị này phù hợp hướng Conversation có pipeline riêng và Lead/Deal tùy chọn, nhưng rộng hơn đề xuất quản lý phễu trước đó. Inbox Center là không gian quản lý nhu cầu, trách nhiệm, công việc, hành động và kết quả xuyên tương tác. Pipeline là một năng lực trong không gian đó.

Điểm cần chỉnh trong cách hiểu trước: **Conversation Object là hồ sơ nhu cầu hoặc phạm vi công việc, không thể mặc định đồng nhất với acquisition session hiện tại.** Product Truth cho phép một nhu cầu tiếp nối qua nhiều kênh và một luồng chat chứa nhiều nhu cầu. Mô hình “Conversation Channel chứa các Conversation” chỉ mô tả một trường hợp, chưa đủ làm quan hệ sở hữu bắt buộc cho mô hình đích.

## Thuật ngữ và ranh giới đề xuất

| Khái niệm | Cách dùng phù hợp tham chiếu | Điều chưa được chốt bằng review |
|---|---|---|
| Inbox Center | Workspace tác nghiệp và điều hành của nhân viên/quản lý; admin cấu hình quyền, views và quy trình | Không tự trở thành một entity hay một service mới |
| Channel Connection | Đầu kết nối doanh nghiệp, ví dụ Messenger Page P | Không đồng nhất với luồng riêng của khách |
| Conversation Channel | Giữ tên người dùng đã chọn cho luồng khách ↔ endpoint cụ thể; giữ lịch sử liên lạc | Một Conversation nghiệp vụ không nhất thiết bị giới hạn trong một luồng |
| Conversation / Conversation Object | Hồ sơ tác nghiệp cho một nhu cầu/phạm vi công việc, có context, trách nhiệm, hành động, tiến trình và outcome | ID, schema, quan hệ với interaction/session/need, liên kết/tách phạm vi và quyền xuyên kênh cần exact design |
| Session | Episode kỹ thuật hoặc lượt xử lý theo contract hiện tại | Không dùng thời lượng chat/provider window làm ranh giới nhu cầu; chưa yêu cầu thêm tầng session mới |
| Pipeline / Stage | Tiến trình của object sở hữu: Conversation, Lead hoặc Deal theo nhu cầu doanh nghiệp | Không thay trạng thái xử lý, nhiệm vụ, trách nhiệm hay bằng chứng outcome |
| Lead / Deal / đối tượng CRM phù hợp | Tạo hoặc liên kết khi nghiệp vụ cần; khách đã có CRM vẫn có nhu cầu mới | Không bắt chuỗi Conversation → Lead → Deal; không tự triển khai Ticket/Order/Booking từ ví dụ trong nguồn |

Nhãn giao diện có thể dùng “Hội thoại”, kèm mô tả “hồ sơ nhu cầu” để tránh hiểu là cửa sổ chat. Đây là đề xuất UX, chưa đổi nhãn runtime. Không cần thêm Inquiry hoặc một object Inbox trùng chức năng chỉ để giải quyết cách gọi.

Ví dụ: khách bắt đầu nhu cầu A từ Ad A trên Messenger Page P rồi tiếp tục cùng nhu cầu qua kênh khác; về nghiệp vụ có thể vẫn là một Conversation nếu có đủ bằng chứng liên kết và quyền truy cập. Sau khi nhu cầu A hoàn thành, nhu cầu B từ Ad B có thể có Conversation/outcome riêng. Hai kết quả được bảo toàn. Một CTM click mới chỉ là tín hiệu nguồn, không tự chứng minh nhu cầu mới. Hai nhu cầu xuất hiện cùng lượt chat cũng không mặc định là một hồ sơ. Đây là tình huống thiết kế, chưa phải hành vi tự động đang chạy.

## Đối chiếu hiện trạng và khoảng trống

| Chủ đề | Hiện trạng theo contract/evidence repository | Hàm ý từ Product Truth |
|---|---|---|
| Đơn vị nghiệp vụ | Persistent `conversation_id` là luồng; acquisition `session_id` là episode. Session có thể có các `session_need` | Cần xác định hồ sơ nhu cầu, session và need liên hệ thế nào; không suy ra quan hệ 1:1 hoặc bắt buộc một schema N:M |
| Vòng đời | Close kết thúc session; inbound hợp lệ sau close tạo session tiếp theo; referral khi active thêm touchpoint | Đóng lượt xử lý và hoàn thành nhu cầu cần được phân biệt. Thiết kế quy tắc tiếp tục cũ/tạo mới, nhiều nhu cầu đồng thời, tách/liên kết và correction |
| Pipeline | Có process version, stage/history theo session; hiện một process head mỗi tenant | Đây là nền tiến trình hiện có, chưa đủ chứng minh pipeline trên hồ sơ nhu cầu xuyên kênh. Configurable Lead/Deal pipelines còn thiếu |
| Outcome | Stage hiện không là Sales result; contract hiện từ chối reserved won/lost stage keys, close reason `agent_closed` | Cần kết quả riêng của Conversation, tách chất lượng xử lý/tiến triển/chuyển đổi/kết quả phía sau. Unknown giữ là unknown; chưa hết thời gian quan sát không là lost |
| Trách nhiệm và bàn giao | Có owner/control/transfer và Sales acceptance trong phạm vi tương ứng | Owner change đơn thuần không chứng minh handoff được chấp nhận; phải quản lý việc đã nhận, việc còn lại và người phụ trách, tránh liên hệ trùng |
| CRM linkage | Có liên kết và hành động Related Lead/Deal; Sales sở hữu kết quả Sales | Tạo/liên kết CRM, bàn giao được chấp nhận và hoàn thành nhu cầu là ba sự kiện riêng. Liên kết kết quả từ owner có bằng chứng; chưa bắt buộc sao chép Sales state hoặc callback vào Chat |
| Công việc và lời hẹn | Chat có thao tác và context; Workflow sở hữu follow-up/recovery orchestration | Cần trải nghiệm next action, due/commitment, việc có nguy cơ bỏ sót và bàn giao liên tục. Không chuyển runtime Workflow vào Chat |
| Workspace | Inbox có các năng lực tác nghiệp; Settings có mục Inbox Center và scaffolds | Tên menu/cấu hình không chứng minh đã giao đầy đủ sản phẩm theo Product Truth |
| Reporting | Có engine/templates và evidence lịch sử; connected policy sau extraction đang trả null cho operations/conversion/stage | Chưa có phễu xuyên owner vận hành hoàn chỉnh. H-Reporting vẫn là scope tích hợp riêng; không lấy dashboard/mock làm bằng chứng |

Nguồn hiện trạng: [identity](../contracts/conversation-identity.md), [session progress](../contracts/session-progress.md), [Customer360](../contracts/customer-360-session.md), [Chat–Sales boundary](../contracts/chat-sales-conversion-boundary.md), [Chat service](../services/chat.md), [Workflow](../services/workflow.md), [Reporting](../services/reporting.md), [Settings](../ux/settings-workspace.md). Đây là đối chiếu tài liệu/current acceptance, không chạy lại runtime trong review này.

## Giữ đủ sáu mục tiêu

Mã G1–G6 dưới đây thuộc Product Truth, khác mã G01–G09 của [capability map nền tảng](../product/capability-map.md). Không thay bộ mã nền tảng.

| Mục tiêu tham chiếu | Nền hiện có / phần cần thiết kế tiếp | Trách nhiệm và kiểm chứng |
|---|---|---|
| G1 — Dữ liệu và hành động | Identity, owner/action controls, context/session/stage là nền; hồ sơ nhu cầu xuyên tương tác chưa được xác lập đầy đủ | Chat/domain owner giữ effect; Identity giữ authority, Object Platform giữ metadata trong scope. Đánh giá thao tác hợp lệ và context/quyền được bảo toàn |
| G2 — Điều hành chủ động | Inbox/views, phân công và Workflow có các phần đã nghiệm thu; chưa chứng minh end-to-end work/next action/commitment theo Conversation mới | Agent/team lead xử lý đúng việc; Workflow điều phối, domain kiểm tra effect. Đo việc bị bỏ sót, quá hạn và công sức điều hành |
| G3 — Công sức khách hàng/cam kết | Có lịch sử/context; chưa đủ bằng chứng khách không phải nhắc lại xuyên kênh hoặc bàn giao | Đo số lần hỏi lại/đòi tiến độ, lời hẹn được giữ, continuity qua bàn giao; không dùng số tin gửi làm chất lượng |
| G4 — Hiệu quả kinh doanh | Có Sales outcomes trong scope riêng; chưa có baseline lợi ích ròng cho Inbox Center | Sales/owner nghiệp vụ xác minh kết quả; Reporting tổng hợp. Tính cả nhập liệu, kiểm tra, sửa sai, phối hợp và chi phí AI |
| G5 — Cải tiến/Causal ML | AI/Workflow có thiết kế và scoped evidence; không đồng nghĩa đã có học nhân quả hoặc tư vấn tự chủ native | AI Runtime/owner học và đánh giá cần exact scope; lưu context trước quyết định, gợi ý/lựa chọn/hành động thực tế, thời điểm, horizon, đối chứng, nhiễu và bất định. Kiểm chứng khả năng dùng lại theo ngành |
| G6 — Khép vòng marketing | Có nguồn/touchpoint và thiết kế Marketing; chưa chứng minh nguồn → kết quả xác minh → live CAPI đầy đủ | Chat giữ source evidence; Sales/owner xác minh kết quả; Marketing/Connector và Reporting theo hợp đồng riêng. Delivery CAPI thành công khác tác động tăng thêm |

Thiết kế AI từ đầu về dữ liệu, quyền, action và evaluation; chỉ kích hoạt sau khi nền phục vụ người dùng thực và được nghiệm thu theo tham chiếu. Local Human-first acceptance hiện tại không đủ để suy ra điều kiện này đã đạt. Từng tác vụ AI cần so sánh với cùng quy trình không AI trước khi mở rộng. Không biến G5 thành chatbot đơn thuần hoặc bỏ G5/G6 chỉ vì triển khai nền trước.

## Phạm vi thiết kế kế tiếp đề xuất

1. Chốt ranh giới Conversation bằng các scenario: cùng nhu cầu quay lại sau close; nhu cầu mới từ Ad B; nhiều nhu cầu cùng luồng; cùng nhu cầu nhiều kênh; khách CRM cũ có nhu cầu mới. Nêu ai được quyết định liên kết/tách và bằng chứng identity/context cần có.
2. Thiết kế lifecycle, pipeline/stage, next action/commitment, trách nhiệm và accepted handoff. Định nghĩa sự kiện riêng cho CRM linkage và completion; xử lý dừng/hẹn lại/unknown/correction mà không ép thành won/lost.
3. Inventory compatibility: ID/API/events, workflow references/receipts, message membership, session_need, nguồn/history, quyền theo endpoint và reporting grain. Đề xuất phương án lưu trữ sau khi rõ ranh giới; mọi DDL/API change cần design và forward/versioned migration theo governance.
4. Định nghĩa evidence và tiêu chí nghiệm thu G1–G6: nền không AI trước, có dữ liệu đánh giá từ đầu, tích hợp từng owner theo scope. Chưa đặt lịch triển khai hoặc claim tác động kinh doanh.

Đây là đầu vào thiết kế đề xuất, chưa là task source Ready. Không mở lại SRC-109 hoặc biến toàn bộ Product Truth thành dependency của phần Chat đã nghiệm thu; H-Reporting và các consumer khác vẫn nghiệm thu theo owner. FIX-20261027-01 tiếp tục được hoãn theo yêu cầu trước.

## Acceptance của review

- DOC-IC-01: đọc trọn tham chiếu, bảo toàn file gốc, phân biệt nội dung nguồn với đề xuất áp dụng.
- DOC-IC-02: chỉ rõ giới hạn session mapping, cross-channel need, close/completion, ba sự kiện bàn giao/CRM/hoàn thành và unknown outcome.
- DOC-IC-03: bao quát G1–G6, owner boundaries, nền không AI và điều kiện bằng chứng nhân quả; không nâng runtime status.
- DOC-IC-04: đồng bộ cảnh báo ở model/glossary/service/module/planning, kiểm tra docs/links/whitespace; ghi kết quả và working-tree reference tại [execution log](../tracking/log.md).
