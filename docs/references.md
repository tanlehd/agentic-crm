# Nguồn tham khảo và giới hạn áp dụng

Baseline truy cập/tham khảo: 2026-10-02. Chỉ suy ra hành vi được công bố; không khẳng định kiến trúc nội bộ của HubSpot/respond.io/Salesforce. Thiết kế repo là quyết định độc lập, không phải bản sao source hay assets.

| Nguồn chính thức | Điều tham khảo | Áp dụng trong dự án |
|---|---|---|
| [HubSpot — Introducing Custom Objects](https://developers.hubspot.com/blog/introducing-custom-objects-for-hubspot) | Standard/custom objects và association tương tác trên platform | Registry/property/association dùng chung; cách lưu MySQL là thiết kế riêng |
| [HubSpot — Create and edit custom objects](https://knowledge.hubspot.com/object-settings/create-custom-objects) | Khai báo object và quan hệ trước tạo record liên kết | Metadata schema và association type |
| [HubSpot — Assign and manage seats](https://knowledge.hubspot.com/account-management/manage-seats) | Seat xác định công cụ, permission xác định thao tác | Entitlement tách role/action/scope; không sao chép gói giá |
| [HubSpot — User permissions guide](https://knowledge.hubspot.com/user-management/hubspot-user-permissions-guide) | Quyền object, team, workflow/report | Phân quyền backend; role/policy cụ thể của repo là tự thiết kế |
| [respond.io — Workflow triggers](https://respond.io/help/workflows/workflow-triggers) | Trigger click-to-chat và dữ liệu quảng cáo | CTM intake + nullable metadata, inbox-to-workflow behavior |
| [respond.io — CTM trigger changelog](https://roadmap.respond.io/changelog/new-click-to-chat-ads-workflow-trigger-and-improved-channel-events) | Ad summary trong hội thoại và workflow assignment | Context card nguồn quảng cáo trong wireframe |
| [Next.js — App Router](https://nextjs.org/docs/app) | Routing và tổ chức UI React | Frontend workspace; version package chốt khi scaffold |
| [NestJS — Queues](https://docs.nestjs.com/techniques/queues) | Tích hợp BullMQ | Worker/queue dispatch; durability business state tự thiết kế |
| [MySQL 8.4 — Secondary indexes and generated columns](https://dev.mysql.com/doc/refman/8.4/en/create-table-secondary-indexes.html) | Khả năng index dữ liệu JSON qua generated column | Tham khảo giới hạn/tối ưu; baseline dùng typed projection |

Nguồn online có thể thay đổi. Trước M3 phải đọc tài liệu Meta Messenger hiện hành về auth/webhook/subscription/outbound policy. Trước M4 đọc Google Ads lead form integration hiện hành. Baseline không chép một provider payload chưa được xác minh vào contract production.

Salesforce chỉ là lựa chọn tham chiếu UX được đề xuất ban đầu; baseline hiện dùng hướng HubSpot và không đưa ra khẳng định kỹ thuật riêng về Salesforce.

## Tham khảo bổ sung cho kế hoạch source/Docker — 2026-10-02

- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order): health dependency và one-shot completion.
- [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying): standalone output cho container release.
- [NestJS database integrations](https://docs.nestjs.com/techniques/database): TypeORM integration; lựa chọn ORM trong repository là quyết định dự án.
- [Keycloak container](https://www.keycloak.org/server/containers) và [hostname/backchannel](https://www.keycloak.org/server/hostname): dev mode, public issuer và private connection.
- [MySQL implicit commit](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html): migration DDL không được giả định rollback như business transaction.
- [shadcn/ui Next.js](https://ui.shadcn.com/docs/installation/next): tham chiếu tích hợp UI khi scaffold; không có assets/code UI được tạo ở bước planning.
- [Ajv](https://ajv.js.org/): lựa chọn runtime validation cho JSON Schema; dialect/version được pin cùng toolchain ở SRC-001.

## Meta M3 source snapshots

[Local provider documentation dossier](references/meta/README.md) lưu Markdown chính thức, chỉ mục, URL/date/checksum và discrepancy review cho Meta Business Agent, Messenger Conversation Routing và media/webhooks. Đây là evidence nghiên cứu; không thay sandbox acceptance hoặc contract nội bộ.

## CRM schema và native Identity — PLAN-007

[Research notes](references/crm-database-patterns.md): MySQL8.4, Frappe CRM DocType/Contact/Deal, EspoCRM entity metadata và OWASP password/session. Chọn guideline riêng theo tenant/service invariants, không import nguyên CRM schema template.
