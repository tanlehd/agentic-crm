# Legacy record archive — compatibility only

CHG-20261021-06, quyết định người dùng ngày 2026-10-21: bỏ generic record archive lifecycle và Contact archive coordination khỏi yêu cầu phát triển service. Đây là bản kê tương thích của code/data hiện có, không phải thiết kế để nhân rộng.

## Phần còn trong source và dữ liệu

Baseline CRM có crm_record.archived_at, response archived và generic POST objects/:key/records/:id/archive. Các guard Lead/Deal/Conversation đã được triển khai trong monolith. Một số read/ingress paths từ chối record đã đánh dấu này. Không xóa cột, đổi historical migration hoặc bỏ tenant/authorization check trong đợt dọn tài liệu.

T01/T02 generated kit và Chat applied schema còn contact-archive-guard/status/release, chat_contact_guard cùng reference retirement fixtures. Chúng là artifact/source compatibility cũ; không có yêu cầu mount writer hoặc tái triển khai saga archive phân tán. Không lấy operation/table hiện hữu làm acceptance cho service tiếp theo. Contact-key mutex của ingress vẫn có mục đích serialize request, không là trạng thái nghiệp vụ Contact.

## Chênh lệch source cần xử lý khi cutover

T09 source đã bỏ Conversation SQL archive guard khỏi CRM và trả `410 RECORD_ARCHIVE_RETIRED` cho generic archive ngoài Activity. Activity archive tiếp tục dùng nghiệp vụ riêng. Main runtime chưa rollout source này; tiếp tục rà discovery/caller và kiểm smoke trước cutover. Không giữ fallback SQL sang database Chat và không báo thành công giả. Kế hoạch thay route phải kiểm tương thích dữ liệu/response cũ; không cần xây một archive saga để giữ API cũ. Không tự diễn giải archived rows thành active hoặc xóa lịch sử.

Note/Activity, report/dashboard, inbox/tag/snippet và provider Marketing có thao tác lưu trữ riêng đã phục vụ use case; quyết định này không xóa chúng. Session close, Identity revoke, channel disable, version publish và send pending/unknown có nghĩa nghiệp vụ/vận hành riêng và tiếp tục theo owner contract.

Nguồn hiện hành: [CRM](../services/crm.md), [Chat](../services/chat.md), [catalog](../services/README.md). Lịch sử: [execution log](../tracking/log.md).
