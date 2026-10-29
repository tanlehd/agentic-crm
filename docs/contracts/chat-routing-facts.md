# Routing reply facts from Chat

SRC-109/T06, CHG-20261023-16, Codex2026-10-23, Ready. Refines the existing [Human routing](human-routing.md) and [operations reporting](operations-reporting.md) Chat source boundary. No new business metrics, DDL or main route activation.

Routing calls additive private `chat/routing-reply-facts` with the enrolled Human actor, unique session IDs (at most5000), UTC lower bound and mode `aggregate` or `facts`. Only the Routing workload may call it. Identity requires the current native Human session, `routing.read:all`, Conversation read-all/assign-all and readable owner/team fields. The service dispatcher cannot use this reporting authority. Reporting's intersected report grants and source preparation remain its consumer responsibility.

Chat prepares a fresh read command whose immutable request/digest binds mode, session selection and lower bound. It obtains Identity admission before reading session existence or facts. Every selected session must exist in the same tenant; missing references fail explicitly. Empty selection still checks current authorization. No Message/Contact body, credentials or raw Access leave Chat.

Only `outbound_submitted` contributions with `actor_kind=human` and recorded_at at or after the lower bound count. Closed sessions remain valid. Actor/team/time are historical facts, independent of the current owner or membership. Aggregate mode groups by actor and returns submitted reply counts (at most500groups); it does not impose a5000reply limit. Fact mode returns the original contribution/session/actor/team/recorded_at fields with stable time/id ordering, at most5000facts. Overflow fails with the existing `ROUTING_REPORT_LIMIT` or `OPERATIONS_SOURCE_LIMIT`; no silent truncation or partial reply.

The result is captured under admission, hashed, then re-read in the final Chat transaction. Source drift rejects the response. Identity revoke/logout drains can abort the read command before its commit. Cleanup settles the exact admission; failed owner calls never become zero counts. The read receipt stores only the snapshot digest, not the entire report. Retries make a fresh authorized read rather than serving an old authorization result.

The scoped response/named snapshot budget is2MiB, with a10s composition deadline; all requests retain the existing256KiB budget. Parent session locks serialize append-only contribution inserts through the same-owner FK. Reading immutable contribution rows needs no UPDATE permission; their historical data remains protected by the existing grants.

Routing's native source adapter validates mode, digest, selected-session/time bounds and uniqueness before returning the baseline DTOs. Aggregation is performed at Chat to avoid fan-out; Routing keeps its own allocation/work/queue facts. Public Routing work/config assembly, reroute, Reporting mounting and runtime scanners remain separate T06/T07 requirements.

Acceptance: actual Identity/Chat/Routing workload HTTP; aggregate/fact equivalence, same-tenant and closed sessions, historical actor/team, excluded AI/other-kind/older contributions, current role/field/session revoke, before-admission and before-commit logout, concurrent source drift, actual outage, duplicate IDs and5000/5001 bounds. Retain synthetic fixtures and history; no reset.
