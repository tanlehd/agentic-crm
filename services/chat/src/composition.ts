import type {Pool} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandRef,OwnerMetadataSnapshot,OwnerTarget} from '@agentic-crm/contracts';
import {ownerClient,ownerFail,remoteRegistryAuthority,type TlsMaterial,type ServiceName,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {chatOwnerRecoveryRoutes} from './owner-http.js';
import {ChatOwnership,type OwnershipPeers} from './ownership.js';
import {chatOwnershipRoutes} from './ownership-http.js';
import {ChatOwnershipHistory,chatOwnershipHistoryRoutes} from './ownership-history.js';
import {ChatCustomValues,chatCustomValuesRoutes,type CustomValuesPeers} from './custom-values.js';
import {ChatGenericRecords,chatGenericRecordRoutes} from './generic-record.js';
import {ChatIngress,chatIngressRoutes} from './ingress.js';
import {processIngressMessage} from './ingress-message.js';
import {ChatHistory,chatHistoryRoutes} from './history.js';
import {ChatOutboundSubmit,chatOutboundSubmitRoutes} from './outbound-submit.js';
import {ChatWorkspaceState,chatWorkspaceStateRoutes} from './workspace-state.js';
import {ChatCatalog,chatCatalogRoutes} from './catalog.js';
import {ChatInboxes,chatInboxRoutes} from './inbox.js';
import {ChatWorkspaceQuery,chatWorkspaceQueryRoutes} from './workspace-query.js';
import {ChatDetail,chatDetailRoutes,type DetailPeers} from './detail.js';
import {ChatTransitions,chatTransitionRoutes} from './transition.js';
import {ChatNotes,chatNoteReadRoutes} from './notes.js';
import {ChatNoteWriter,chatNoteWriteRoutes} from './note-write.js';
import {ChatActivity,chatActivityRoutes} from './activity.js';
import {ChatSessionProgress,chatSessionProgressRoutes} from './session-progress.js';
import {ChatSessionFunnel,chatSessionFunnelRoutes} from './session-funnel.js';
import {ChatClassification,chatClassificationRoutes} from './classification.js';
import {ChatNeedAssessments,chatNeedAssessmentRoutes} from './need-assessment.js';
import {ChatNeedOutcomeWriter,chatNeedOutcomeRoutes} from './need-outcome.js';
import {ChatNeedSource,chatNeedSourceRoutes} from './need-source.js';
import {ChatSessionSource,chatSessionSourceRoutes} from './session-source.js';
import {ChatAssignmentDirectory,chatAssignmentDirectoryRoutes} from './assignment-directory.js';
import {ChatRoutingSource,chatRoutingSourceRoutes} from './routing-source.js';
import {ChatRoutingFacts,chatRoutingFactsRoutes} from './routing-facts.js';
import {ChatRoutingView,chatRoutingViewRoutes} from './routing-view.js';
import {ChatRoutingRerouteSource,chatRoutingRerouteRoutes} from './routing-reroute.js';
import {chatRoutingDispatchRoutes} from './routing-dispatch.js';
import {ChatExternalReads,chatExternalReadRoutes} from './external-reads.js';
import {ChatCapabilities,chatCapabilityRoutes} from './capabilities.js';
import {ChatEventDelivery,chatEventRoutes} from './event-delivery.js';
import {ChatActivityNotifications} from './activity-notifications.js';
import {ChatActivityRecovery} from './activity-recovery.js';
import {ChatCommandRecovery} from './command-recovery.js';
import {chatCommandRecoveryHandlers} from './command-reconciliation.js';
import {ChatDispatchStore} from './dispatch-storage.js';
import {dispatchRoutes} from './dispatch-http.js';
import {HumanOutboundCoordinator} from './outbound-coordinator.js';
import type {RecordPeers} from './record-action.js';

export type CursorKeys=Record<'history'|'catalog'|'workspace'|'activity'|'external',Buffer>;
export const chatWorkerJobs=['ingress','outbound','snooze','recovery','events','activity'] as const;
export type ChatCompositionConfig={epoch:string;tenants:readonly string[];owners:Partial<Record<ServiceName,URL>>;dispatch:{identity:URL;connector:URL};cursors:CursorKeys;receivers:Partial<Record<ServiceName,URL>>;workerJobs?:readonly typeof chatWorkerJobs[number][]};

export function mergeChatRoutes(...groups:Record<string,WorkloadRoute>[]){
 const routes:Record<string,WorkloadRoute>={};
 for(const group of groups)for(const [path,route]of Object.entries(group)){if(routes[path])throw new Error('CHAT_DUPLICATE_ROUTE');routes[path]=route;}
 return routes;
}
export function scopeChatRoutes(routes:Record<string,WorkloadRoute>,tenants:readonly string[]){
 const allowed=new Set(tenants);
 return Object.fromEntries(Object.entries(routes).map(([path,route])=>[path,{...route,async handle(...args:Parameters<WorkloadRoute['handle']>){const [value,peer,signal]=args;const info=route.validate(value);if(!allowed.has(info.tenant_id))ownerFail('FORBIDDEN');return route.handle(value,peer,signal);}}]));
}

/** Only Chat implementations and protocol clients. No baseline or other-owner domain imports. */
export function composeChat(pool:Pool,material:TlsMaterial,registry:Parameters<typeof remoteRegistryAuthority>[1],config:ChatCompositionConfig){
 if(material.service!=='chat')throw new Error('CHAT_MATERIAL_REQUIRED');
 const commands=new ChatOwnerCommands(pool,config.epoch),authority=remoteRegistryAuthority(material,registry);
 const clients=new Map<ServiceName,ReturnType<typeof ownerClient>>(),receivers=new Map<ServiceName,ReturnType<typeof ownerClient>>();
 for(const [owner,url]of Object.entries(config.owners))clients.set(owner as ServiceName,ownerClient(material,authority,owner as ServiceName,url));
 for(const [owner,url]of Object.entries(config.receivers))receivers.set(owner as ServiceName,ownerClient(material,authority,owner as ServiceName,url));
 const call=<T>(owner:ServiceName,t:string,op:string,payload:Record<string,unknown>):Promise<T>=>{const client=clients.get(owner);if(!client)ownerFail('DEPENDENCY_UNAVAILABLE');return client<T>(t,op,payload);};
 const admit=(t:string,command:OwnerCommandRef)=>call<OwnerAdmission>('identity',t,'admit',{owner:'chat',command});
 const settle=(t:string,command:OwnerCommandRef,admission_id:string)=>call<OwnerAdmission>('identity',t,'settle',{owner:'chat',command,admission_id});
 const record:RecordPeers={admit,settle};
 const contact=(t:string,command:OwnerCommandRef,admission_id:string)=>call<{contact_id:string;version:string}>('crm',t,'session-contact-read',{command,admission_id});
 const subject=(t:string,command:OwnerCommandRef,admission_id:string)=>call<{account_id:string}>('identity',t,'admission-cursor-subject',{command,admission_id});
 const platform=(t:string,connection_id:string)=>call<{connection_id:string;platform:'mock_messenger'}>('connector',t,'history-platform-read',{connection_id});
 const reference=(command:OwnerCommandRef,s:OwnerMetadataSnapshot)=>({command,kind:'metadata',resource_id:s.object_type_id,expected_revision:s.schema_revision,reservation_id:null});
 const customPeers:CustomValuesPeers={...record,metadata:(t,revision)=>call('crm',t,'metadata-schema-read',{object_key:'conversation',schema_revision:revision}),reserve:(t,c,s)=>call('crm',t,'reference-reserve',reference(c,s)),release:(t,c,s)=>call('crm',t,'reference-release',reference(c,s))};
 const ownershipPeers:OwnershipPeers={admit,settle:async(t,c,a)=>{await settle(t,c,a);},reserve:(t,command,session_id)=>call('routing',t,'capacity-reserve',{command,session_id,reservation_id:null}),confirm:async(t,command,reservation_id)=>{
  const proof=await commands.proof(t,command);if(!('binding'in proof)||!proof.binding.session_id)ownerFail('FORBIDDEN');
  await call('routing',t,'capacity-confirm',{command,session_id:proof.binding.session_id,reservation_id});
 }};
 const ownership=new ChatOwnership(commands,ownershipPeers),target=async(t:string,principal_id:string|null,team_id:string|null)=>(await call<{target:OwnerTarget}>('identity',t,'target-read',{principal_id,team_id})).target;
 const detailPeers:DetailPeers={...record,policy:(t,command,admission_id)=>call('identity',t,'admission-conversation-policy',{command,admission_id}),contact:(t,command,admission_id)=>call('crm',t,'contact-summary-read',{command,admission_id}),channel:(t,connection_id,conversation_id)=>call('connector',t,'detail-channel-read',{connection_id,conversation_id})};
 const ingress=new ChatIngress(commands,{admit,settle,contact:(t,p)=>call('crm',t,'contact-binding-read',p),channel:(t,connection_id)=>call('connector',t,'connection-ingress-read',{connection_id}),metadata:t=>customPeers.metadata(t,null),reference:(t,o,op,p)=>call(o,t,op,p),touchpoint:(t,op,{...c})=>call('connector',t,op,{...c}),verdict:(t,o,p)=>call(o,t,'ingress-verdict',p)},processIngressMessage);
 const notes=new ChatNoteWriter(commands,{...record,create:(t,command,text)=>call('crm',t,'note-create',{command,text}),abort:(t,c)=>call('crm',t,'note-abort',{...c})});
 const outcomes=new ChatNeedOutcomeWriter(commands,{...record,contact,inspect:(t,command,admission_id)=>call('sales',t,'outcome-link-inspect',{command,admission_id}),apply:(t,c)=>call('sales',t,'outcome-link-apply',{...c}),abort:(t,c)=>call('sales',t,'outcome-link-abort',{...c})});
 const workspace=new ChatWorkspaceState(commands,record,pool);
 const activity=new ChatActivityNotifications(commands,(t,o,p)=>call(o,t,'activity-notification-binding',p));
 const events=new ChatEventDelivery(commands,config.tenants,{configured:o=>receivers.has(o as ServiceName),call:(t,o,op,p)=>{const client=receivers.get(o as ServiceName);if(!client)ownerFail('DEPENDENCY_UNAVAILABLE');return client(t,op,p as Record<string,unknown>);}});
 const activityRecovery=new ChatActivityRecovery(commands,activity,config.tenants,{call:(t,o,op,p)=>call(o,t,op,p as Record<string,unknown>)});
 const recovery=new ChatCommandRecovery(commands,config.tenants,chatCommandRecoveryHandlers(commands,{call:(t,o,op,p)=>call(o,t,op,p as Record<string,unknown>)},{ingress,notes,outcomes}));
 const store=new ChatDispatchStore(pool,config.epoch),outbound=new HumanOutboundCoordinator(store,material,registry,config.dispatch);
 const routes=mergeChatRoutes(
  chatOwnerRecoveryRoutes(commands,(t,c)=>notes.recover(t,c),(t,c)=>outcomes.recover(t,c)),
  chatOwnershipRoutes(ownership,target),chatOwnershipHistoryRoutes(new ChatOwnershipHistory(commands,ownershipPeers)),
  chatCustomValuesRoutes(new ChatCustomValues(commands,customPeers)),chatGenericRecordRoutes(new ChatGenericRecords(commands,customPeers)),
  chatIngressRoutes(ingress),chatHistoryRoutes(new ChatHistory(commands,{...record,subject,platform},config.cursors.history)),
  chatOutboundSubmitRoutes(new ChatOutboundSubmit(commands,{...record,subject,connection:(t,connection_id)=>call('connector',t,'connection-binding-read',{connection_id})})),
  chatWorkspaceStateRoutes(workspace),chatCatalogRoutes(new ChatCatalog(commands,{...record,policy:(t,command,admission_id)=>call('identity',t,'admission-catalog-policy',{command,admission_id})},config.cursors.catalog)),
  chatInboxRoutes(new ChatInboxes(commands,{...record,connection:(t,connection_id)=>call('connector',t,'catalog-connection-read',{connection_id}),policy:(t,command,admission_id)=>call('identity',t,'admission-inbox-policy',{command,admission_id})},config.cursors.catalog)),
  chatWorkspaceQueryRoutes(new ChatWorkspaceQuery(commands,{...record,subject,policy:(t,command,admission_id,resources)=>call('identity',t,'admission-workspace-policy',{command,admission_id,resources}),contacts:(t,command,admission_id,ids)=>call('crm',t,'contact-summary-batch',{command,admission_id,ids}),channels:(t,items)=>call('connector',t,'detail-channel-batch',{items})},config.cursors.workspace)),
  chatDetailRoutes(new ChatDetail(commands,detailPeers)),chatTransitionRoutes(new ChatTransitions(commands,detailPeers,ownership)),
  chatNoteReadRoutes(new ChatNotes(commands,{...record,list:(t,p)=>call('crm',t,'note-list',p)})),chatNoteWriteRoutes(notes),
  chatActivityRoutes(new ChatActivity(commands,{...record,platform,policy:(t,command,admission_id)=>call('identity',t,'admission-activity-policy',{command,admission_id}),notes:(t,p)=>call('crm',t,'activity-notes',p),runs:(t,p)=>call('workflow',t,'activity-runs',p)},config.cursors.activity)),
  chatSessionProgressRoutes(new ChatSessionProgress(commands,{...record,contact,policy:(t,command,admission_id)=>call('identity',t,'admission-session-progress-policy',{command,admission_id})})),
  chatSessionFunnelRoutes(new ChatSessionFunnel(commands,{...record,policy:(t,command,admission_id)=>call('identity',t,'admission-funnel-policy',{command,admission_id}),contacts:(t,command,admission_id,ids)=>call('crm',t,'funnel-contact-read',{command,admission_id,ids})})),
  chatClassificationRoutes(new ChatClassification(commands,{...customPeers,contact,metadata:t=>call('crm',t,'classification-metadata-read',{schema_revision:null}),policy:(t,command,admission_id)=>call('identity',t,'admission-classification-policy',{command,admission_id}),visible:(o,t,command,admission_id,ids)=>call(o,t,'contribution-sources-read',{command,admission_id,ids})})),
  chatNeedAssessmentRoutes(new ChatNeedAssessments(commands,{...customPeers,contact,metadata:t=>call('crm',t,'need-metadata-read',{schema_revision:null}),policy:(t,command,admission_id)=>call('identity',t,'admission-need-policy',{command,admission_id}),outcomes:(t,command,admission_id)=>call('sales',t,'need-outcomes-list',{command,admission_id})})),
  chatNeedOutcomeRoutes(outcomes),chatNeedSourceRoutes(new ChatNeedSource(commands,{...record,contact})),
  chatSessionSourceRoutes(new ChatSessionSource(commands,{...record,contact,channel:(t,connection_id,conversation_id)=>call('connector',t,'source-channel-read',{connection_id,conversation_id})})),
  chatAssignmentDirectoryRoutes(new ChatAssignmentDirectory(commands,{...record,directory:(t,command,admission_id)=>call('identity',t,'admission-assignment-directory',{command,admission_id}),capacity:(t,command,admission_id)=>call('routing',t,'assignment-directory-capacity',{command,admission_id})})),
  chatRoutingSourceRoutes(new ChatRoutingSource(commands,record)),chatRoutingFactsRoutes(new ChatRoutingFacts(commands,record)),
  chatRoutingViewRoutes(new ChatRoutingView(commands,(t,command,admission_id)=>call('identity',t,'admission-routing-view',{command,admission_id}))),
  chatRoutingRerouteRoutes(new ChatRoutingRerouteSource(commands,record),commands,ownership),chatRoutingDispatchRoutes(commands,ownership),
  chatExternalReadRoutes(new ChatExternalReads(commands,{settle,policy:(t,c)=>call('identity',t,'external-policy',{...c})},config.cursors.external)),
  chatEventRoutes(events,activity),
  dispatchRoutes(store,material,registry,config.dispatch,async(binding)=>{await call('connector',binding.tenant_id,'connection-binding-read',{connection_id:binding.connection_id});return true;}),
 );
 const complete=mergeChatRoutes(routes,chatCapabilityRoutes(new ChatCapabilities(commands,record,routes)));
 return {routes:scopeChatRoutes(complete,config.tenants),commands,ingress,workspace,events,activityRecovery,recovery,outbound,authority};
}
