# Chat cutover — accepted minimal units

T09/SRC-109 DONE; D3 Human-first6/6/local3/14. [Current runtime and exact commands](chat-main-local-runtime.md), [evidence](../tracking/details/SRC-109.md#t09-legacy-retirement-and-main-cutover--2026-10-27).

| Unit | Accepted change | Recovery |
|---|---|---|
| Chat API/worker | Own crm_chat4, separate grants, same image3955d4e…, gates epoch2; six jobs | Freeze then recover same DB with higher epoch, recreate both containers with main network overlay |
| Baseline public API/shared worker/owner adapters | Image3281bccc…; native owner ports and remote Chat forwarding, old Conversation graph removed | Keep source writer accounts locked; restart compatible pinned baseline |
| Existing Connector transport | Original image/database retained; direct Chat/Identity callback URLs and matching synthetic Beta binding | Preserve attempt/receipt IDs; never renew expired grants or resend unknown |
| Reporting | Original image/database, direct existing MySQL network | Use its main network overlay; no business consumer rollout |
| Windows TCP entry / existing Next web | Local13001→Docker API13101; Web18080 forwards to13001 | Restart exact host processes; no credentials/state in TCP relay |
| Superseded D2 processes | Chat/coordinator/Identity containers removed, volumes retained | Never restore stale writers after target writes |

Six legacy accounts remain locked. Final source snapshot/copy/reconcile, main Human/non-Chat/negative smoke, post-write restart/freeze/forward recovery, original effect hashes and fresh publication/local inbox are accepted. No production or real-provider claim. Other business owners remain their own delivery scope; required baseline adapters are not extracted services.
