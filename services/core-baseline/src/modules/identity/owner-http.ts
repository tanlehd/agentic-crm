import { ownerFail, ownerRoute, type WorkloadRoute } from '@agentic-crm/workload-transport';
import type { OwnerCommandRef,OwnerResource } from '@agentic-crm/contracts';
import type { NativeOwnerAdmissions } from './owner-admission.js';

/** Candidate Chat and Routing surfaces; peer service must match the declared owner. */
export function identityOwnerRoutes(admissions: NativeOwnerAdmissions): Record<string, WorkloadRoute> {
  return {
    '/internal/v1/owners/identity/admission-routing-view':ownerRoute('identity','admission-routing-view',['chat','routing','connector'],r=>admissions.routingViewPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/routing-view-directory':ownerRoute('identity','routing-view-directory',['routing'],r=>admissions.routingViewPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,true)),
    '/internal/v1/owners/identity/admission-assignment-directory':ownerRoute('identity','admission-assignment-directory',['chat','routing'],r=>admissions.assignmentDirectory(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-classification-policy':ownerRoute('identity','admission-classification-policy',['chat'],r=>admissions.sessionProgressPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-outcome-link-policy':ownerRoute('identity','admission-outcome-link-policy',['sales'],r=>admissions.outcomeLinkPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,r.payload.resource as OwnerResource)),
    '/internal/v1/owners/identity/admission-need-policy':ownerRoute('identity','admission-need-policy',['chat'],r=>admissions.sessionProgressPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-need-outcomes-policy':ownerRoute('identity','admission-need-outcomes-policy',['sales'],r=>admissions.needOutcomesPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,r.payload.resources as OwnerResource[])),
    '/internal/v1/owners/identity/admission-funnel-policy':ownerRoute('identity','admission-funnel-policy',['chat'],r=>admissions.funnelPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-funnel-contact-policy':ownerRoute('identity','admission-funnel-contact-policy',['crm'],r=>admissions.funnelPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,r.payload.resources as OwnerResource[])),
    '/internal/v1/owners/identity/admission-contribution-sales-policy':ownerRoute('identity','admission-contribution-sales-policy',['sales'],r=>admissions.contributionSalesPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,r.payload.resources as OwnerResource[])),
    '/internal/v1/owners/identity/admission-session-progress-policy':ownerRoute('identity','admission-session-progress-policy',['chat'],r=>admissions.sessionProgressPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-session-contact-policy':ownerRoute('identity','admission-session-contact-policy',['crm'],r=>admissions.sessionProgressPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,r.payload.resource as OwnerResource)),
    '/internal/v1/owners/identity/admission-activity-policy':ownerRoute('identity','admission-activity-policy',['chat','workflow'],r=>admissions.activityPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-note-child':ownerRoute('identity','admission-note-child',['crm'],r=>admissions.noteChild(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-note-policy':ownerRoute('identity','admission-note-policy',['crm'],r=>admissions.notePolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/ingress-verdict': ownerRoute('identity', 'ingress-verdict', ['chat'], r => admissions.ingressVerdict(r.tenant_id, r.payload as { service_actor_id: string; team_id: string })),
    '/internal/v1/owners/identity/admission-conversation-policy':ownerRoute('identity','admission-conversation-policy',['chat'],r=>admissions.conversationPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-workspace-policy':ownerRoute('identity','admission-workspace-policy',['chat'],r=>admissions.workspacePolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,r.payload.resources as OwnerResource[])),
    '/internal/v1/owners/identity/admission-contact-batch-policy':ownerRoute('identity','admission-contact-batch-policy',['crm'],r=>admissions.workspacePolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,r.payload.resources as OwnerResource[],true)),
    '/internal/v1/owners/identity/admission-contact-policy':ownerRoute('identity','admission-contact-policy',['crm'],r=>admissions.conversationPolicy(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string,r.payload.resource as OwnerResource)),
    '/internal/v1/owners/identity/admission-catalog-policy': ownerRoute('identity', 'admission-catalog-policy', ['chat'], r => admissions.catalogPolicy(r.tenant_id, r.payload.command as OwnerCommandRef, r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-inbox-policy': ownerRoute('identity', 'admission-inbox-policy', ['chat'], r => admissions.inboxPolicy(r.tenant_id, r.payload.command as OwnerCommandRef, r.payload.admission_id as string)),
    '/internal/v1/owners/identity/admission-cursor-subject': ownerRoute('identity', 'admission-cursor-subject', ['chat'], request =>
    admissions.cursorSubject(request.tenant_id, request.payload.command as OwnerCommandRef, request.payload.admission_id as string)),
    ...Object.fromEntries(['admit', 'admission-read', 'settle'].map(operation => [
    '/internal/v1/owners/identity/' + operation,
    ownerRoute('identity', operation, operation === 'admission-read' ? ['chat', 'routing', 'connector'] : ['chat', 'routing'], async (request, peer) => {
      const owner = request.payload.owner;
      if (operation === 'admission-read' && peer.service === 'connector' && owner === 'chat') return admissions.touchpointAdmission(request.tenant_id, request.payload.command as OwnerCommandRef, request.payload.admission_id as string);
      if ((owner !== 'chat' && owner !== 'routing') || owner !== peer.service) ownerFail('FORBIDDEN');
      const command = request.payload.command as OwnerCommandRef;
      if (operation === 'admit') return admissions.admit(request.tenant_id, command, owner);
      const id = request.payload.admission_id as string;
      return operation === 'settle' ? admissions.settle(request.tenant_id, command, id, owner) : admissions.read(request.tenant_id, command, id, owner);
    }),
  ])) };
}
