# T08 — Nghiệm thu candidate Chat và phục hồi

DONE, Codex 2026-10-25; dependency T07 DONE. [Composed acceptance](../../quality/t08-chat-parity-acceptance.md) records actual-runtime Chat parity, producer/local recovery, post-write freeze/forward replay and final validation. D3-05 accepted; main cutover remains T09.

Phạm vi hiện hành CHG-20261023-19: [nghiệm thu theo owner](../../governance/service-delivery-scope.md), [16 nhóm và consumer handoff](consumer-handoff.md). [Human-first](../human-first-omni-crm.md) giữ nguyên: AI-only execution/composition DEFERRED; Human hoạt động khi AI Runtime không cấu hình/không khả dụng; retained AI state kiểm trước cutover.

Thuộc SRC-109 / PLAN-057. Dependency **T07 DONE**. [Quy tắc chung](../chat-extraction-execution.md), [tracker](../../tracking/tasks.md), [handoff](../../tracking/chat-extraction-handoff.md).

Đọc exact acceptance/compatibility T01–T02, evidence T03–T07 và [testing policy](../../development/testing-policy.md). Đây là composed acceptance của Chat trước cutover; main traffic chưa chuyển.

## Phạm vi và đầu ra

1. Pin candidate image/source/schema/config. Ma trận 16 nhóm ghi case IDs, owner, Chat-owned/required compatibility/other-owner/AI-deferred, fixture/command/artifact và test mới/historical/NOT_RUN. Không dùng inventory toàn hệ thống làm checklist xây hết consumer.
2. Chạy public Chat→Chat API/worker→own DB qua actual processes: ingress/history/send, assign/takeover, inbox/unread/tags/snippets/snooze, notes/contact, session/classification/need/progress, persisted attribution/domain source reads và generic/external Chat routes. Dependency đồng bộ bắt buộc dùng actual compatible owner API, có thể trong baseline. Không yêu cầu Routing/Workflow/Sales/Reporting đã extract hoặc deploy phiên bản mới.
3. Chat producer kiểm durable delivery theo transport đã chọn với receiver kiểm contract và mất ACK/retry/restart. Ghi rõ synthetic receiver, không gọi đó là downstream business E2E. Chat-owned inbox/consumers/scanners kiểm effect/recovery của Chat. Business consumer khác theo backlog owner, không chặn D3-05.
4. Fault tests theo boundary bị đổi: wrong tenant/field deny, revoke/owner races, duplicate/reorder/ACK loss, dependency outage, worker crash/restart, unknown→matching-proof sent và Chat backlog recovery. Không fault-inject bằng dừng shared main app.
5. Migration/restore và freeze + forward recovery rehearsal trên retained candidate với writes sau snapshot theo [T02](../../architecture/chat-data-migration.md#rollback-downstream-effects-and-no_go); bảo toàn Chat receipts/events, remote refs và side effects thực tế của các command trong scope. Đối soát no-loss/no-duplicate/in-flight; không switch URL về baseline cũ sau writes. Reverse replay về monolith không thuộc gate hiện tại; T02 yêu cầu recovery manifest riêng nếu sau này có nhu cầu. Không mở feature downstream mới để dựng rehearsal.
6. Chạy required CI/release checks phù hợp và sửa defect trong scope. Build lại candidate nếu source đổi, rerun affected cases; evidence cũ không gắn cho image mới. Chốt bảng deployment units tối thiểu cho T09 và recovery của từng unit.

## Tiêu chí hoàn tất

- D3-05 đạt cho Chat-owned capabilities và compatibility trực tiếp qua actual processes; không unresolved critical auth/data/correctness failure trong scope. Phần other-owner ghi backlog/status riêng, không ghi PASS từ test producer.
- Restore/rollback rehearsal và NO_GO criteria có evidence; T09 đủ exact commands, unit list, schema/image pins, writer fence/reconcile và recovery.
- Public Chat identifiers/legacy receipts/cursors giữ đúng; synchronous dependency không bị mock thay trong composed acceptance. Synthetic provider/receiver được ghi đúng giới hạn. Real provider ngoài scope.
- Handoff là release candidate cụ thể. T08 không buộc rollout hay nghiệm thu end-to-end nghiệp vụ toàn bộ service khác.

Đích có điều kiện: lũy kế5/6, local2/14. T09 tiếp tục theo execution override đã được user chốt; không tự mở D4.
