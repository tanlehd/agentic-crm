# MOD-08 — Workflow

Workflow là module/service orchestration duy nhất cho business automation, theo [ADR-027](../decisions/README.md#adr-027--one-workflow-service-for-business-orchestration). Chatflow không còn module nghiệp vụ độc lập. Baseline source cũ còn trong giai đoạn tương thích; không coi việc sửa tài liệu là runtime migration.

## Mục tiêu và phạm vi

Người dùng định nghĩa trigger, điều kiện, nhánh, action, delay, chờ event/message/Human input và kết thúc flow. Root/context có thể là Contact/custom record, Lead, Deal, Ticket, User hoặc Conversation. Không tách business flow theo channel hoặc object thành engine khác nhau.

Authoring, versioning và execution dùng cùng Workflow model. Luồng qualification/hỏi đáp trước đây là template ghép các action Chat, AI Runtime và Sales; human routing là flow dùng Routing allocator và owning-service assignment command.

## Actor và quyền

Designer/publisher/operator có quyền theo Identity. Run dùng service actor được cấu hình; permission hiện hành và quyền của owner quyết định mọi effect. User-triggered flow không impersonate người dùng có quyền cao hơn. User object thuộc Identity; không copy credentials/session/roles thành CRM record.

## Use case và hành vi

1. Conversation created/changed → điều kiện team/queue → Routing candidate/capacity → Chat assignment.
2. Lead thay đổi → kiểm điều kiện → tạo/update Deal qua Sales → follow-up theo action được phép.
3. Ticket thay đổi → branch/escalation/notification khi Ticket adapter có thật.
4. User/team availability thay đổi → đánh giá lại công việc liên quan → yêu cầu allocation; không sửa owner hàng loạt bằng SQL.
5. Hội thoại thu thập thông tin → chờ message/Human input → kiểm evidence → Sales qualification; dùng một run, không start child Chatflow.

Run states queued/running/waiting/completed/failed/cancelled phục vụ execution/recovery, không áp vào lifecycle business object. Create/update/assign/close vẫn là commands của owner tương ứng.

## Entity và invariant

Workflow owns definitions/versions/enrollments/runs/steps/waits/action receipts trong crm_workflow. Version bất biến; retry không đổi action identity; wait/event matching tenant/run/resource-bound; owner/current authorization checked tại effect. Variables lưu tối thiểu refs/provenance, không mặc định copy transcript hoặc user secrets.

## API, event và UI

[Orchestration contract](../contracts/workflow-orchestration.md) và [architecture](../system/workflow-architecture.md) là nguồn đích. Một editor/catalog/node palette phục vụ mọi flow. Event source/command capability do owner công bố; unsupported action hiện unavailable. Authoring API, engine và worker là nội bộ cùng service, không cần install/activation saga giữa hai Workflow services.

## Acceptance và chuyển đổi

[Acceptance](../quality/workflow-platform-acceptance.md) kiểm event dedup, routing race, current rights, Human wait/resume, unknown effect và retained runs. [Implementation plan](../planning/workflow-platform.md) ghi source gaps. Chatflow code/data is retired under CHG-20261021-08. Historical Workflow graphs remain evidence; retired nodes cannot be published or executed. See [retirement](../contracts/legacy-chatflow.md).
