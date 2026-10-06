# Checkpoint — điểm tiếp tục

Updated2026-10-06, S-20261006-04 (SRC-025 Git sync).

## Trạng thái

SRC-001…025 DONE (25/25). M1 và M2 local/mock release gates PASS. Không task active. [Tracker](tasks.md) · [SRC-025 evidence](details/SRC-025.md) · [release runbook](../development/m2-release.md).

Release backend/web đã build và chạy ARM64 native + AMD64 emulated. Actual M1 baseline f575a8e/schema8→17 giữ31 bảng cũ/10 CRM records, journal checksum và migration no-op. Whole-stack stop/start giữ all-table hashes; timer đã persist hoàn tất đúng một lần. Hai architecture đều qua cold database + real Chrome/OIDC/API/worker CTM→AI-owned qualification→Sales UI accept; Human takeover/form/completion/handoff, owner independence/prospect và tenant denial.

## Git và file

Branch main. SRC-024 commit3476707 và SRC-025 commit `f35ea60` đã push origin/main theo user. Checkpoint/log/evidence Git sync được ghi trong docs commit tiếp theo. Không product source/schema/API/event/migration change, không production deploy.

## Evidence

`artifacts/SRC-025/arm64-final/release-summary.json` và `amd64/release-summary.json`: PASS; image IDs/platform, actual runtime arch/uid, upgrade/restart fingerprints, demo trace IDs và screenshots theo thư mục. `regression-final.log`:180/180 PASS (gồm healthcare12/4/3 và2/3, fault/ACL/races). `verify-final/summary.json`:9/9 PASS (66 unit/contract+7 tooling/build/typecheck/smoke). Final harness refinements validated by both release gates and final lint; final docs status checked separately (`lint-final.log`, `docs-final.log`, `whitespace.log`). Exact commands in task detail.

Linux app/build Node24.21.0/pnpm10.33.0, MySQL8.4.11/Redis7.4.11; host Node25 only Docker/Chrome orchestration. Native AMD64 hardware/Windows/production NOT_RUN; remote CI NOT_VERIFIED. AMD64 app uses emulation, native infrastructure and ARM64 M1 baseline.

Initial Docker disk100% issue: removed only unused build cache older1h; no database volume/image tag deleted. Existing test DB/OIDC recovered without reset. Earlier harness selector/unique-credential failures retained; final named runs PASS. No blocker/unresolved decision.

## Services và bàn giao

Preview localhost8080 remains existing SRC-022 application/schema17; no preview build/stop/restart/deploy by SRC-025. Final7 services healthy (`services-final.log`), no running test containers. Test containers/networks cleaned; named test volumes deliberately retained (all runs in `retained-test-volumes.log`, successful run/private credential directory in each release-summary.json). No background job/automation/subagent started.

Run `pnpm release:smoke` for fresh isolated reproduction; it requires local Chrome, dependencies, Docker space and Git history including f575a8e. Real Meta/LLM, production ops, M4 Deal/won/Customer/appointments and M5 builders/report engine remain outside this release.

Next action: review/prioritize M3 design requirements before claiming any real Meta/AI integration task; no further M1–M2 source task remains.
