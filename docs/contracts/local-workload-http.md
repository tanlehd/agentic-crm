# Local workload HTTP — TLS deferred

CHG-20261019-25, SRC-109/T04, user-approved 2026-10-19. Local development and retained tests may explicitly select `WORKLOAD_TRANSPORT=http-local`. TLS remains available as `tls` (the compatibility default); there is no automatic downgrade. Production configuration rejects http-local.

HTTP local uses a private per-service key map, loaded from `WORKLOAD_HTTP_KEYS_FILE`, to authenticate callers and the expected responding service. Fingerprints are SHA256 of these keys, not certificates. Keys are never public DTO fields, logs or evidence. The local network is trusted: HTTP does not provide confidentiality or protection from an observer on that network. Publish only loopback ports; do not expose this mode to external networks. This is a temporary local deployment decision, not a production transport claim.

Identity still checks current service enabled state, explicit business-tenant admission and active business/system tenants on every call. HTTP key membership replaces certificate enrollment/expiry only in the explicitly constructed local registry adapter. Signed registry responses, strict caller allowlists, business Identity admissions/session/CSRF, tenant isolation, deadlines, body limits, durable command proofs, current-rights/revocation and capacity remain unchanged. TLS retains its original CA/SAN/24-hour leaf and registry certificate checks.

No database migration, existing certificate mutation, grant expansion or data reset is required. Existing local D2 processes must be rebuilt and configured together; transport mismatch fails closed. Retain previous image pins/config for recovery. T04 tests exercise the same HTTP path and native Identity registry; optional TLS regression remains separate.
