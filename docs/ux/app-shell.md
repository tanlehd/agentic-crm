# APP-01 — App shell, header, navigation

Status: Ready UX design, UX-004 (supersedes tab layout UX-003), 2026-10-07. Shell là phạm vi frontend; search record đa object/profile editor và module Draft chưa Ready implementation. [Guideline](guidelines.md) · [Inbox mock](mockups/inbox.html).

## Anatomy và phân cấp

```text
┌ Logo / Workspace ── Tìm kiếm ── + Tạo mới ── Cài đặt ── User ┐
├ App navigation ┬ Nội dung feature ngay dưới header ────────┤
│ CRM           │                                             │
│ Marketing     │          Nội dung feature đang active       │
│ Workflow      │          (Inbox có workspace riêng)          │
│ Reporting     │                                             │
│ More          │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

Header 56px toàn chiều ngang. Nav nằm dưới header tới đáy. Không có thanh tab bên dưới header. Main bắt đầu ngay dưới header, cao `100dvh - 56px`. Chỉ main thay khi chọn feature. Header không chứa action đóng Conversation.

## Header

| Vị trí | Nội dung | Hành vi |
|---|---|---|
| Trái | Logo, tên workspace + chevron | Mở tenant list được phép; workspace đang dùng luôn rõ |
| Giữa | Search bar, Ctrl/Cmd+K | Mở command/search dialog; phạm vi được ghi trong label/results |
| Phải | + Tạo mới | Contact / Lead / Deal theo create capability và readiness |
| Phải | Cài đặt workspace | Thành viên/quyền, kênh, cấu hình dữ liệu qua màn có sẵn; chỉ quyền configure tương ứng |
| Cuối | Avatar initials + user name | Profile summary, workspace hiện tại, đăng xuất native; sửa profile chỉ khi có contract |

Header ở <768px giữ workspace compact, nút menu/search/create/user; settings vào user menu. Không hiển thị search input chật dưới 160px. Trên mobile title và controls được wrap, không truncate mất tên đối tượng duy nhất.

**Search hai giai đoạn:** shell đầu tiên tìm menu/công cụ đã có quyền từ danh mục frontend (label “Tìm công cụ…”). Đích tiếp theo có scope Contacts/Leads/Deals, result type/name/ID và mở hồ sơ; chỉ bật sau versioned search API với ACL, field policy, paging/ranking/Unicode/error được chốt. Không gom tất cả CRM records về browser để giả global search. Search Inbox luôn riêng và chỉ prefix tên liên hệ. Các màn record chưa thiết kế không được giả định có full-text.

## App navigation theo business

| Group | Item | Mapping baseline / trạng thái |
|---|---|---|
| CRM | Inbox | Chat workspace, INBOX-01 |
| CRM | Contacts | CRM records lọc Contact; renderer hiện tại |
| CRM | Leads | Lead records + Sales handoff/accepted views; không nhân bản menu Sales ngang hàng |
| CRM | Deals | Draft M4; “Sắp có” ở mock, chưa route production |
| Marketing | Ads | Attribution ở Contact vẫn giữ; Ads management chưa được dựng từ dữ liệu attribution |
| Marketing | Campaigns | Draft; cần module/contract/screen riêng |
| Automation | Workflow | Definition/version/run có quyền; visual builder vẫn Draft |
| Analytics | Reporting | Draft UI; không coi metric fixture là dashboard production |
| More | Công cụ khác | Operations, Companies/Activities/custom objects có quyền, cấu hình bổ sung; không trùng Settings |

“Automation/Analytics” là heading nhóm không clickable; Workflow/Reporting là item. Có icon + label; selected có nền/chỉ dấu + aria-current. Item có quyền nhưng chưa triển khai: production mặc định ẩn, mock ghi “Sắp có” và giải thích khi chọn. Không có quyền: ẩn cả item và group rỗng. More chỉ chứa routes thật, không dùng như nơi đổ mọi tính năng. Nav 184px desktop; compact 64px có tooltip/focus label và nút mở bản đầy đủ; mobile modal drawer.

## Điều hướng và tạo object — UX-004

- Chọn app nav thay nội dung feature ở main; không tạo hoặc duy trì work tabs. Browser back/forward khôi phục route/selection, không tự tạo record.
- Header **+ Tạo mới** là điểm tạo Contact/Lead/Deal theo capability. Mở form drawer trên feature hiện tại; mobile dùng sheet toàn chiều rộng. Mock dùng dialog rút gọn. Không có nút + ở hàng riêng dưới header.
- Mở Contact từ Inbox dùng drawer/dialog, đóng trở lại đúng hội thoại/filter/scroll/draft. Không mở tab record. Nếu cần full editor, điều hướng màn Contact với đường Quay lại Inbox và giữ draft trong memory.
- Form Contact/Lead dùng descriptor/contract hiện hữu, giữ validation/consent/qualification. Không auto-qualify/handoff. Deal vẫn gated M4.
- Đóng form dirty hỏi **Ở lại / Bỏ nháp và đóng**; pending/lost ACK giữ payload/key và kiểm kết quả trước discard. Save chỉ thành công sau ACK;409 không overwrite,403 xóa field bị thu hồi.
- Draft/cache trong memory theo tenant/object/mode. Tenant switch xử lý dirty/pending trước, abort request và purge dữ liệu tenant cũ; logout xóa dữ liệu nhạy cảm. Không persist transcript vào web storage.
- Dialog/sheet có focus trap, Escape và trả focus về nút mở; keyboard Tab theo visual flow. Browser tab hidden vẫn dừng Inbox polling/read-marker như UX-002.

## Gate implementation

SRC-036 tích hợp shell + nav + drawer/form launcher trên forms/routes hiện hữu sau SRC-035. Không thêm API/schema trong UX-003. Search toàn CRM, profile edit, Deals/Marketing/Reporting đầy đủ cần task design riêng; không là dependency ngầm chặn Inbox core. Source task và release phải chứng minh shell/permission/drawer/draft/browser history trước DONE.

## Acceptance APP-01…08

| ID | Scenario → kết quả |
|---|---|
| UX-APP-01 | Đổi feature → header/nav đứng yên, active chính xác, không user/tenant duplicate |
| UX-APP-02 | Mở/đóng Contact drawer → trở lại Inbox giữ selection/anchor/draft |
| UX-APP-03 | Không có tab bar; main bắt đầu tại y56; đóng form dirty/pending không mất dữ liệu |
| UX-APP-04 | Create Contact/Lead → form nháp đúng quyền, cancel không record, save/replay không duplicate |
| UX-APP-05 | Tenant switch/logout/ACL revoke + response trễ → không giữ tên/count/draft tenant cũ |
| UX-APP-06 | Search tools vs Inbox search → label đúng scope; module Draft không fake route |
| UX-APP-07 | Keyboard/overlay/back-forward → focus và state đúng; không trap |
| UX-APP-08 | Responsive/zoom → controls còn dùng được, composer không bị shell che |

Tất cả acceptance ứng dụng mới là NOT_RUN; mock chỉ evidence thiết kế và các tương tác được liệt kê trong task detail.

Implementation status2026-10-07: shell không tab trong SRC-039 đã triển khai; [evidence](../tracking/details/SRC-039.md). Header tool search/create/native session/nav theo quyền đã có; full browser-history/deep-link và module Draft không nằm trong scope này.
