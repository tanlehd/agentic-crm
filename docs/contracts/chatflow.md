# Chatflow qualification contract — SRC-020

Status: Ready for implementation M2. CHG-20261005-06. Implementation status is tracked separately in [SRC-020](../tracking/details/SRC-020.md).

## Graph and publish

Exact graph `{entry_node,nodes}`; 1–30 nodes, unique keys `[a-z][a-z0-9_]{0,47}` excluding prototype names. Every node is reachable, acyclic and every path ends at `end`. No arbitrary expressions, URLs, model prompts or record selectors. Draft versions are immutable snapshots; publish validates tenant references and graph, active version CAS cannot change existing sessions. JSON Schema describes the wire shape; semantic validator checks graph topology and declared variable references.

| Type | Exact config | Edges |
|---|---|---|
| send_prompt | `text` (1–4000 chars), `variable_refs` (distinct variable keys) | next |
| collect | `variable_key`, `value_type` (string/boolean/enum), `required` boolean, `prompt` (1–4000 chars), `choices` only for enum | next |
| invoke_agent | `instruction` (ask_need/ask_contact_method/confirm_contact_permission), `allowed_tools` distinct subset of runtime tools | next |
| validate_qualification | `on_valid`, `on_invalid` node keys | config edges |
| upsert_lead | `{}` | next |
| request_human | `reason` (request_human/invalid_answers/qualification_incomplete), `target_chat_team` UUID | next (only after authorized continuation) |
| end | `outcome` (qualified/disqualified/needs_attention) | none |

M2 variable keys are service_interest, need_summary, preferred_contact_method, phone, contact_permission. The first, second and phone use string; contact_permission uses required boolean; preferred_contact_method uses required enum choices exactly messenger/phone. service_interest and need_summary must be required. Phone may be optional: empty input is valid only for optional collect, while final qualification always requires phone when preferred_contact_method=phone. One collect producer per variable. Field length bounds: service_interest255, need_summary4000, phone32; phone normalization/validation remains the Sales command's responsibility.

Templates use literal text and `{{variable_key}}` only, no nested paths or expressions. Declared refs must equal the placeholders used, and each producer must dominate the prompt on every path. Collect prompts are literal text (no interpolation). Runtime draft never counts as a validated producer for template interpolation. Publish also checks the outbound 4000 UTF-16-unit limit for literal prompts; JSON Schema maxLength counts Unicode code points. Prompt rendering must reject missing, wrong-type or oversize output before creating any outbound intent. Validation returns a detached graph snapshot.

## Explicit values and consent

Normalize inbound answers using Unicode NFC, trim and case folding; boolean accepts exactly yes/no/đồng ý/không đồng ý/true/false. It does not accept punctuation, substrings, numbers, inferred sentiment or model-generated values. Enum requires an exact normalized choice; string preserves normalized text and enforces field length. An invalid answer returns a typed invalid result, never a truthy fallback. Optional empty string/enum returns null; required empty is invalid. contact_permission is always required and cannot be optional or string/enum.

Persist validated values with provenance `{kind:message,message_id,node_key}` in the same transaction as the unique session/message turn. Consent evidence can only be created while processing the contact_permission collect, or by current Human owner completion with a bound inbound consent message. `qualification.save` may update draft service_interest/need_summary/preferred_contact_method/phone only. It cannot write consent or evidence, replace validated data, or mark the Lead qualified. A false consent ends disqualified immediately, cancels queued prompts/pending executions, and cannot be overwritten by later draft data. No marketing prompt follows refusal.

## Durable execution and module boundaries

Additive v14 (follow-up guards v15 and private proposal v16): definition/version, session, node_run and turn tables with tenant composite FKs. Session pins chatflow_version, parent_run, service actor/role and owner revision; start_action_key and active_conversation_key unique per tenant. active key remains occupied while paused_human. Terminal completion releases it. Nodes persist stable session:node:attempt prompt keys and fenced work; messages are claimed from Conversation's owning port ordered by received_at/id, including the opening inbound. No time-based cursor may discard messages predating session creation. Turn insert, value/provenance, node transition and prompt intent commit together in caller UoW. No network I/O in that transaction.

WorkflowChildren validates same-tenant published version and live service-role permission; start returns durable session_id. Result verifies exact parent_run_id and child ID before returning outcome/lead_id; cancel cancels active sessions and queued effects without deleting committed Leads. Sales handoff remains unavailable until SRC-021. Agent session port supplies only current pinned invoke_agent node, bound inbound and allowlist; callback validates execution ID/node/status/current owner before persisting effects. Takeover atomically pauses active sessions while retaining draft/validated values, cancels pending AI/queued prompts; close cancels sessions. principal.access_changed uses live access and preserves draft for Human handling.

Conversation message/outbound operations, Identity checks, CRM records, Sales qualification and Workflow parent authorization stay in owning-module application ports. Chatflow must not query those modules' tables directly. Lead creation uses deterministic session/contact/conversation binding, owner=current Conversation owner and team=intake; unique qualification_session_id enforces one Lead/session. Lead save/qualify, session terminal result and chatflow.completed outbox event commit atomically. A direct Lead command must not bypass an active session.

## Human transport and panel

Definition creation/version/publish/list mirror Workflow authorization, session/tenant/CSRF/Idempotency-Key; publish requires If-Match definition version. No public start/execute/fixture endpoint. GET /chatflow-sessions/{id} checks Conversation read plus scoped automation.read and filters qualification fields through live field policy; returns sanitized node/turn state, draft/validated/provenance and version, no runtime payload/transcript copies. Human panel uses the same API and shows consent evidence and field validation.

POST /chatflow-sessions/{id}/complete-qualification accepts `{qualification,consent_message_id,owner_revision}` and If-Match session version. Requires current Human owner, active paused_human session, live lead.create/qualify and relevant field read/write permissions. Evidence must be inbound in the same Conversation and explicitly affirmative; field requirements and phone normalization are checked by Sales. Never accept client-written consent_evidence or recorded_by. Backend attaches bound evidence. Same-key receipt replay rechecks current rights; different-key after terminal conflicts. Completion retains Human Conversation owner. Routes are implemented in SRC-020 with generated OpenAPI/client; browser evidence is tracked in the task detail.

## Verification gate

Graph/schema parity, wrong config/limits/paths/prototype keys, template dominators and consent parsing have unit tests. Storage/engine requires real MySQL tests: first message before start, duplicate turn, active-session uniqueness, crash/retry/fence, pinned versions, explicit refusal, runtime draft cannot consent, takeover retains data, close/cancel, same-session Lead uniqueness, exact Workflow predicate, Human ACL/CAS/evidence/replay and cross-tenant denial. Browser test must exercise the Human panel. Full AC-07/08/16 remains open until these integration gates pass.

## Execution refinement

Each node's synchronous effects and outcome commit in one transaction after a60s lease claim; final fence/deadline check precedes commit. This removes the Workflow engine's separate effect/finish crash gap within Chatflow. Waiting nodes rotate by checked_at; no Redis dependency. Runtime callbacks use the node's persisted execution_id and current session binding, not the expired worker lease. Runtime failure/owner or access change pauses with sanitized attention. A session never resumes AI after takeover implicitly; Human completion is terminal. request_human next is graph validation only; Human completion bypasses remaining AI nodes; cancelled node runs remain cancelled in the projection. invoke_agent waits for the next unclaimed inbound and stores a proposal privately; successful runtime completion creates an intent atomically with node advancement. A queued parent between Workflow steps is still live; completed parent may retain an independently running child, while failed/cancelled parent rejects effects.

Definition routes accept create `{key,name}`, version `{graph}`, publish `{}`; lists limit1..100 default50. Session lookup for inbox is GET /conversations/{id}/chatflow-session returning `{data:null}` if absent, with the same scoped read rules; latest retained session is returned after completion. Qualification form requires read/write on qualification and submitted fields. Draft is displayed separately from validated values. Message-backed evidence is authored server-side; no manual evidence object is accepted on this route. Published graph references teams through Identity at publish. Service actor/role are inherited from the parent Workflow, checked live for every node and callback. Session graph version does not include a separate service role.
