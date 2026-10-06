# SRC-025 M2 release gate

Status: Implemented and verified2026-10-06; M2 local/mock release gate PASS. Dependency SRC-024 DONE. CHG-20261006-02; test/release tooling only, no schema/API/event change.

Build the actual multi-stage backend and standalone web targets. Use a separate Compose project, fresh private credentials and loopback18080; never point to preview volumes. Verify non-root app users and record image IDs/platform. Native ARM64 and emulated AMD64 evidence must be distinguished; a build alone is not a smoke pass.

The upgrade fixture starts historical M1 backend revision `f575a8e` (schema8) with real Identity/registry/M1 seed, synthetic standard/custom records and associations. Snapshot every existing table as row count plus canonical hash (no raw CRM data or credentials). Stop application workers before migration. Current release applies v9–v17; require unchanged old rows and first8 journal entries, no-op rerun, correct runtime grants/readiness. This tests actual M1 source rather than truncating the current manifest.

Cold path starts current release on another empty database/project and provisions Alpha/Beta. Browser uses real OIDC, then configures published Workflow/Chatflow and submits credential-only CTM intake to the API. Actual worker must create session, process messages including explicit consent, handoff to Sales, and complete after UI accept. Also demo Human takeover/completion, duplicate delivery and tenant denial. Validate stored trace/owner independence and prospect lifecycle. SRC-023 metric and SRC-024 fault results remain required companion evidence.

Stop/start the release stack without deleting volumes and compare stable business data before/after; resume a persisted Workflow wait with the restarted worker. Keep test credentials private and clean only test containers/networks. Test volumes are retained, listed in the report, and never reused as a cold baseline. Report any build/runtime architecture limits honestly; Meta/LLM/production deployment remain out of scope.

[Manual/reproducible walkthrough](../development/m2-release.md) and [execution evidence](../tracking/details/SRC-025.md): native ARM64 and emulated AMD64 both pass cold/upgrade/restart and fresh real browser demos;180 regression and9 canonical gates pass. Native AMD64 hardware, remote CI and production deployment are not claimed.
