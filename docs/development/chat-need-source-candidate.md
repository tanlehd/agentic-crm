# Chat need source candidate

SRC-109/T06, CHG-20261023-22, Codex2026-10-23. [Contract](../contracts/chat-need-source.md). Existing Workflow-only read-need now reads Chat-owned assessment under current native service/field authority and active CRM Contact policy. Recovery settles the original command/admission; no Workflow execution, DDL, main listener or deployment is added.

Commands run on Windows PowerShell with `. ./scripts/dev-shell.ps1`, Node24.21.0/pnpm10.33.0; retained synthetic native_identity_test43/test_crm_chat_owner4. Evidence directory: artifacts/chat-extraction/t06-delivery.

| Command | Result / log |
|---|---|
| pnpm build:chat | PASS need-source-chat-build.log |
| pnpm --filter @agentic-crm/backend build | PASS need-source-backend-build-2.log |
| node scripts/identity-owner-native-test.mjs '--focus=Chat need' --with-source --source-only | 8native groups PASS need-source-native-final.log |
| node scripts/check-chat-boundary.mjs --check | PASS need-source-boundary.log; no added edges |
| node scripts/generate-chat-owner-contracts.mjs --check | PASS need-source-contracts.log;237operations/668schemas |

Native evidence uses separate authenticated local HTTP peers and restricted owner database credentials. It covers closed history, only five builtin fields, stale/mismatched pins returning current=false, nonpositive version rejection, wrong tenant/Conversation/peer/actor, disabled actor, missing Contact/Conversation grants, all five need and two Conversation field denies, archived Contact, actual CRM outage, authority after admission, source/assessment races, completed native role barrier aborting disclosure and terminal-proof reconciliation after synthetic settlement outage. Need/history/outbox hashes remain unchanged by reads. No OS process-kill or main runtime acceptance is claimed.

Failed logs need-source-native.log and -2 through -5 remain retained: canonical hash helper initially received driver Date values; Contact permission incorrectly used an Identity-only capability helper; stale-version fixture used zero although the existing wire requires a positive revision. The hash and fixture were corrected, Contact permission now checks the current native all-scope grant. The first run overlapped a backend rebuild and is not final build evidence. The final run follows completed builds and adds the native revoke barrier case. Earlier7group PASS in -6 is superseded by the final8group run.

The reused harness still writes its historical t05 summary path; the final console log above is the scoped evidence. Full Human assessment regression passed13groups in need-source-human-regression.log. T06 remains IN_PROGRESS; source candidate does not increment D3 or count as standalone runtime.
