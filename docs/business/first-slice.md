# Lát cắt đầu — Messenger CTM → Lead → Sale

Status: Ready for implementation M2 bằng mock connectors/runtime.

## Preconditions

Tenant `clinic_alpha` active; connection `mock_page_alpha`; Chat team `intake`, Sales team `sales`; Human `chat_anna`, AI `intake_ai`, Human `sales_binh`. Intake AI là owner ưu tiên, Chat Human fallback, Sales Human nhận Lead. Các actor có quyền theo [fixtures healthcare](healthcare.md).

Published Workflow `ctm_intake_v1` pin Chatflow `healthcare_qualification_v1`. Trigger conversation.created chỉ trên connection mock. Không trigger workflow mới cho mỗi message trong cùng Conversation.

## Luồng chuẩn

```mermaid
sequenceDiagram
  participant C as Mock Messenger
  participant I as Intake
  participant W as Workflow
  participant F as Chatflow / Mock AI
  participant R as CRM / Sales
  participant S as Sales Human
  C->>I: Message + CTM referral
  I->>R: Resolve Contact; create Conversation + Message
  I-->>W: conversation.created via outbox
  W->>R: Assign AI owner
  W->>F: Start pinned Chatflow
  F->>C: Prompt via outbound intent
  C->>I: Need + contact preference + explicit consent
  I-->>F: message.received; consume persisted message
  F->>R: Upsert and qualify one Lead
  F-->>W: chatflow.completed outcome qualified
  W->>R: Handoff Lead to Sales team
  S->>R: Accept handoff using version
  R-->>W: lead.accepted
```

1. Inbound được persist trước ACK; resolve Contact bằng connection+subject, tạo Conversation active và message duy nhất.
2. Workflow route owner; Chatflow đọc cả tin đầu tiên dù signal message.received đến trước session.
3. AI chỉ đề xuất thông tin; backend validate nhu cầu, dịch vụ, phương thức liên lạc và consent từ hội thoại. Không yêu cầu số điện thoại nếu chọn Messenger.
4. Upsert Lead bằng session identity; qualify và session completed atomic. Lead snapshot attribution từ Conversation.
5. Parent Workflow tạo handoff, chuyển Lead team/owner sang Sales; grant Contact team access. Conversation vẫn thuộc Intake AI/Human.
6. Sale mở queue và bấm nhận; đúng một principal nhận thành công, audit/event/accepted_at ghi chung transaction.

## Kết quả nghiệm thu M2

Một identity, Contact, Conversation và Lead cho fixture A; message đúng số unique; owner Conversation và Lead có thể khác; Lead accepted, Customer vẫn prospect. Workflow completed accepted; Chatflow completed qualified; có trace intake→run→session→handoff.

Deal/Appointment/won/Customer là continuation M4 trong [healthcare](healthcare.md), không tạo code giả cho những phần Draft trong M2.

## Nhánh lỗi có chủ đích

| Tình huống | Hành vi |
|---|---|
| AI không eligible hoặc capacity timeout | Human queue, session paused_human, form giữ dữ liệu |
| Human takeover giữa AI turn | Tăng revision, cancel turn và queued send; late result bị reject |
| Khách không đồng ý liên hệ | Disqualified outcome, không qualified/handoff |
| Không có Sales available | Lead handed_off unassigned trong Sales team; cảnh báo, không mất Lead |
| Sale chưa nhận sau 15 phút | Workflow outcome handoff_pending, Lead vẫn pending |
| Webhook/triggers lặp | No duplicate Message/Lead/Run/intent |
| Worker crash tại bước tạo Lead | Replay cùng action/session key trả Lead cũ |
| Không có referral | Luồng vẫn thành công, attribution unknown |

Human hoàn tất session paused_human bằng form + consent evidence có thật trong Conversation; không cần gọi runtime để hoàn thành.
