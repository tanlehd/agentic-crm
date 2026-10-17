# Nghiệm thu Dashboard vận hành — SRC-085

**PASS OR-01…08**, bounded local connected source. [Mở dashboard](http://localhost:18080/?dashboards=1&dashboard=6194bf0e-a924-5a33-a743-9237ff657d10) · [10 ảnh chụp](operations-reporting-gallery.html) · [Thiết kế](../contracts/operations-reporting.md) · [Runbook](../development/operations-reporting.md).

| Tiêu chí | Kịch bản và kết quả |
|---|---|
| OR-01 | Discovery6objects/7models; editor hiện property/type/relation/measure; sửa kỳ7ngày và lưu version mới. PASS |
| OR-02 | Dữ liệu source-owned đối soát workload và completion; role revoke, scope own, field filter deny và wrong tenant bị chặn. PASS |
| OR-03 | Shared executor COUNT DISTINCT/SUM/AVG/ratio; hoàn tất/chuyển giao riêng, AVG theo allocation, zero-capacity ratio null; template agent/queue/day dimensions. PASS |
| OR-04 | Template tạo7reports/dashboard; chỉnh layout và reload; cùng report/version ở dashboard thứ hai; regression atomic/replay/CAS/rollback. PASS |
| OR-05 | Lấp đầy slot synthetic rồi đưa thêm một việc vào hàng chờ; agent close qua native authenticated API; worker tự gán việc chờ. Refresh tăng completion1, workload giữ nguyên do nhận việc mới; report/catalog pin không đổi. PASS |
| OR-06 |12nhóm native dashboard mock regression vẫn đạt; connected dùng catalog FK riêng, không gắn nhãn MOCK trong editor/widget. PASS |
| OR-07 | Catalog mismatch/client source-policy injection/wrong tenant bị chặn; CSV quyền riêng; payload5001 bị chặn, unavailable source không trả0; append-only runtime/DB CHECK/FK/PK plan. PASS |
| OR-08 | Bỏ tab Hiệu suất riêng; giữ Routing config/workload/reroute và link dashboard; desktop/mobile390px không tràn ngang, không pageerror;10ảnh lưu. PASS |

Luồng UI gán kỹ năng/team → agent nhận/tư vấn/close → admin phân lại đã được ghi ở [SRC-084 acceptance](human-routing-acceptance.md). SRC-085 kiểm lại native close→next với dashboard dùng chung; không gọi API check là thao tác click close trong browser.

Evidence: [browser](assets/operations-reporting/browser.json), [producer/MySQL7groups](assets/operations-reporting/mysql.json), [storage5groups](assets/operations-reporting/storage.json), [migration](assets/operations-reporting/upgrade.json), [unit399tests](assets/operations-reporting/unit.log), [mock regression12groups](assets/operations-reporting/dashboard-regression.log), [Web build](assets/operations-reporting/web-build.log), [ảnh/hash](assets/operations-reporting/manifest.json).

Dữ liệu giữ qua các lần chạy nên chỉ số cộng dồn; dùng baseline delta để nghiệm thu. Dashboard lấy dữ liệu khi bấm Làm mới, chưa auto refresh. Giới hạn30ngày/5000rows; lịch sử workload, generic custom-object ingestion và connected durable runs chưa thuộc scope. Provider production chưa bật.
