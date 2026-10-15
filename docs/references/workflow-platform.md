# Tham chiếu Workflow: HubSpot và Salesforce

PLAN-024 · tra cứu nguồn chính thức 2026-10-13. Các URL dưới được mở/đọc trong phiên; đây là ghi chú thiết kế, không sao chép sản phẩm hay cam kết feature parity/licensing. [Kiến trúc CRM đề xuất](../system/workflow-architecture.md) là quyết định riêng của repository.

| Nguồn chính thức | Ý liên quan | Áp dụng trong thiết kế này |
|---|---|---|
| [HubSpot — Choose your workflow actions](https://knowledge.hubspot.com/workflows/choose-your-workflow-actions) | Action được nhóm thành delay, branch, communication và CRM actions; có thao tác với record liên quan, email và thông báo nội bộ | Palette theo nhóm; shared related-object picker; có base delay/branch và typed communication adapters |
| [HubSpot — Create workflows](https://knowledge.hubspot.com/workflows/create-workflows) | Enrollment criteria, chọn actions và review trước bật workflow | Tách draft/validation/publish/activation; cho chọn enrolled object và re-enrollment explicit |
| [Salesforce Trailhead — Data Elements and Variables](https://trailhead.salesforce.com/content/learn/modules/data-and-actions-in-flows/combine-variables-data-elements) | Phân biệt lấy dữ liệu, biến và thao tác tạo/cập nhật record trong Flow | Tách read/search outputs khỏi update commands; binding scalar/record/collection typed |
| [Salesforce Architects — Record-Triggered Automation](https://architect.salesforce.com/docs/architect/decision-guides/guide/record-triggered.html) | Chọn cơ chế theo yêu cầu đồng bộ/bất đồng bộ, scheduled paths và transaction boundary | CRM event sau owner commit; delay bền vững; không giữ transaction qua remote action |
| [Salesforce — Workflow Rules & Process Builder End of Support](https://help.salesforce.com/s/articleView?id=000389396&language=en_US&type=1) | End of support từ 2025-12-31; existing automation có thể tiếp tục nhưng định hướng là Flow Builder | Lấy Salesforce Flow làm mẫu hiện hành; Workflow Rules/Process Builder chỉ là đối chiếu lịch sử |

## So sánh cho quyết định kiến trúc

SRC-067 UI research2026-10-13: [Salesforce Flow Builder](https://trailhead.salesforce.com/content/learn/modules/flow-basics/meet-flow-builder) describes toolbox/canvas/button bar, auto-layout and undo/redo; inspected its interface illustration. [Dify quick start](https://docs.dify.ai/en/quick-start) opens a node configuration panel and uses explicit branches. [n8n connections](https://docs.n8n.io/workflows/components/connections/) describes dragging output to input. These inform palette/canvas/inspector and typed ports, without copying assets or claiming equivalent execution features.

HubSpot giúp định hình trải nghiệm cấu hình follow-up theo record: enrollment → branch/delay → action. Salesforce Flow giúp phân tách record input, read/query, decision và command tác động dữ liệu. CRM này dùng cùng mô hình UX ở mức khái niệm, nhưng event Kafka, split Workflow API/Core, MySQL durable state và native authorization là yêu cầu/kiến trúc của dự án; không suy ra rằng HubSpot/Salesforce dùng cùng topology nội bộ.

Không chọn legacy Workflow Rules làm runtime chuẩn mới. Không suy rằng tính năng gửi email/message của sản phẩm tham chiếu chứng minh repository đã có adapter tương ứng. Các nguồn có điều kiện subscription/capability riêng; không import pricing/permission model của họ vào CRM. Parallel/loop/custom code ở sản phẩm khác không tự thuộc MVP của repository.

Các giới hạn 50 nodes/3 hops/100 targets, semantics re-enrollment, node IDs, event envelope và service schema split trong design là quyết định đề xuất của CRM, cần contract/test gate; không phải trích số giới hạn của HubSpot/Salesforce.
