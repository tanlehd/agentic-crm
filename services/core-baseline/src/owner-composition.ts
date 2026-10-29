import type { Pool } from 'mysql2/promise';
import type { DataSource } from 'typeorm';
import type { OwnerCommandRef, OwnerCommandProof, OwnerRecoveryProof } from '@agentic-crm/contracts';
import { ownerClient, remoteRegistryAuthority, workloadReadiness, type TlsMaterial, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { UnitOfWork } from './kernel/tenancy/unit-of-work.js';
import { NativeOwnerHumanAuthority } from './modules/identity/owner-authority.js';
import { NativeOwnerAdmissions } from './modules/identity/owner-admission.js';
import { identityOwnerRoutes } from './modules/identity/owner-http.js';
import { identityOwnerTargetRoute } from './modules/identity/owner-target.js';
import { NativeCrmOwnerMetadata, crmOwnerMetadataRoutes } from './modules/crm/owner-metadata.js';
import { NativeCrmContactReferences, crmContactOwnerRoutes } from './modules/crm/owner-contact.js';
import { NativeContactSummary, contactSummaryRoutes } from './modules/crm/owner-contact-summary.js';
import { NativeNotes, noteReadRoutes } from './modules/crm/owner-notes.js';
import { NativeNoteWriter, noteWriteRoutes } from './modules/crm/owner-note-write.js';
import { crmActivityBindingRoutes } from './modules/crm/owner-activity-binding.js';
import { NativeChannelReferences, channelReferenceOwnerRoutes } from './modules/channels/owner-reference.js';
import { NativeChannelDetail, channelDetailRoutes } from './modules/channels/owner-detail.js';
import { channelHistoryOwnerRoutes } from './modules/channels/history-owner.js';
import { NativeChannelTouchpoints, channelTouchpointRoutes } from './modules/channels/owner-touchpoint.js';
import { NativeOwnerCapacity } from './modules/agents/owner-capacity.js';
import { routingOwnerRoutes } from './modules/agents/owner-http.js';
import { NativeAssignmentCapacity, assignmentCapacityRoutes } from './modules/agents/owner-directory.js';
import { NativeWorkflowActivity, workflowActivityRoutes } from './modules/workflow/owner-activity.js';
import { NativeSalesContributions, salesContributionRoutes } from './modules/sales/owner-contributions.js';
import { NativeNeedOutcomeWriter, needOutcomeWriterRoutes } from './modules/sales/owner-need-outcome.js';
import { workflowActivityBindingRoutes } from './modules/workflow/owner-activity-binding.js';
import { NativeExternalReadAdmissions, externalReadAdmissionRoutes } from './modules/identity/external-read-admission.js';
import { ExternalApps } from './modules/identity/external-apps.js';
import { appCatalog } from './modules/external-api/catalog.js';
import { NativeRoutingConnections, routingConnectionRoutes } from './modules/channels/owner-routing-view.js';
import { NativeRoutingConfiguration } from './modules/agents/owner-config.js';
import { NativeRoutingViewStorage } from './modules/agents/owner-view-storage.js';
import { routingRecoveryRoutes } from './modules/agents/owner-recovery.js';
import { validateJournal } from './kernel/database/migration-runner.js';
import { migrations } from './kernel/database/migrations.js';

type ProjectionObjects = { contact: string; activity: string; conversation_session?: string; conversation_need?: string; lead?: string; deal?: string };
export type OwnerCompositionConfig = {
  chat: URL;
  identity: URL;
  routing: URL;
  tenants: readonly string[];
  conversationObjects: ReadonlyMap<string, string>;
  projectionObjects: ReadonlyMap<string, ProjectionObjects>;
  routingActors: ReadonlyMap<string, string>;
};

export function mergeOwnerRoutes(...groups: Record<string, WorkloadRoute>[]): Record<string, WorkloadRoute> {
  const result: Record<string, WorkloadRoute> = {};
  for (const group of groups) for (const [path, route] of Object.entries(group)) {
    if (result[path]) throw new Error('DUPLICATE_OWNER_ROUTE');
    result[path] = route;
  }
  return result;
}

/** Existing native owner adapters, composed inside the baseline deployment boundary. */
export function composeBaselineOwner(pool: Pool, source: DataSource, material: TlsMaterial,
  registry: Parameters<typeof remoteRegistryAuthority>[1], config: OwnerCompositionConfig) {
  const authority = remoteRegistryAuthority(material, registry);
  const chat = ownerClient(material, authority, 'chat', config.chat);
  const identity = ownerClient(material, authority, 'identity', config.identity);
  const routing = ownerClient(material, authority, 'routing', config.routing);
  const proof = (tenant: string, command: OwnerCommandRef, abort = false): Promise<OwnerRecoveryProof> =>
    chat(tenant, abort ? 'command-abort' : 'command-proof', { ...command });
  const committedProof = (tenant: string, command: OwnerCommandRef): Promise<OwnerCommandProof> =>
    chat(tenant, 'command-proof', { ...command });
  let routes: Record<string, WorkloadRoute>;
  if (material.service === 'identity') {
    const uow = new UnitOfWork(source);
    const human = new NativeOwnerHumanAuthority(uow, config.conversationObjects, config.projectionObjects);
    const admissions = new NativeOwnerAdmissions(uow, human, (tenant, command, abort, owner) =>
      (owner === 'routing' ? routing : chat)(tenant, abort ? 'command-abort' : 'command-proof', { ...command }));
    routes = mergeOwnerRoutes(identityOwnerRoutes(admissions), identityOwnerTargetRoute(uow),
      externalReadAdmissionRoutes(new NativeExternalReadAdmissions(new ExternalApps(source, appCatalog), proof)));
  } else if (material.service === 'crm') {
    const metadata = new NativeCrmOwnerMetadata(pool, proof);
    const metadataReads = Object.fromEntries(Object.entries(crmOwnerMetadataRoutes(metadata)).filter(([path]) => !path.includes('/reference-')));
    const contacts = new NativeContactSummary(pool, proof,
      (t, input) => identity(t, 'admission-contact-policy', input),
      (t, input) => identity(t, 'admission-contact-batch-policy', input),
      (t, input) => identity(t, 'admission-session-contact-policy', input),
      (t, input) => identity(t, 'admission-funnel-contact-policy', input));
    routes = mergeOwnerRoutes(metadataReads,
      crmContactOwnerRoutes(new NativeCrmContactReferences(pool, proof), metadata), contactSummaryRoutes(contacts),
      noteReadRoutes(new NativeNotes(pool, proof, (t, input) => identity(t, 'admission-note-policy', input))),
      noteWriteRoutes(new NativeNoteWriter(pool, proof, (t, command, admission_id) => identity(t, 'admission-note-child', { command, admission_id }))),
      crmActivityBindingRoutes(pool));
  } else if (material.service === 'connector') {
    routes = mergeOwnerRoutes(channelReferenceOwnerRoutes(new NativeChannelReferences(pool, proof)),
      channelDetailRoutes(new NativeChannelDetail(pool)), channelHistoryOwnerRoutes(pool),
      routingConnectionRoutes(new NativeRoutingConnections(pool,
        (t, command, admission_id) => identity(t, 'admission-routing-view', { command, admission_id }))),
      channelTouchpointRoutes(new NativeChannelTouchpoints(pool, proof,
        (t, command, admission_id) => identity(t, 'admission-read', { owner: 'chat', command, admission_id }))));
  } else if (material.service === 'routing') {
    const capacity = new NativeOwnerCapacity(pool, proof);
    routes = mergeOwnerRoutes(routingOwnerRoutes(capacity),
      routingRecoveryRoutes(pool, new NativeRoutingConfiguration(pool, capacity), new NativeRoutingViewStorage(pool)),
      assignmentCapacityRoutes(new NativeAssignmentCapacity(pool,
        (t, command, admission_id) => identity(t, 'admission-assignment-directory', { command, admission_id }))));
  } else if (material.service === 'workflow') {
    routes = mergeOwnerRoutes(workflowActivityRoutes(new NativeWorkflowActivity(pool, proof,
      (t, input) => identity(t, 'admission-activity-policy', input))), workflowActivityBindingRoutes(pool));
  } else if (material.service === 'sales') {
    routes = mergeOwnerRoutes(salesContributionRoutes(new NativeSalesContributions(pool, committedProof,
      (t, input) => identity(t, 'admission-contribution-sales-policy', input),
      (t, input) => identity(t, 'admission-need-outcomes-policy', input))),
      needOutcomeWriterRoutes(new NativeNeedOutcomeWriter(pool, committedProof,
        (t, input) => identity(t, 'admission-outcome-link-policy', input))));
  } else throw new Error('BASELINE_OWNER_UNSUPPORTED');
  const tenants = new Set(config.tenants);
  return { authority, routes: Object.fromEntries(Object.entries(mergeOwnerRoutes(routes, {
    '/internal/v1/workloads/ready': workloadReadiness(material.service, async () => {
      const journal = await source.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
      validateJournal(journal, migrations, true);
    }),
  })).map(([path, route]) => [path, { ...route, async handle(...args: Parameters<WorkloadRoute['handle']>) {
    if (!tenants.has(route.validate(args[0]).tenant_id)) throw new Error('OWNER_TENANT_NOT_CONFIGURED');
    return route.handle(...args);
  } }])) };
}
