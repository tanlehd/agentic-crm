# Conversation Channel và Conversation — mô hình thuật ngữ sản phẩm

DOC-20261030-02 · CHG-20261030-02 · 2026-10-30. Người dùng chọn **Conversation Channel** thay tên Thread trong mô hình Conversation Channel → Conversation. Ready cho định nghĩa sản phẩm; chưa Ready cho đổi API/schema hoặc thay đổi ranh giới lifecycle. [Glossary](../product/glossary.md) dùng tên mới; [current wire identity](conversation-identity.md) giữ mapping của source đang chạy.

CHG-20261030-03: [Review Product Truth](../planning/inbox-center-product-truth-review.md) chỉ ra giới hạn của mô hình hai cấp trước đó. Tham chiếu mô tả Conversation là hồ sơ nhu cầu/phạm vi công việc có thể tiếp nối qua nhiều kênh. Các tên đã chọn được giữ; quan hệ sở hữu và mapping aggregate đích cần exact design, chưa Ready chỉ từ việc đổi tên.

## Định nghĩa và phạm vi

| Khái niệm | Vai trò |
|---|---|
| Channel / Channel Connection | Kênh hoặc kết nối doanh nghiệp, ví dụ Messenger của Page P; dùng để tiếp nhận liên lạc của nhiều khách. Không phải thread của một khách |
| Conversation Channel | Luồng liên lạc xuyên suốt giữa một danh tính khách và một kênh/đầu kết nối doanh nghiệp cụ thể trong tenant, ví dụ khách A ↔ Messenger Page P; giữ lịch sử nhiều đợt tiếp nhận |
| Conversation | Hồ sơ tiếp nhận/tư vấn nghiệp vụ có nguồn, pipeline, stage và kết quả riêng. Theo Product Truth, phạm vi cần làm rõ là một nhu cầu/công việc xuyên tương tác và có thể xuyên kênh; không định nghĩa bằng thời lượng chat hoặc cửa sổ gửi tin của provider |
| Inbox | Không gian tiếp nhận/xử lý và các views; không thêm một business object trùng Conversation |
| Lead / Deal | Object tùy chọn khi doanh nghiệp cần quy trình riêng; có pipeline/stage của chính nó |

Conversation Channel thuộc Chat, không chuyển ownership sang service cấu hình kết nối chỉ vì tên chứa Channel. Thread là tên cũ/cách mô tả kỹ thuật, không thêm entity thứ ba. Provider thread ID giữ namespace riêng; không tự bằng UUID nội bộ. Inquiry không được chọn làm object chuẩn.

Một Channel Connection có thể phục vụ nhiều Conversation Channels của các khách khác nhau. Một Contact có thể có nhiều Conversation Channels trên nhiều danh tính/kênh/Page đã xác minh. Một Conversation Channel có thể chứa tương tác của nhiều Conversations theo thời gian hoặc nhiều nhu cầu. Theo tham chiếu, một Conversation nghiệp vụ cũng có thể tiếp nối qua nhiều Conversation Channels; không mặc định thuộc độc quyền một channel. Cách liên kết/tách phạm vi và cardinality vật lý chưa được chốt, không bổ sung unique key theo Contact hay DDL trong review này.

Ví dụ cùng khách A: **CC1 = khách A ↔ Messenger Page P**; trong CC1 có tương tác của **C1 từ Ad A**, kết thúc đạt mục tiêu, và **C2 từ Ad B**, kết thúc lost nếu đó là nhu cầu/lượt nghiệp vụ riêng. C2 không ghi đè nguồn, stage hoặc outcome của C1. Khách A liên hệ Page Q có Conversation Channel khác; việc có tiếp nối cùng nhu cầu hay không cần quy tắc riêng, không gộp qua Pages bằng provider user ID trần. Channel/Page/connection ở đây là endpoint đã binding, không chỉ là tên nền tảng “Facebook”.

Omnichannel-only có thể dùng Conversation + pipeline để quản trị đợt tiếp nhận; không bắt tạo Lead/Deal. Nếu dùng thêm Lead hoặc Deal, liên kết giữ nguồn/context nhưng không tự đồng bộ stage/outcome. Mẫu số phễu nghiệp vụ là Conversation; số luồng liên lạc lâu dài là distinct Conversation Channel.

## Mapping với source hiện tại

| Tên sản phẩm mới | Tên source/API hiện tại | Quy tắc compatibility |
|---|---|---|
| Conversation Channel | Persistent `conversation`, `conversation_id`, `/api/v1/conversations`; legacy thread aliases | Giữ nguyên ID/route/receipt hiện tại tới khi có exact versioned migration contract |
| Conversation | `conversation_acquisition_session`, `session_id`, `conversation_session_id`; các progress/source APIs theo session | Mapping tạm về lượt tiếp nhận cho inventory, chưa đủ đại diện hồ sơ nhu cầu xuyên tương tác/kênh; không khẳng định 1:1 với aggregate đích hoặc đổi ý nghĩa `conversation_id` trên wire |
| Channel Connection | Existing connection/channel binding của doanh nghiệp | Không đổi thành Conversation Channel; không thêm quyền/provider credentials |
| Session | Tên implementation cũ cho episode hoặc loại session có ngữ cảnh riêng | Không dùng làm tên business object mới; auth/agent/runtime sessions giữ nghĩa kỹ thuật riêng |

Trong tài liệu khảo sát source và evidence lịch sử, Conversation/Session vẫn có thể là tên cũ; phải đọc theo bảng mapping. Không sửa payload/graph/event đã phát, migration lịch sử hoặc provider fields để khớp tên mới. UI đổi nhãn, metadata/object registry, public API, workflow references, reporting grain và durable receipts cần inventory/compatibility design trước source task.

## Ranh giới quyết định

Chọn tên không tự thay state machine hiện tại. Code đang kết thúc acquisition session khi close và tạo session tiếp theo từ inbound hợp lệ sau close; referral mới khi đang active chỉ thêm touchpoint; chuyển owner/team không tạo session. Chưa bật timeout hay rule “mỗi CTM click tạo Conversation”.

Nếu cần đóng lượt chat mà vẫn giữ cùng Conversation nghiệp vụ để tiếp tục cơ hội, exact lifecycle design phải tách hành vi đóng xử lý khỏi kết thúc nghiệp vụ, định nghĩa tiếp tục cũ/tạo mới và mapping message/source/history. Chưa kết luận cần thêm bảng hoặc thêm một tầng chat-session chỉ từ thay đổi tên. Structured outcomes và configurable Lead/Deal pipelines vẫn chưa được triển khai.

## Acceptance tài liệu

DOC-CC-01: phân biệt Channel Connection với Conversation Channel theo khách/endpoint. DOC-CC-02: một luồng chứa nhiều Conversations, pipeline/outcome thuộc đợt nghiệp vụ, Lead/Deal optional. DOC-CC-03: giữ wire/IDs/source names và phân biệt đổi tên với lifecycle change. DOC-CC-04: glossary/current contract/service/research navigation nhất quán, docs/link/whitespace checks trong execution log. Không có runtime/native/browser/migration acceptance từ task tài liệu này.
