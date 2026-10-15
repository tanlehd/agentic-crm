# Dashboard và Reports local

SRC-071/072 · 2026-10-14. [Thiết kế](../planning/dashboard-workspace.md), [contract gate](../contracts/dashboard-implementation.md), [backend evidence](../tracking/details/SRC-071.md), [UI evidence](../tracking/details/SRC-072.md).

## Sử dụng

1. Đăng nhập native trên http://localhost:18080, chọn Clinic Alpha. Alpha dùng quyền tenant_admin hiện hữu; rollout không thêm role/grant.
2. **PHÂN TÍCH → Dashboard** mở home, tìm/lọc owner và trạng thái. Home không tự chạy báo cáo.
3. **Tạo dashboard**: chọn dashboard trống hoặc một trong hai mẫu DEMO. Mẫu tạo 6 reports vận hành hoặc 5 reports chất lượng quảng cáo; có thể bỏ chọn từng report. Chọn nguồn tương thích và đặt tên. Reporting tạo các reports và dashboard trong cùng transaction.
4. **Thêm report** mở thư viện đã lưu. Chọn nhiều reports; lưu dashboard để ghi các tham chiếu phiên bản và snapshot. Có thể tạo report mới rồi quay lại bản nháp dashboard.
5. **Chỉnh bố cục**: kéo nút di chuyển hoặc dùng Lên/Xuống; chọn độ rộng 4/6/12 cột và độ cao; sửa tiêu đề/ghi chú hoặc bỏ widget. Lưu/Hủy rõ ràng, có cảnh báo rời bản nháp. Mobile xếp lại để đọc, không ghi đè desktop layout.
6. **Làm mới dashboard** chạy tối đa hai widget đồng thời. Widget lỗi không phải số0; lỗi quyền xóa kết quả. Số liệu chỉ từ snapshot mô phỏng đã có, không gọi Meta hoặc tạo lại inbox.
7. **Reports** có thư viện riêng, tìm/lọc owner/model/chart/trạng thái, viewer, sử dụng trên dashboard, CSV và editor. Chỉnh report tạo version mới; dashboard giữ pin cũ tới khi chọn **Có version mới**, xem cấu hình/preview rồi áp dụng và lưu.
8. **Dashboard cũ** chỉ chuyển khi người dùng chọn. Bản gốc được giữ nguyên. Sau chuyển, nút mở dashboard mới thay cho chuyển lần nữa. Duplicate/archive/restore không xóa reports.

## Runtime và compatibility

- Web18080 → native API3001 → signed private Reporting3004 → own MySQL `crm_reporting` schema4; worker3002 hiện hữu. MySQL13306/Redis16379 giữ dữ liệu. CRM schema29 không đổi trong slice này.
- Forward004 thêm sáu bảng tenant-scoped; kiểm tra/test/local migration và fingerprint13bảng cũ trong SRC-071. Không sửa migration lịch sử, không schema sync/reset.
- Routes: `/?dashboards=1`, `/?dashboards=1&create=1`, `/?dashboards=1&dashboard=<id>`, `/?reporting=1`, `/?reporting=1&report=<id>`. Menu organic vẫn riêng.
- Query snapshot pin active-only trong dashboard; pin cũ cần chọn đổi snapshot, không tự fallback latest. Report editor vẫn dùng semantic/query/CSV APIs hiện hữu.
- Global dashboard filters, comparison, sharing, live-source policies, version-history browser, public response-schema hardening và capacity/SLO còn scope riêng. Không tính phần này là hoàn thành toàn bộ SRC-061.

## Kiểm chứng

Pinned Node `.local/node-v24.21.0-win-x64/node.exe`; dùng executable này thay `node` nếu PATH chưa có Node24. Pnpm entry `.local/tooling/node_modules/pnpm/bin/pnpm.cjs`.

```powershell
node scripts/generate-dashboard-contract.mjs --check
node node_modules/vitest/vitest.mjs run --exclude '**/*.integration.test.ts'
node scripts/dashboard-native-test.mjs
node scripts/dashboard-browser.mjs
node scripts/check-schemas.mjs
node scripts/check-docs.mjs
node scripts/lint.mjs
```

Native test dùng fixtures giữ lại trong test DB; không chạy đồng thời hai bản vì test tạm thay restriction rồi khôi phục. Browser test đăng nhập Alpha thật, tạo dữ liệu synthetic nghiệm thu giữ lại, không tự cấp quyền. Chỉ các kiểm tra lỗi cuối intercept response lỗi; success không proxy. Artifacts ở `artifacts/dashboard-workspace` (ignored), screenshot đã kiểm tra trực quan; không lưu credential/session vào evidence.

Next production build dùng `NEXT_BUILD_DIR=.next-dashboard-build` để tránh đụng dev cache; giữ nguyên bytes `next-env.d.ts` và `tsconfig.json`. Reload API/Reporting qua managed local monitor3020 khi cần, không reset hạ tầng.
