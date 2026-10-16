# Thread / Conversation local

SRC-078 · 2026-10-16 · [Exact contract](../contracts/thread-conversation-implementation.md) · [Evidence](../tracking/details/SRC-078.md).

## Sử dụng

1. Mở [Object & Properties](http://localhost:18080/?screen=schema), chọn **Conversation (lượt trao đổi)**. Tạo thuộc tính string/text/integer/decimal/boolean/date/datetime/enum. Phiên bản này hỗ trợ thuộc tính tùy chọn, không default, không filter/index; không bắt buộc nhập trước khi nhận tin.
2. Trong [Inbox](http://localhost:18080/), mở Contact panel. **Related objects** cho tạo/tiếp tục Lead và Deal theo quyền hiện tại; Ticket không có nút tạo vì chưa có runtime.
3. Chọn lượt trong **Tiến trình & chuyển đổi**. Stage giữ process version đã ghim. **Phân loại Conversation** lưu riêng theo lượt; lịch sử xử lý hiển thị người thực hiện, team phụ trách, chuyển owner/team, stage, field changes, notes và outcome context.
4. **Phân công và lịch sử** → Team đích → agent đủ điều kiện hoặc hàng chờ → Lưu phân công. Không cần tạo outcome. ID lượt/stage/source/fields giữ nguyên; Lead/Deal owner độc lập.
5. **Đóng Thread** kết thúc lượt active. Inbound mới hợp lệ mở Thread cũ và Conversation mới với fields trống. Lead/Deal không tự đóng. Tin trễ/duplicate vẫn qua guard cũ; tin có thời điểm bằng thời điểm đóng không mở lượt mới.

Phân loại lượt đã kết thúc chỉ đọc. Bản nhập xung đột được giữ tới khi người dùng chọn bỏ và tải lại. Historical owner được đóng băng từ snapshot cuối lượt; lịch sử cũ thiếu bằng chứng hiển thị none/partial. `handling_team_id` là team phụ trách lượt, không suy ra team của actor từ membership hôm nay. `outbound_submitted` là yêu cầu gửi, không phải xác nhận gửi thành công.

## API / metadata

- Old `conversation` key và `/api/v1/conversations` vẫn chỉ Thread; old session IDs/source refs giữ nguyên. UI legacy pending được trình bày là Thread đang mở/chờ xử lý.
- Key `conversation_session` là metadata cho lượt, generic records/associations/Workflow/Reporting chưa được bật. Configuration qua existing Object & Properties; values qua Chat classification API.
- GET/POST `/api/v1/conversations/:thread/sessions/:episode/classification`. POST dùng Idempotency-Key và If-Match (lần đầu `"0"`), `{values:{field:value}}`; `null` xóa giá trị. Backend kiểm quyền Thread/Contact và field read/write, active lifecycle, kiểu và CAS.
- GET `.../contributions?before_revision=N`: tối đa50 fact; page có thể ít hơn do current source/field ACL. Tiếp tục theo next_before_revision; coverage không có nghĩa credit/revenue attribution.
- GET `/api/v1/records/:thread/assignment-teams`; assignment-targets hỗ trợ `team_id` tùy chọn. Assignment command/owner fence giữ API cũ.

Tenant-super-admin giữ bypass field-policy theo Identity hiện hành. Negative tests chuyển seat synthetic tạm thời về chat để kiểm quyền thông thường và luôn restore; không sửa quyền Alpha local.

## Nâng cấp / kiểm tra

Schema31 bổ sung hai bảng Chat và metadata Core cho Conversation. `scripts/conversation-classification-local-upgrade.mjs` giới hạn local development, dừng managed API/worker, tạo SQL backup riêng trong ignored artifacts, fingerprint tất cả bảng cũ (object_type chỉ thêm key mới), chạy forward/repeat, cấp runtime grants và khởi động lại. Không reset DB/Redis hoặc sửa migration lịch sử. Key collision với custom object cùng tên fail closed, cần operator resolution trước upgrade. Không downgrade writer vì có thể tạo khoảng trống evidence; sửa bằng forward migration.

Các lệnh thực tế, trong dev shell:

```powershell
. ./scripts/dev-shell.ps1
pnpm --filter @agentic-crm/backend build
pnpm test:unit
node scripts/conversation-classification-test.mjs
node scripts/integration.mjs --bootstrap
node scripts/conversation-classification-local-upgrade.mjs
node scripts/conversation-classification-browser.mjs
```

Native test dùng retained native_seed_test, không reset; browser dùng Alpha local và mock channel synthetic. Backup/artifacts có dữ liệu fixture và luôn ignored, không commit. Connected Reporting, workflow actions cho episode, Ticket runtime, required/carry-forward/field schema evolution và production deployment không thuộc slice này.
