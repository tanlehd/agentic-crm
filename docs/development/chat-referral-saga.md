# Native referral processor candidate — T05

CHG-20261021-02, Codex2026-10-21, SRC-109/T05 IN_PROGRESS. [Contract](../contracts/chat-referral-saga.md), [table design](../data/channel-ingress-touchpoint.md), [evidence](../tracking/details/SRC-109.md). Mock CTM only; no main traffic/automatic worker.

Chat stages a digest-bound candidate through Channels HTTP after native Identity and four reference holds, then commits Message/source/session link/receipt locally. Channels finalizes from native command proof. Only bound rows count as observations; prepared remains recoverable, cancelled/discarded are retained audit. Late evidence has no session; active session opening source remains immutable.

Source: Chat ingress.ts coordinates/recover; ingress-message.ts writes lifecycle; owner-command.ts emits minimized ingress_result. Backend Channels owner-touchpoint.ts owns SQL/HTTP; Identity owner-admission/owner-http allow Connector admission-read only for prepared pinned referral commands with current integration rights. No foreign SQL/FK/UoW.

Run with pinned toolchain:

```powershell
$env:PATH = "$PWD\.local\node-v24.21.0-win-x64;$env:PATH"
node .local/tooling/node_modules/pnpm/bin/pnpm.cjs test:chat:ingress:referral
```

Initial explicit operator invocation adds --provision to node scripts/identity-owner-native-test.mjs --focus="Chat ingress" --with-processor --with-referral. It provisions immutable services/crm-connector/migrations/channels001-touchpoint.sql only into retained native_identity_test; separate Channels test user receives SELECT/INSERT/UPDATE. Source SHA/live SHOW CREATE pin: private .local/chat-ownership/touchpoint-schema.json. Other private fixture files contain credentials; never print. No baseline43/Chat004/main/legacy edit or reset; applied SQL/SHA immutable.

Full native run includes8accept/read,6organic and7referral groups; successful processing adds9organic and11referral Messages. Retained tenants/Contact/connection/actor, per-run identity namespaces. Close setup is a local fixture, not public Human command. All failures/retries retained;2second transport deadline unchanged. Native suites run separately from heavy builds.

Recover original tenant/command digest via ChatIngress.recover: resolve parent, finalize Channels, release holds, settle Identity. Unknown outcome retains state; never manually bind or replay Message to repair ACK. Rollback disables caller, retains rows and recovers terminal commands; main adapters unchanged.

Remaining T05: terminal-denial classification, connection disable compatibility, own D2 send, workspace/notes, detail/queue/session hydration and capability lineage. T06/main activation gated. Actual results in SRC-109/referral-* artifacts.
