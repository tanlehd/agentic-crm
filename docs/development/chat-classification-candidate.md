# Native Chat classification and contribution history

SRC-109/T05, CHG-20261023-04, Codex2026-10-23. [Boundary](../contracts/chat-classification-candidate.md). Classification GET/POST candidate uses native Identity/session fields, CRM metadata reservation/Contact and Chat local storage. Main remains baseline.

Classification9native groups PASS in artifacts/chat-extraction/continuation-20261022/classification-native-final.log. Evidence covers exact definition/value shape, all8scalar types, optional null deletion, unknown/invalid values, concurrent replay/CAS, independent session field and Conversation/Contact rights, tenant/session negatives, source outage, changed metadata snapshot, metadata abort/drain, local snapshot race, completed native logout, public session/CSRF/ETag/query, release ACK loss after commit and imported legacy receipt after closure. Own credentials deny foreign table reads. The new effect writes values/contribution/audit/keys-only v2 event/receipt atomically.

Builds classification-chat-build-2.log and classification-backend-build-2.log PASS; focused-classification.log27tests PASS; lint-classification.log997files PASS; boundary-classification.log0added PASS. Initial build exposed missing public type exports; first fixture exposed an unquoted MySQL reserved identifier; generic2second composition timed out under native concurrency. Corrections and failed logs remain retained. Exact classification composition uses10seconds with helper RPCs still2seconds.

No DDL, reset, main mutation or deployment. .local/chat-ownership/classification-fixture.json retains rounds and synthetic rows. Metadata fixture credentials remain read-only for schema definitions and narrowly writable for existing reservation tables. All policy/seat changes restore. Evidence refers to dirty main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42, not a new commit. Contribution hydration is now verified below.

```powershell
. ./scripts/dev-shell.ps1
pnpm build:chat
pnpm --filter @agentic-crm/backend build
node scripts/identity-owner-native-test.mjs --focus="Chat classification"
node scripts/identity-owner-native-test.mjs --focus="Chat classification" --with-contributions
```

T06 must mount the metadata barrier in existing CRM property writers and finish source producer/relay integration. Candidate metadata drain tests do not substitute for those gates. Remaining T05 need assessment/outcome, funnel, generic hydration/global disable precede T06–T09. No standalone Chat runtime or DONE claim.

Contribution acceptance: contributions-native-final.log13groups PASS (9classification+4history), repeated from contributions-native-2.log. Native CRM/Sales source read credentials, independent Activity/Lead/Deal/contact_id/session-field rights, wrong source relation/session, archived source, closed owner, none/partial/full coverage, actual source outages,50row revision paging and public route verified. Synthetic Sales fixtures exercise registry/context visibility; actual Sales command producers remain T06. First run found before_revision0 accepted by the imported schema; both generated schema and Chat handler now match baseline positive-only validation. Existing actor-bearing Sales visibility operation is preserved; new recovery-bound source operation is additive. No database DDL; only a restricted Sales read user was provisioned in retained native_identity_test. Source rows/contexts/facts remain retained.

Final validation: contributions-chat-build-final.log/contributions-backend-build-final.log PASS; session-classification-regression.log9groups, notes-classification-regression.log8groups (100row776ms), focused-contributions.log27tests PASS; lint-contributions.log1000files, boundary-contributions.log0added, generated-contributions-check.log209operations594schemas PASS. Scoped whitespace PASS. Candidate listeners closed. Next scoped work is session funnel under CHG-20261023-05; T05 remains IN_PROGRESS.
