# T05 — Messaging, workspace và session trên Chat DB

Thuộc SRC-109 / PLAN-057. Dependency **T04 DONE**. [Quy tắc chung](../chat-extraction-execution.md), [tracker](../../tracking/tasks.md), [handoff](../../tracking/chat-extraction-handoff.md).

Đọc contracts T01, dictionary T02, [capability matrix](../../architecture/chat-consumer-matrix.md), [Chat descriptor](../../services/chat.md) và implementation evidence của D2. Reuse transport/dispatch đã có; không dựng thêm send framework.

Hiện tại: T04 DONE, T05 IN_PROGRESS. History, ingress organic/referral và durable denial candidate đã có evidence trong [SRC-109](../../tracking/details/SRC-109.md). Không yêu cầu Contact archive saga/guard writer; phần source/data cũ xem [compatibility](../../contracts/legacy-record-archive.md). D2 Human send, workspace state/catalog/inbox và detail đã có candidate evidence; queue/sidebar và legacy collections đã có evidence; tiếp tục activity/notes và session hydration theo checkpoint.

## Phạm vi và đầu ra

1. Thay Channels/Core SQL ports bằng owner APIs: canonical Contact identity resolution/liveness, metadata/property definitions, channel/Page binding/attribution. Core/Channels có thể còn baseline deploy group nhưng không đọc Chat database thay Chat.
2. Nối actual ingress→Chat dedup/message/session, history/envelope v1/v2/v3, queues/Page filters, public IDs/cursors/field denial. Giữ Contact-bound semantics, không fallback tạo Contact khi owner outage.
3. Chuyển D2 Chat intent/job/claim/result/coordinator sang own registry/schema; đối soát legacy queued/sending/unknown và receipt lookup theo T02. Không để old/new sender cùng thắng; không resend unknown.
4. Nối unread/coverage, saved inbox/share, tags/snippets, snooze deadline, local activity projection và CRM note write/read/notification. Note body giữ Core; ACK loss dùng receipt cũ.
5. Nối acquisition/session/classification/process/progress/contribution/need assessment và custom values qua owner metadata. Giữ field-safe provider input/pins/stale-input check, không bật real provider. Follow-up/Sales/Workflow consumers hoàn thiện ở T06.
6. Thay migration-number feature checks bằng capability/own-lineage mechanism của T02; không copy baseline journal để vượt guard.

## Tiêu chí hoàn tất

- Candidate ingress/history/send và workspace/session thực thi trên Chat DB; Core/Connector boundaries gọi endpoint thật với own credentials.
- Boundary integration kiểm retained IDs/receipt/cursor, tenant/field negatives, duplicate/lost ACK, note reconciliation và D2 unknown/recovery trên đường đã đổi.
- Mọi implemented Chat capability trong scope có mapping handler→owner, không trả stub hoặc giữ hidden baseline SQL fallback.
- Recorded result chỉ rõ remaining external consumer integrations của T06. Build affected packages; focused tests và native changed boundaries, không full E2E mỗi feature.

Lũy kế dự kiến2/6, local2/14. Handoff ghi scope tested, exact candidate config/schema and remaining routes; T06–T09 theo dependency sau T05, theo yêu cầu hoàn tất của user2026-10-22; chưa chuyển main trước gate.
