# Khung Workflow, Chatflow và AI Agent trước tích hợp Chat

Status: Planned, theo chỉ đạo người dùng2026-10-07, CHG-20261007-11. Không task triển khai active. Baseline M2 đã có primitive engine/mock runtime, nhưng chưa được coi là hoàn tất khung cấu hình dùng cho luồng Next action.

## Thứ tự thực hiện

1. PLAN-009: rà baseline và chốt phạm vi/đặc tả khung cho Workflow, Chatflow, AI Agent; reuse engine hiện có. Xác định phần runtime, cấu hình/UI và acceptance của mỗi khung trước source. Không ngầm mở rộng thành full visual builder M5.
2. SRC-042: khung Workflow theo thiết kế Ready: definition/version, trigger/condition/action registry, binding, service actor/quyền, run status và retry/idempotency; cấu hình/UI theo PLAN-009.
3. SRC-043: khung Chatflow trên nền Workflow: definition/version, session/node/context, gọi action/agent, pause/resume/cancel, structured result và quyền. Chưa ghép Next action vào Inbox.
4. SRC-044: khung AI Agent: định nghĩa/config, skills, provider/adapter boundary, quyền/tool profile và thực thi trả kết quả có cấu trúc. Phân biệt Assist chỉ đề xuất với owner agent; kiểm được bằng adapter synthetic, không gọi đó là provider production đã tích hợp.
5. PLAN-008: chỉ bắt đầu sau cả ba khung DONE; chốt exact typed next_action, action/API/persistence/compatibility và cách ghép Workflow/Chatflow/rule/Assist vào luồng Chat. Sau đó mới claim source tích hợp Chat được tách từ kế hoạch này.

Scope từng source vẫn cần PLAN-009 Ready và acceptance cụ thể; danh sách trên là thứ tự/gate, không tuyên bố khung đã triển khai. Dependency tuần tự bảo đảm một implementation task active. Provider thật, visual builder đầy đủ, Ticket và tích hợp hành động nghiệp vụ chưa có vẫn theo design gate riêng.

## Gate trước PLAN-008

Ba khung có source/config và evidence: đăng ký/version/validate definition; binding/action contract và auth; execution/result/cancellation/retry theo scope; Agent skill/quyền và Assist không trực tiếp sửa CRM/gửi công khai. Tích hợp không cần AI phải dùng được nhánh rule cùng action. Không dùng baseline SRC-018/019/020 DONE thay cho gate mới khi chưa kiểm phần khung còn thiếu.

[Tracker](../tracking/tasks.md) · [Workspace plan](agent-chat-workspace.md) · [Product Next action](../ux/agent-assist-response.md).
