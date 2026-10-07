# Checkpoint — điểm tiếp tục

Updated2026-10-07, S-20261007-13 (design Git sync). UX-006 DONE design-only: target Conversation.next_action.type=response/create_lead/create_ticket/close_chat replaces independent need_response; UI maps typed suggestion. [Evidence](details/UX-006.md). Runtime SRC-041 below remains legacy until PLAN-008/source cutover. UX-005 DONE design-only: tách Conversation suggestion state/action với Workflow/Chatflow orchestration; AI Assist chỉ đề xuất, rule-only cũng dùng cùng update action. [Evidence](details/UX-005.md). SRC-041 DONE supersedes inbound semantics: need_response=null / “Chưa xác định”; true from future valid Workflow/Chatflow suggestion action (rule or Assist proposal). Sent coverage still false. [Evidence](details/SRC-041.md). PLAN-008 exact Conversation action + rule/Assist orchestration contracts TODO. SRC-040 DONE: conversation.need_response và nhãn chờ/đã phản hồi đã kiểm thử API/browser; [evidence](details/SRC-040.md). SRC-039 DONE scoped presentation: approved no-tab shell + API-backed Inbox. [Evidence](details/SRC-039.md), [UX hub](../ux/README.md). Native header/nav/tool search/create, queue/search/filter, Contact context/dialog, messages/notes/reply, takeover và draft guards đã chạy local. Main bắt đầu dưới header56, không work tab bar.

## Bước tiếp theo

Không task active. Ưu tiên tiếp theo cho nhánh Next action: PLAN-008 (dependency UX-006 DONE), chốt exact nullable typed payload/catalog, source/basis/revision, action/API/ACL/idempotency, tenant-owned persistence/migration và compatibility bỏ need_response. Sau design gate: triển khai storage/action + UI mapping, kiểm rule-only; tiếp đó Workflow/Chatflow binding và Assist suggestion-only. Chưa claim hoặc bắt đầu source trong phiên sync. Nhánh Inbox tổng thể còn SRC-035 Contact metadata/channel identities; SRC-036 hoàn tất full workspace sau SRC-035: saved-inbox lifecycle/share, tag management, read-marker writes, snooze/status actions, unified activity, browser history/deep links và remaining acceptance. SRC-037 release/regression riêng. Đọc source task dependencies và scoped Ready trước claim. PLAN-007B physical schema extraction vẫn TODO, không song song tự động.

## Workspace và verification

Main base45e99ac; working tree dirty README/docs/mock từ UX-003/004 được giữ, thêm app shell/Inbox components/styles và scripts/inbox-layout-e2e.mjs. Không commit/push/deploy, agent hoặc lịch nền. Runtime code đã hot reload trên localhost:18080. Browser9 groups/6 viewport PASS,104 unit tests PASS, Next production build PASS. Evidence gồm ignored artifacts/SRC-039/browser.json và desktop/mobile screenshots; task detail ghi initial failures/fixes và limitations. Docs/whitespace final results trong log.

Không toàn bộ UI design đã chạy: mở conversation chưa mark-read; snooze/status controls chưa có; Contact channel identities/full activity còn task sau. User study/full AA/real mobile keyboard/live Meta/full release/restart NOT_RUN. Bản build đạt không đồng nghĩa deploy.

## Runtime / dữ liệu

Existing web18080/API3001/worker3002 hoạt động khi browser test; MySQL13306/Redis16379 theo cấu hình local, schema23 từ SRC-038. Monitor last-known127.0.0.1:3020 PID50204, SRC-040 restart API qua monitor để nạp projection; readiness200 và browser PASS, không reset DB/Redis. Connector chưa cấu hình, Keycloak stopped/volume giữ từ SRC-038. Không migration hoặc reset dữ liệu. Synthetic Contact src039-layout-synthetic được tái sử dụng; inbound/note/reply kiểm thử được giữ.

Native session/quyền vẫn MySQL.13 target service schemas chưa physical extraction. SRC-038222 MySQL/16 native tests là evidence lịch sử, không rerun toàn bộ trong SRC-039. Bước tiếp theo theo tracker, không tự commit/push hoặc reset data.

SRC-041 final:10 browser groups/6 viewport,107 unit,31 prototype checks, backend/web types, contracts/schema/lint PASS. Fixed MySQL GREATEST numeric comparison of decimal-string reply sequence (9->11). Actual synthetic sent/follow-up verified after fix; artifacts/SRC-041. API/worker restarted via existing monitor and ready, DB/Redis retained. No active task or new services. Assist classification/Next action is product design only until PLAN-008 gate; no live adapter configured.

UX-005 không thay code/service/DB; docs-only. PLAN-008 cần chốt exact schema/action/ACL và flow trước source; không đánh dấu rule/Assist integration đã chạy. Không task active, giữ toàn bộ dirty work phiên trước.

UX-006 không thay runtime/mock/schema/DB. PLAN-008 cần exact typed payload/action/ACL và compatibility retire need_response; không task active. Dữ liệu phân loại gợi ý tách sent/lifecycle evidence; rule hoặc Assist đều qua Workflow/Chatflow.

S-20261007-13: user chỉ định commit/push thiết kế. Commit phiên này gồm README/docs/mock/evidence, không gồm source apps/packages/scripts đang dirty của SRC-039…041. Các task source DONE ở tracker là kết quả local có evidence, chưa được đưa lên Git trong design commit; người tiếp tục phải giữ hoặc sync source riêng trước triển khai phụ thuộc. Không đổi runtime/DB/services.
