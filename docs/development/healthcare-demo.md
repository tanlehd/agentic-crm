# Healthcare M2 cold walkthrough

SRC-023 is a reproducible application-service demo in isolated MySQL, with private metric queries. It does not install fixture data in the browser preview. Requires Docker Compose v2 and the pinned dependencies/images described in [local setup](local.md).

```sh
pnpm test:healthcare
```

This runs `node scripts/integration.mjs --healthcare`: builds the actual test image, starts a separate `agentic-crm-kernel-test-<pid>` project with tmpfs MySQL, migrates an empty database and bootstraps synthetic actors/configuration. No development volumes are mounted. Passwords are random per run and never printed by the script. Containers and the test network are removed afterward; no reset or volume deletion on preview. Use `pnpm test:integration` for the full regression suite.

The console reports `SRC-023 KPI` and Vitest assertions. The baseline has12 inbound,4 conversations/contacts,3 CTM,3 qualified; CTM conversion and acceptance each2/3;1 pending; acceptance median180s/p95234s; first response median30s. Qualification groups reflect Human2/AI1 before Sales ownership, accepted_by Sales2. Customer conversion is null.

The runner exercises durable Intake ACK and both duplicate forms → persisted conversation.created selection → Workflow AI assignment and pinned Chatflow → actual MockSender dispatch → Human takeover/completion for A/D, AI collect for C, explicit refusal for B → Workflow handoff → actual Sales accept for A/D. C remains pending. There is no external Meta/LLM, Redis relay or browser in this harness; API/worker process recovery and release gates remain SRC-024/025.

Session SQL time is fixed inside this test DataSource only; production clock/source stays unchanged. Additional assertions add associations, repeated touchpoints and boundary/late events after checking baseline, then verify the original window. Metric SQL is private verification over synthetic persisted state, not an authorized report API. No cache or M5 report engine is implemented.

For restricted/offline environments use a previously verified dependency image, copy current source into it, and override only the disposable test image/build. Exact commands/image and evidence are recorded in [SRC-023 detail](../tracking/details/SRC-023.md). Do not replace the standard lockfile or use a floating external dependency install to match a local cache.
