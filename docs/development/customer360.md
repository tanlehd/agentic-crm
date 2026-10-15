# Customer 360 trong Inbox — SRC-068

[Contract](../contracts/customer-360-session.md) · [Evidence](../tracking/details/SRC-068.md).

Mở http://localhost:18080 → Inbox → chọn hội thoại → Customer 360 (mobile: nút thông tin liên hệ). Panel tự dùng session đang mở; bộ chọn lịch sử phiên chỉ dùng để xem nguồn cũ, không đổi session đang xử lý.

- Leads/Deals liệt kê theo Contact và quyền hiện tại, có tải trang tiếp. Chọn một hồ sơ rồi **Tiếp tục … trong phiên** để liên kết nhu cầu; nguồn và owner không thay đổi.
- **Tạo Lead cho nhu cầu mới**, **Tạo Deal trực tiếp**, hoặc **Tạo Deal từ Lead đang chọn**. Deal kế thừa nguồn Lead khi có Lead, nhưng session thực sự tạo Deal được lưu riêng. Cập nhật Deal won từ panel lưu closing context.
- **Xem xét hợp nhất Lead trùng** → chọn Lead giữ lại → xem trước → ghi lý do → xác nhận. Cần quyền archive trên Lead trùng và qualify trên cả hai. Lead giữ lại không bị ghi đè; hồ sơ gốc, Deal và lịch sử được giữ. Active Chatflow/pending handoff hoặc merge chains bị chặn. Không tự cấp thêm quyền.
- Ad mới trong phiên mở chỉ thêm touchpoint. Đóng phiên kết thúc lượt xử lý; inbound hợp lệ tiếp theo mở lượt mới. Tin muộn trước biên đóng không tự mở lại phiên.

## Verification / operation

Windows: `. ./scripts/dev-shell.ps1`. Tests reuse native_seed_test synthetic data; no reset.

```powershell
pnpm --filter @agentic-crm/backend build
node scripts/acquisition-session-test.mjs
node scripts/customer360-browser.mjs
pnpm test:unit
pnpm test:healthcare
```

The browser command uses existing local Alpha fixture credentials from ignored .env and actual native HTTP; it does not grant permissions. The healthcare command uses an explicitly isolated disposable Compose project, not persistent local MySQL/Redis. Existing acquisition-session-browser command delegates to the current journey.

Explicit local cutover: build backend, then `node scripts/customer360-local-upgrade.mjs`. It requires local development target and managed API/worker, stops writers, saves a private dump, verifies all preexisting table rows, applies forward migrations, grants SELECT/INSERT only on the three new ledgers, reruns migrations as a no-op and restarts API/worker. Failure during migration leaves writers stopped for review. Existing migration history is unchanged. Never run against production or as normal startup.

For a Next production build alongside local dev, use `NEXT_BUILD_DIR=.next-customer360-build`, preserve next-env.d.ts/tsconfig and restore those generated-file changes after verification. Default `.next` is locked by dev on Windows.

Artifacts: artifacts/customer360 (native browser, inspected desktop/mobile screenshots, private backup, upgrade fingerprints, unit/build/healthcare logs); artifacts/acquisition-sessions/mysql.json (current 11 persistent MySQL groups). All private artifacts remain ignored.

## Remaining target scope

Configurable session process/stage/history, scoped behavioral milestones/corrections and connected funnel queries remain the [final ERD](../data/chat-sales-erd.md) follow-up. These features are not inferred from the context ledger. No live Meta integration, auto-merge, automatic reassignment, stage-based qualification or duplicate won revenue is introduced.
