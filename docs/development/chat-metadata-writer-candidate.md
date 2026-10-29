# CRM metadata writer candidate

SRC-109/T06, CHG-20261023-12, Codex2026-10-23. Candidate verified; main composition is still pending T07/T09. [Design](../contracts/chat-consumer-integration.md).

CrmRecords property writes and ObjectPlatform workspace schema writes accept an explicitly injected CrmMetadataWriter. Current native authorization precedes closing the metadata gate; real Chat recovery drains held reads outside SQL. The final CRM transaction reauthorizes, checks the exact barrier and holds, writes schema/receipt/audit and reopens at the actual revision. Concurrent same-key reopening permits receipt replay only. Failure/outage preserves retry and proof semantics.

Evidence: `artifacts/chat-extraction/continuation-20261022/metadata-writer-composed-final.log`:17native groups PASS (9classification +8metadata), after the final `reopened` distinction. Command: `node scripts/identity-owner-native-test.mjs '--focus=Chat classification' --with-metadata-writer`. Backend build PASS in `metadata-writer-build-final.log`; focused6tests PASS in `metadata-writer-focused.log`; boundary0added in `metadata-writer-boundary.log`. Earlier failed attempts remain retained; `metadata-writer-native-6.log` independently passed8groups before the final result naming refinement.

Environment: Windows PowerShell, project Node24.21.0/pnpm10.33.0, retained synthetic native schemas. Public CRM controller executes through the candidate HTTP harness with native session/CSRF; Chat recovery is actual owner HTTP. This is candidate integration evidence, not deployed main runtime evidence. Restricted retained CRM writer credential has no Chat/auth_session access; no secret is included in evidence. No DDL, reset or main restart/cutover. Main43/Chat4/Connector5 unchanged.

Working tree reference: main at21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 with existing dirty changes preserved; no commit/push. T06 remains IN_PROGRESS. Mounting the adapter, complete bootstrap/old-writer inventory and other consumer integrations remain required before service cutover.
