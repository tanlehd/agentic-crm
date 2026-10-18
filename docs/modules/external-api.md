# External API

Status: scoped R1 implemented locally, SRC-088 DONE; [executed evidence](../tracking/details/SRC-088.md). Platform administration for tenant admins and integration developers. [Exact design, data and acceptance](../contracts/external-api.md), [developer documentation](../developer/README.md).

Private app registration, explicit object read scopes, field allowlist, optional team restriction, finite opaque bearer credentials, lifecycle/quota and versioned record reads. Native management is separate from token access. No implicit Human impersonation or ownership changes. Write commands, OAuth distribution and webhooks require future gates.

SRC-089 extends read access to [Conversation and message list/detail](../contracts/external-conversations.md), with separate metadata/content grants and the intersection of parent/team permissions. Chat supplies explicit DTOs; existing app grants do not expand automatically. [Evidence](../tracking/details/SRC-089.md).
