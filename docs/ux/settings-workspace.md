# Settings workspace — UI-20261029-01

2026-10-29 · Ready for scoped layout implementation · CHG-20261029-01. User-approved navigation/layout only; detailed new editors remain a later scope. Depends on DONE SRC-109 and UI-20261027-01. Persona: tenant administrator configuring the employee workspace.

## Navigation

One Settings button in the app header opens a dedicated workspace with its own grouped sidebar and Back to workspace action. It remains accessible on mobile. Remove administrative entries and the Developer API shortcut from the primary app navigation/header. Tool search may find the Settings destination. Keep existing authorized business workspaces intact.

| Sidebar group | Destinations | Existing surface / scope |
|---|---|---|
| Account Management | User & Team | Existing memberships, teams, roles and AI principal administration; account creation remains the existing account/membership contract, no invented provisioning API. |
| Account Management | Integration | Existing private apps and API tokens, with link to Developer API documentation; tenant super-admin API enforcement retained. |
| Data Management | Objects; Fields; Custom Objects; Data Model Builder (ERD) | Existing object catalog, field editor, custom object creation and ERD. ERD is the existing read visualization, not a new graphical mutation engine. |
| Tools | Channels | Existing Facebook connection settings. WhatsApp and other unimplemented providers clearly unavailable. |
| Tools | Inbox Center | Overview linking Inbox Queue Customization and Conversation Sidebar Context. |
| Tools | Conversation routing | Existing routing workspace moved into Settings. |

Nested Inbox Center destinations are visible in the sidebar. Queue customization shows the current built-in list structure and existing custom/shared inbox manager with its server-authorized actions. Editing/reordering built-in queues is layout-only, not persisted in this scope. Conversation Sidebar Context shows a default layout preview and team-view rule: each team has at most one conversation view; unassigned teams use Default. No persistence, assignment or access-policy change is claimed. Conversation context is distinct from the existing CRM Contact preview layout.

## Compatibility, state and ownership

Canonical URL: `/?screen=settings&setting=<destination>`. Legacy `screen=admin`, `screen=schema`, `screen=routing` and Facebook callback query normalize to the matching Settings destination, preserving callback parameters. Browser back/forward restores the selected destination. Existing `/developer` docs remain reachable. Settings has one sidebar, including embedded object configuration without a second settings sidebar.

Navigation observes existing unsaved-change confirmation. Hidden/unauthorized items and empty groups are omitted; direct inaccessible destinations show a permission state rather than opening unrelated data. Tenant changes remount settings children; existing native session, tenant headers and owner enforcement remain authoritative. Preserve loading/error/retry states of reused surfaces. UI scaffolds make their preview status visible and do not provide fake save/connect controls.

No API/event/schema/migration changes. Identity owns account/team/role and private apps ([contract](../contracts/external-api.md)); CRM owns object/field/layout metadata ([contract](../contracts/object-platform-r1.md)); Connector owns channel bindings; Chat owns custom inbox definitions ([workspace contract](../contracts/agent-chat-workspace.md)). Existing [data ownership](../data/service-ownership.md) applies. CRM [record page](../contracts/record-pages.md) API does not implement Conversation sidebar views; exact owner contract and acceptance are required before implementing persistence.

## Acceptance

- SET-01: one visible Settings entry in the header; no scattered administration/API entries in main nav; all three sidebar groups and requested destinations accessible to authorized admin.
- SET-02: existing User & Team, private apps, objects/fields/custom objects/ERD, Channels and routing surfaces render with their existing permissions and tenant context.
- SET-03: Inbox Center links both screens; queue/default and context/team scaffolds have honest preview status, with one-view-per-team rule visible.
- SET-04: legacy URLs, refresh, back/forward and dirty navigation behave consistently; permission-denied routes never render privileged components.
- SET-05: desktop and mobile layout, keyboard navigation and no horizontal page overflow; web typecheck, focused browser smoke, lint/docs checks. No provider connection or business mutation needed for layout acceptance.
