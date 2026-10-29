# Unified Workflow orchestration contract

ADR-027 / CHG-20261021-07, accepted target direction2026-10-21. Defines responsibility and execution semantics. Exact wire/schema adapters and physical migration are implementation work in [PLAN-024](../planning/workflow-platform.md), not claimed deployed APIs.

## Owner boundaries

Workflow is the sole owner of configurable business flow definitions, triggers, branching, waits, follow-up and execution history. CRM owns Contact/Company/Activity/custom records, Sales owns Lead/Deal, Ticket owns support records, Identity owns User/principal/team and Chat owns Conversation/message/episode. Each remains the sole writer of its aggregates. Routing is a candidate/capacity allocator invoked by a flow; it does not host a second configurable business flow engine. Intrinsic owner safety (ACL, tenant checks, CAS, closing a session, preventing stale sends) stays synchronous at the owner.

One Workflow service owns authoring and execution in crm_workflow. Web editor, API, engine, event consumers/schedulers and workers are components/entrypoints, not separate services or schemas. AI Runtime performs bounded inference/tool execution; it does not define another business orchestration graph. Conversational collection/qualification uses the same run/step/wait/action model.

## Object and capability catalog

CRM owns canonical CRM/custom metadata; Sales/Chat/Ticket publish their supported fields/commands through the agreed catalog. Identity owns User/account/principal/team descriptors and exposes only permitted business fields/events. Workflow composes owner descriptors; it cannot invent a universal update endpoint or treat Identity user as a CRM record. Existing catalog v1 lacks some of these surfaces; a versioned extension must declare them before activation.

Each trigger/action declares owner, object kind, schema version, current permission requirements, field coverage, availability and receipt/read capability. Unavailable Ticket/User/communication adapters prevent activation only for flows using them; they do not block unrelated flows or force fake implementations.

## Change triggers

Owner commits state and its outbox atomically. Workflow receives a versioned tenant/source/event ID, aggregate reference/version or sequence, event type, changed-field coverage, correlation/causation and an authorized snapshot reference where available. This describes required information, not a replacement wire envelope for already issued events. Do not include password, token, credential verifier or raw transcript in a general change event.

Enrollment dedups stable event identity plus definition/version under an activation boundary. Evaluate changed-field/entry conditions against the declared source revision, not a later guessed record state. Gap/unknown requires reconciliation; retain the event identity on retry. Workflow unavailable does not roll back owner changes. Existing chosen Kafka direction remains for generic object-change transport; service unification does not require a new broker or make Kafka a prerequisite for every existing local flow.

Workflow-produced changes carry causation. Bound repeated enrollment per flow/resource/causal chain and suppress no-op writes; do not solve loops with a global block on all object changes. User/security changes never automatically authorize privilege escalation.

## Actions and execution

Nodes cover trigger/filter, branch, typed read/query, named owner command, routing request, communication, AI execution, durable delay/event/message wait, Human task/resume and end. A qualification template composes these nodes; it has no separate Chatflow runtime. Schema/version validation is shared with the editor; approved future nodes remain unavailable until implemented.

Pin definition version and stable action key. Execute remote calls outside Workflow SQL locks. Lost ACK reads/reconciles the same owner's receipt; unknown is not absence or permission to issue a new action key. For partial multi-record effects, persist each target outcome and expose partial/attention; no fictitious distributed rollback.

Wait subscribes to the exact run/resource/action with tenant isolation, handles event-before-wait and dedups message/response consumption. A Human response checks current ownership/rights and the expected run/step revision. Chat stores messages; Workflow stores necessary references/validated values/provenance. AI output is a draft, never consent evidence. Session close/takeover/revoke makes stale effects fail at the owner even before Workflow sees the event.

## Routing flow

Owner event → Workflow rule/branch → Routing candidate/reservation → owning-service assignment CAS → terminal result/receipt → Routing confirm/release and Workflow next step. Use existing tested assignment protocol; this is the ownership sequence, not a new public route.

Only one enrollment/command path is active for a configured business routing flow. Existing autonomous routing starters are inventoried at migration and drained/disabled per flow before enabling Workflow enrollment. Capacity reconciliation and owner safety workers remain local responsibilities; removing duplicate business starters does not remove these workers.

## Publish and runtime control

Definition/version/publish/activation state is local to Workflow. API and worker may communicate asynchronously inside this service, but there is no required cross-service install/activation saga or duplicate mutable definition authority. Enabled generation determines enrollment; running flows keep their pinned version. Disable stops new enrollment; cancel addresses a particular run and cannot undo already committed business effects.

One editor exposes only available capabilities and shows accepted/pending/unknown/failed distinctly. Historical graphs with unavailable nodes are read-only; the legacy qualification panel is removed.

## Compatibility and acceptance

[Retirement](legacy-chatflow.md) removes the old runtime/data through forward migrations. Preserve business records and immutable Workflow/audit evidence, cancel dependent runs explicitly, and reject retired graph primitives. Future common conversational nodes require their own implementation acceptance. No old prompt replay or duplicate Lead creation.
