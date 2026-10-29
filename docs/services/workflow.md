# Workflow — business orchestration

Một service Workflow duy nhất định nghĩa và thực thi các business flow tự động hóa cho CRM/custom objects, Lead, Deal, Ticket, User và Chat Conversation. ADR-027 / CHG-20261021-07 thay thiết kế Chatflow riêng và Workflow API/Core riêng. Đây là kiến trúc đích đã được người dùng chốt; source hợp nhất chưa triển khai.

## Trách nhiệm và dữ liệu sở hữu

Workflow sở hữu definition/draft/immutable version, activation, trigger/enrollment, run/step/wait/timer, variables/provenance, Human task/resume và action receipts. Luồng hội thoại/qualification là node/template của cùng engine; không có Chatflow definition/service/session engine thứ hai.

Follow-up/recover_need, điều kiện cooldown/assessment/outcome và quyết định chăm tiếp thuộc implementation/acceptance của Workflow. Workflow gọi authorized Chat commands; không ghi DB Chat. Nghiệm thu Chat không đợi Workflow recovery hoàn tất.

Schema đích duy nhất: crm_workflow. API authoring/control, scheduler, event consumer và execution workers là entrypoints/components của cùng service, có thể scale riêng theo workload. Web editor nằm trong CRM workspace, không là service dữ liệu. Package packages/workflow-definition hiện có là thư viện nội bộ có thể tái sử dụng, không một service/schema riêng.

## Ngoài phạm vi

Workflow không sở hữu Contact, Lead, Deal, Ticket, account/session/permission hoặc Conversation/message/owner. Không ghi SQL của service khác; không thay validation, authorization hoặc transaction của owner. Human command và invariant trực tiếp của owner không cần đi qua Workflow để thành công.

## Giao tiếp với service khác

| Owner / bên cung cấp | Đầu vào cho Workflow | Action qua owner |
|---|---|---|
| CRM | Object/property/association descriptors; Contact/Company/Activity/custom changes | Read/query/create/update những fields/commands owner hỗ trợ |
| Sales | Lead/Deal created/changed/stage/outcome/handoff facts | Create/qualify/handoff/transition theo Sales contract |
| Ticket | Ticket changes và capabilities khi triển khai | Create/assign/transition/resolve; chưa có adapter thì unavailable |
| Identity | User/principal/team business changes được cho phép | User/team operations qua named admin command và quyền hiện hành; không event password/token/secret |
| Chat | Conversation/episode/message reference/owner/classification changes | Read context, send intent, change fields/close/assign qua Chat command |
| Routing | Candidate/capacity/reservation result | Select/reserve/propose assignment; owner CAS quyết định kết quả |
| AI Runtime | Typed execution result và provenance | Execute/cancel tool-limited action; không engine business flow thứ hai |
| Connector / các communication owners | Receipt/delivery outcome | Messages qua Chat→Connector; email/notification chỉ khi có adapter đã chốt |

## Quy tắc riêng

Workflow quyết định khi nào chạy nhánh, delay/wait, follow-up hoặc routing rule. Routing tính eligibility/capacity và owner xác nhận assignment; không hai bộ business trigger tự phân công cùng sự kiện. Owner commit trước, phát event qua outbox; Workflow unavailable không rollback hoặc chặn thao tác độc lập của owner.

Run pin version, action key bền vững qua retry, current Identity + owner permission tại effect. Event/cached catalog không cấp quyền. Wait message/Human response cùng run/step model; Chat episode ID là business context, không phải Workflow run ID. Consent cần evidence thật, không suy từ AI draft.

## Contract và evidence

- [Unified orchestration contract](../contracts/workflow-orchestration.md)
- [Architecture](../system/workflow-architecture.md)
- [Metadata ownership](../data/workflow-metadata.md)
- [Migration and implementation plan](../planning/workflow-platform.md)
- [Legacy compatibility](../contracts/legacy-chatflow.md)
- [Acceptance](../quality/workflow-platform-acceptance.md)

SRC-019/020/065/066/067/081 là evidence các phần baseline/library/UI trước hợp nhất, không là nghiệm thu service mới. Trạng thái chuẩn ở [tracker](../tracking/tasks.md); ranh giới chung tại [catalog](README.md).
