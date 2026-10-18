# External API facade

Baseline module in apps/backend, not an extracted service. Identity owns app configuration, grants and credential/quota in target crm_identity; CRM/Sales own records and metadata. [Contract](../contracts/external-api.md) specifies the local application ports. On extraction the facade must call versioned Identity/owner APIs, never their database or implementation. Gateway has no business DB. No separate deployment is claimed by this task.

PLAN-053 adds the [Chat-owned Conversation/message read port](../contracts/external-conversations.md). It validates parent registry ACL and projects only explicit fields; the facade never reads Chat tables itself. Current monolith shares a transaction through these defined ports.
