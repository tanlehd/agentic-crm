# T04 Human candidate acceptance — 2026-10-19

SRC-109/T04, Codex, dependency T03 DONE; [Human-first scope](../planning/human-first-omni-crm.md), CHG-20261019-25/26 and [local HTTP decision](../contracts/local-workload-http.md). T04 is complete as a candidate boundary implementation. SRC-109/D3 remains IN_PROGRESS, D3 2/6 and local2/17. No new extracted/deployed service is counted.

| T04 requirement | Implemented boundary / executed evidence |
|---|---|
| Chat-local registry, owner/team/share/version/history and custom values/index | Existing Chat repository/command CAS plus CRM-owned metadata pin/reservation; atomic JSON/index/audit/five-watermark writes. Chat native5groups and custom8groups within the composed25group run |
| Current Identity/session/target authority and tenant isolation | Native SQL admission/settle, current role/seat/team/field policy, workload registry, tenant/account/admin/app revoke barriers; cross-owner proof checks and restricted SQL credentials. Composed25groups over HTTP local, no transport allow stub |
| Human assignment/takeover and ownership close | Native Identity + Routing capacity + Chat-own SQL; same-key/conflict/concurrent replay, fresh receipt rights, owner/control CAS, lost confirmation and close ordering. Composed assignment group plus Routing6groups |
| Queued/in-flight effects, audit/control delivery | Chat5groups verify local effect transaction, watermarks/history/contributions, snooze and queued-only cancellation; sending/unknown retained. Subscriber mounting/cumulative remote processing remains T06 |
| Public candidate composition | Native-session assignment/takeover/history BFF; private CRM custom patch/receipt; public Routing skills/profile/team-skills/queue configuration with CSRF, references, current configure rights, CAS, immutable ledger, native capacity drain and revoke. Four Routing configuration groups are included in the final25 |
| Recovery and runtime transport | Existing owner wire schemas remain v1,184operations/526schemas. Local HTTP keys + signed native current registry; TLS optional12groups still PASS. D2 local images rebuilt/switched, readiness PASS and actual public synthetic Human send reaches sent without legacy receipt |

Final source run: `node scripts/identity-owner-native-test.mjs` — **25groups PASS**, transport=http-local,0transport retries; `artifacts/chat-extraction/t04/human-composed-http-final.log` and `identity.json`. Separate `chat-owner-native-test.mjs`5groups, `routing-owner-native-test.mjs`6groups, `workload-tls-test.mjs`12groups PASS. Contract/HTTP checks and static/source manifests are listed in [SRC-109 evidence](../tracking/details/SRC-109.md). Tests retain synthetic data and use no DB/Redis reset.

## Exact downstream boundary

T05 owns full generic Conversation public hydration and messaging/workspace/transition responses. T06 owns automatic Routing intake/backfill/dispatch/reroute/work/report consumers, complete CRM Contact/mapping references/main metadata writer mounting and other consumer wiring. Candidate configuration mutates its native configuration/ledger and drains existing reservations; it does not claim automatic enrollment of every baseline session or immediate dispatch. T07/T08/T09 own independent Chat packaging, broad parity and main single-writer cutover. All existing main Chat routes still use baseline implementation. D2 HTTP maintenance is separate from D3 Chat extraction.

AI Runtime capacity/execution/successful AI assignment is DEFERRED, with eligibility and shared owner/control safety retained; existing AI target policy regression is not AI execution acceptance. No browser E2E, production/provider, new schema migration, commit or push is claimed.
