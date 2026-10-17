# Custom Inbox builder — PLAN-038 / SRC-083

2026-10-17, CHG-20261017-01. Ready scoped implementation contract after user approval of [queue/view research](../references/agent-workspace-queues-views.md). Dependencies SRC-033/SRC-039/SRC-082 DONE. Reuse [workspace contract](agent-chat-workspace.md) and [Chat data](../data/agent-chat-workspace.md): schema21 chat_inbox/share, no migration. Remaining SRC-035/036/037 gates independent.

## Product and UX

Sidebar saved inboxes with All/Mine/Shared groups; create from server capability. Editor: name; scope all/mine/unassigned/team; team; nonempty open/pending/closed status combination; channel/Page; AND tags(max10); unread; snooze exclude/include/only; sort. Existing predicate v1: AND between dimensions, OR within statuses. Explain viewer-relative mine/unread. No custom-property/nested grammar in this slice.

Create from current filters or unassigned/mine-unread/waiting-first presets. Explicit preview queries draft without inbox_id; count and bounded sample; edits invalidate preview. Search/cursor/limit never persisted. Selecting saved inbox honors its stored sort; list sort override is temporary. Update and save-as-new; duplicate private by default. Shared viewer cannot update/archive/share, may duplicate with create permission. Separate share dialog replaces users/teams via If-Match, max50. Archive explicit confirmation, never changes Conversation.

Retain draft on validation/network/CAS errors; conflict offers explicit discard/reload or save-as-new. Ambiguous mutation locks payload, retries same command/key. Warn before closing dirty/ambiguous editor. Tenant-keyed Inbox unmount clears state. Forbidden/not-found saved definition clears cached presentation; separately authorized detail/reply drafts retained. Query errors hide stale counts/results; record moving outside filter keeps detail plus banner. Native controls, keyboard, desktop/390/320 loading/error/empty states required. No implicit permission grants.

## Additive discovery API

GET `/api/v1/chat-workspace/inbox-options`, no query/body, native session and X-Tenant-Id; chat capability and chat_inbox.manage for own new definition. Returns data `{filter_fields:string[],can_share:boolean,teams:[{id,name}],principals:[{id,name}]}` and correlation/as_of. filter_fields whitelist current Conversation filter rights: status, owner_principal_id, team_id, channel, channel_id, tags. Unread uses viewer state; snooze capability from existing endpoint. Teams only for team filter or can_share, max200; principals only if can_share, max500 active Human/membership/native-account references. Overflow422 OPTIONS_LIMIT_EXCEEDED, never truncation. Display names only, no email/account IDs/roles/credentials.

Chat uses Identity WorkspaceIdentityPort; Identity account read uses explicit registered platform tenant. No additional record access. Mutations revalidate targets. Existing Page/tag APIs and pagination retained. Strict chat-catalogs JSON Schema/OpenAPI/generated type additive. Existing creates/PATCH/PUT shares/DELETE preserve native CSRF/idempotency/allowed_actions/If-Match, predicate grammar and event shape.

## Acceptance — runtime NOT_RUN until evidence

| ID | Scenario |
|---|---|
| CIB-01 | Create/preview/save/reopen; status/team/channel/Page/tag/unread/snooze/sort; no assignment mutation |
| CIB-02 | Update/duplicate/private default/grouping/archive; stored sort; search excluded; fixtures retained |
| CIB-03 | Named sharing/revoke; recipient read-only/viewer-relative mine; tenant/field/record/discovery deny, no leaked counts |
| CIB-04 | CAS retains draft; ambiguous same-key retry; invalid input; archive/revoke selected view; preserve readable detail draft |
| CIB-05 | Native HTTP/browser desktop390/320/keyboard; builds/types/schema/docs/lint; no database reset |

Chat owns definitions/shares, Identity directory facts, Channels Page options. No Queue/WorkItem or second owner store. Generalized custom/related fields/nested filters/columns and dispatch queues require future exact gates. Existing Object Workspace and record-page layouts unchanged.
