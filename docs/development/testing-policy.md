# Kiểm thử theo phạm vi thay đổi và mốc bàn giao

## Phạm vi nghiệm thu service — ADR-029

Áp dụng [service delivery scope](../governance/service-delivery-scope.md). Producer/API acceptance kiểm contract và durable publication/ACK/retry/restart ở boundary của owner; không buộc hoàn tất nghiệp vụ mọi consumer. Broker thực (nếu stream dùng broker) hoặc HTTP relay với durable contract receiver phải có evidence, không chỉ mock publish callback. Receiver test phải ghi rõ synthetic, không thay receipt subscription thật hoặc được gọi là business E2E.

Composed acceptance dưới đây áp dụng cho hành vi service đang bàn giao cùng synchronous/compatibility dependencies bắt buộc. Dùng owner APIs hiện có trong baseline khi tương thích; không cần extract/redeploy tất cả dependency. Consumer local của service vẫn cần inbox/effect/recovery evidence. Whole-system business E2E thuộc integration scope riêng; owner backlog chưa xong không chặn producer service. Giữ required CI, tenant/security, single writer và rollback checks.

Ready process policy — PLAN-056 / CHG-20261018-22, 2026-10-18. Áp dụng từ phiên tiếp theo; không vô hiệu CI, security invariants hoặc evidence lịch sử. [Delivery plan](../planning/service-delivery-reset.md). Một task dài có thể chứa nhiều edit/build/checkpoint trước một lần acceptance cuối.

## Chọn tầng test

| Thay đổi | Inner loop bắt buộc phù hợp | Khi chạy rộng hơn |
|---|---|---|
| Chỉ tài liệu | Docs/link/diagram syntax và diff whitespace | Không unit/native/E2E/build image |
| Pure rule, mapper, UI component | Unit/contract/component tests đúng file và typecheck package bị tác động | Package suite khi đổi public behavior/API; UI smoke khi ghép màn hình |
| Application orchestration | Focused unit với ports và regression case của bug | Component integration tại checkpoint sau khi các phần đã nối |
| SQL/transaction/grants | Native tests của owning repository: tenant, atomicity/concurrency/replay liên quan | Cross-component regression nếu đổi transaction contract hoặc shared UoW |
| Migration/manifest | Checksum/journal + preservation trên fixture đã có dữ liệu + no-op | Chạy một lần trên final migration candidate và rerun sau sửa migration; không scan mọi bảng cho mỗi mapper edit |
| Wire/auth/TLS/boundary | Strict schema/type + targeted negative auth/correlation/transport tests | Cross-service integration khi đổi caller/route/authority; không đợi release mới test lỗi bảo mật mới |
| Composition/entrypoint/image | Build affected packages/image một lần, startup/readiness, real network smoke | Composed E2E ở milestone/cutover và khi đổi wiring làm ảnh hưởng flow đã nghiệm thu |
| PR/release/shared kernel | Required full verification/CI và risk-based integration | Rerun khi code/input/environment thay đổi hoặc failure chưa giải quyết; không sau mỗi sửa doc |

E2E nghĩa luồng chạy qua entrypoint/process được deploy, owner API, worker, database và kết quả người dùng; mock provider phải được ghi rõ. Native MySQL + injected callbacks là integration. TLS probe là transport integration. Không đổi nhãn để tăng evidence.

## Cách chạy hiện có, tránh lặp

- Focused Vitest: `pnpm exec vitest run services/core-baseline/tests/dispatch-proof.test.ts` (đổi path theo phần sửa). Parser check cho harness vừa sửa: `node --check scripts/lib/chat-outbound-native.mjs`. Đây là lệnh hiện có, không cần boot DB để bắt syntax/Ajv import lỗi.
- Contract suite chọn file: `node --test scripts/tests/dispatch-contract.test.mjs`. `pnpm contracts:check`/`schemas:check` khi schema/generator/contracts thay đổi; build affected consumer sau generated type change.
- Human dispatch hiện kiểm bằng `pnpm test:chat:outbound:native` trên own-schema Chat, native Identity và Connector. Harness dispatch baseline và ba command lồng nhau đã được xoá ở T09; evidence SRC-101…106 là lịch sử. Chỉ chạy lại suite phù hợp với thay đổi.
- Native script hiện vẫn có setup/migration snapshot đi kèm và chưa có group filter. **Không giả định có --scope/--skip-migration.** Cần tách setup/migration/owner/component suites khi chỉnh harness trong delivery task, giữ assertion và audit. Không mở task refactor testkit độc lập nếu không trực tiếp giúp milestone đang làm.
- Wrapper `pnpm test:*` có build. Dùng chúng khi cần chắc chắn dist mới. Chỉ gọi trực tiếp `node scripts/...` sau affected build exit0 và không có source/generated changes từ lần build đó. Ghi revision/dirty snapshot cùng artifact; không chạy JS emit từ build lỗi.
- Không chạy full unit rồi focused unit chứa đúng subset đó trên cùng source chỉ để thêm bằng chứng; focused run sau failure hoặc thay đổi source vẫn hợp lệ. Full unit hiện khá nhanh, được dùng khi ảnh hưởng chưa rõ; không mặc định luôn là lãng phí.
- `pnpm verify` và CI hiện giữ nguyên. Không tắt gate hoặc sửa baseline để qua kiểm tra; thay dependency cần review thực. Không chạy full verify sau mỗi checkpoint nội bộ.

## Checklist cuối delivery

Một evidence record cho final candidate: source/git working-tree ref thật, changed scope, test commands đã chọn và lý do, exit/result, image/schema/config không chứa secret, artifact paths. Acceptance E2E chạy khi composition hoàn chỉnh; rerun khi thay runtime path sau đó. Unit/security/repository invariant tests chạy ở tầng thấp tương ứng, không copy mọi negative case thành browser E2E.

Mỗi test sửa phải nhằm hành vi/rủi ro, không test chỉ để kiểm cùng implementation hoặc đáp ứng số lượng. Chỉ reuse old PASS khi scope/input/build không đổi và ghi rõ historical evidence; nếu chưa chạy thì NOT_RUN. Không reset dữ liệu fixture/volume, không fault-inject bằng dừng shared app. Bảng số lượng test không thay tiến độ service.
