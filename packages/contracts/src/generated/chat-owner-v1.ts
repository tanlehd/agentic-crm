/* Generated T01 private design contract. No runtime deployment implied. */

export type ChatOwnerProtocol =
  | OwnerActor
  | OwnerResource
  | OwnerTarget
  | OwnerMetadataPin
  | OwnerCustomProperty
  | OwnerMetadataSnapshot
  | OwnerDependency
  | OwnerGraph
  | OwnerCommandBinding
  | OwnerCommandRef
  | OwnerCommandTombstone
  | OwnerRecoveryProof
  | OwnerCommandProof
  | OwnerAdmission
  | OwnerBarrier
  | OwnerCapacity
  | OwnerReference
  | OwnerPage
  | OwnerFreshness
  | OwnerFieldValue
  | OwnerProjectedRecord
  | OwnerBatchItem
  | OwnerBatch
  | OwnerSessionSource
  | OwnerOutcome
  | OwnerFact
  | OwnerFacts
  | OwnerActivityBinding
  | OwnerRecovery
  | OwnerCapabilities
  | OwnerFailure
  | OwnerOutcomeSource
  | OwnerOutcomePin
  | OwnerOutcomeReceipt
  | OwnerClassificationMetadata
  | OwnerClassificationPolicy
  | OwnerInboxInputs
  | OwnerProjectionPin
  | OwnerContactSummary
  | OwnerConversationPolicy
  | OwnerAssignmentDirectory
  | OwnerRoutingDispatchPin
  | OwnerRoutingReroutePin
  | OwnerRoutingSession
  | OwnerRoutingSnapshot
  | OwnerRoutingReplyFact
  | OwnerRoutingReplySnapshot
  | OwnerReadPredicate
  | OwnerRoutingViewSelection
  | OwnerRoutingViewPolicy
  | OwnerRoutingViewDirectory
  | OwnerRoutingViewChat
  | HumanRoutingHumanRoutingMine
  | HumanRoutingHumanRoutingSnapshot
  | OwnerRoutingViewData
  | OwnerFunnelPolicy
  | OwnerWorkspacePolicy
  | OwnerContactDecision
  | OwnerContactBinding
  | OwnerIngressReferences
  | OwnerIngressChannel
  | OwnerIngressTouchpoint
  | OwnerIngressResult
  | OwnerTouchpointReceipt
  | OwnerIngressVerdict
  | OwnerBoundaryFailure
  | AuthErrorResponse
  | RequestCrmIngressVerdict
  | ReplyCrmIngressVerdict
  | RequestConnectorIngressVerdict
  | ReplyConnectorIngressVerdict
  | RequestIdentityIngressVerdict
  | ReplyIdentityIngressVerdict
  | RequestConnectorTouchpointPrepare
  | ReplyConnectorTouchpointPrepare
  | RequestConnectorTouchpointFinalize
  | ReplyConnectorTouchpointFinalize
  | RequestChatCommandProof
  | ReplyChatCommandProof
  | RequestChatCommandAbort
  | ReplyChatCommandAbort
  | RequestCrmCommandProof
  | ReplyCrmCommandProof
  | RequestCrmCommandAbort
  | ReplyCrmCommandAbort
  | RequestConnectorCommandProof
  | ReplyConnectorCommandProof
  | RequestConnectorCommandAbort
  | ReplyConnectorCommandAbort
  | RequestRoutingCommandProof
  | ReplyRoutingCommandProof
  | RequestRoutingCommandAbort
  | ReplyRoutingCommandAbort
  | RequestSalesCommandProof
  | ReplySalesCommandProof
  | RequestSalesCommandAbort
  | ReplySalesCommandAbort
  | RequestAiRuntimeCommandProof
  | ReplyAiRuntimeCommandProof
  | RequestAiRuntimeCommandAbort
  | ReplyAiRuntimeCommandAbort
  | RequestWorkflowCommandProof
  | ReplyWorkflowCommandProof
  | RequestWorkflowCommandAbort
  | ReplyWorkflowCommandAbort
  | RequestReportingCommandProof
  | ReplyReportingCommandProof
  | RequestReportingCommandAbort
  | ReplyReportingCommandAbort
  | RequestIdentityAdmit
  | ReplyIdentityAdmit
  | RequestIdentityAdmissionRead
  | ReplyIdentityAdmissionRead
  | RequestIdentityAdmissionCursorSubject
  | ReplyIdentityAdmissionCursorSubject
  | RequestIdentityAdmissionCatalogPolicy
  | ReplyIdentityAdmissionCatalogPolicy
  | RequestIdentityAdmissionConversationPolicy
  | ReplyIdentityAdmissionConversationPolicy
  | RequestIdentityAdmissionAssignmentDirectory
  | ReplyIdentityAdmissionAssignmentDirectory
  | RequestIdentityAdmissionRoutingView
  | ReplyIdentityAdmissionRoutingView
  | RequestIdentityRoutingViewDirectory
  | ReplyIdentityRoutingViewDirectory
  | RequestChatRoutingView
  | ReplyChatRoutingView
  | RequestConnectorRoutingViewConnections
  | ReplyConnectorRoutingViewConnections
  | RequestRoutingAssignmentDirectoryCapacity
  | ReplyRoutingAssignmentDirectoryCapacity
  | RequestChatRoutingProposal
  | ReplyChatRoutingProposal
  | RequestChatRoutingDispatch
  | ReplyChatRoutingDispatch
  | RequestChatRoutingRerouteSource
  | ReplyChatRoutingRerouteSource
  | RequestChatRoutingReroute
  | ReplyChatRoutingReroute
  | RequestIdentityAdmissionWorkspacePolicy
  | ReplyIdentityAdmissionWorkspacePolicy
  | RequestIdentityAdmissionContactBatchPolicy
  | ReplyIdentityAdmissionContactBatchPolicy
  | RequestCrmContactSummaryBatch
  | ReplyCrmContactSummaryBatch
  | RequestIdentityAdmissionContactPolicy
  | ReplyIdentityAdmissionContactPolicy
  | RequestCrmContactSummaryRead
  | ReplyCrmContactSummaryRead
  | RequestConnectorDetailChannelRead
  | ReplyConnectorDetailChannelRead
  | RequestConnectorDetailChannelBatch
  | ReplyConnectorDetailChannelBatch
  | RequestConnectorSourceChannelRead
  | ReplyConnectorSourceChannelRead
  | RequestIdentityAdmissionInboxPolicy
  | ReplyIdentityAdmissionInboxPolicy
  | RequestConnectorCatalogConnectionRead
  | ReplyConnectorCatalogConnectionRead
  | RequestConnectorHistoryPlatformRead
  | ReplyConnectorHistoryPlatformRead
  | RequestCrmContactBindingRead
  | ReplyCrmContactBindingRead
  | RequestConnectorConnectionBindingRead
  | ReplyConnectorConnectionBindingRead
  | RequestConnectorConnectionIngressRead
  | ReplyConnectorConnectionIngressRead
  | RequestConnectorTransportDisable
  | ReplyConnectorTransportDisable
  | RequestConnectorTransportEnable
  | ReplyConnectorTransportEnable
  | RequestConnectorTransportStatus
  | ReplyConnectorTransportStatus
  | RequestIdentitySettle
  | ReplyIdentitySettle
  | RequestIdentityTargetRead
  | ReplyIdentityTargetRead
  | RequestIdentityPrincipalKindRead
  | ReplyIdentityPrincipalKindRead
  | RequestIdentityBarrierStatus
  | ReplyIdentityBarrierStatus
  | RequestIdentityDirectory
  | ReplyIdentityDirectory
  | RequestRoutingCapacityReserve
  | ReplyRoutingCapacityReserve
  | RequestRoutingCapacityConfirm
  | ReplyRoutingCapacityConfirm
  | RequestRoutingCapacityRelease
  | ReplyRoutingCapacityRelease
  | RequestRoutingCapacityStatus
  | ReplyRoutingCapacityStatus
  | RequestCrmReferenceReserve
  | ReplyCrmReferenceReserve
  | RequestCrmReferenceStatus
  | ReplyCrmReferenceStatus
  | RequestCrmReferenceRelease
  | ReplyCrmReferenceRelease
  | RequestConnectorReferenceReserve
  | ReplyConnectorReferenceReserve
  | RequestConnectorReferenceStatus
  | ReplyConnectorReferenceStatus
  | RequestConnectorReferenceRelease
  | ReplyConnectorReferenceRelease
  | RequestChatContactArchiveGuard
  | ReplyChatContactArchiveGuard
  | ContactResolutionContactLookupResponse
  | RequestCrmContactLookup
  | ReplyCrmContactLookup
  | ContactResolutionContactResolveRequest
  | ContactResolutionContactResolveResponse
  | RequestCrmContactResolve
  | ReplyCrmContactResolve
  | RequestCrmContactBatch
  | ReplyCrmContactBatch
  | PublicCrmDescriptorResponse
  | RequestCrmMetadataRead
  | ReplyCrmMetadataRead
  | RequestCrmMetadataSchemaRead
  | ReplyCrmMetadataSchemaRead
  | RequestConnectorChannelBatch
  | ReplyConnectorChannelBatch
  | OwnerNotePin
  | OwnerNoteReceipt
  | RequestIdentityAdmissionNoteChild
  | ReplyIdentityAdmissionNoteChild
  | RequestCrmNoteCreate
  | ReplyCrmNoteCreate
  | RequestCrmNoteAbort
  | ReplyCrmNoteAbort
  | OwnerNotePolicy
  | OwnerActivityPolicy
  | OwnerSessionProgressPolicy
  | RequestIdentityAdmissionSessionProgressPolicy
  | ReplyIdentityAdmissionSessionProgressPolicy
  | RequestIdentityAdmissionFunnelPolicy
  | ReplyIdentityAdmissionFunnelPolicy
  | RequestIdentityAdmissionFunnelContactPolicy
  | ReplyIdentityAdmissionFunnelContactPolicy
  | RequestCrmFunnelContactRead
  | ReplyCrmFunnelContactRead
  | RequestIdentityAdmissionClassificationPolicy
  | ReplyIdentityAdmissionClassificationPolicy
  | RequestCrmClassificationMetadataRead
  | ReplyCrmClassificationMetadataRead
  | RequestCrmNeedMetadataRead
  | ReplyCrmNeedMetadataRead
  | RequestIdentityAdmissionNeedPolicy
  | ReplyIdentityAdmissionNeedPolicy
  | RequestIdentityAdmissionNeedOutcomesPolicy
  | ReplyIdentityAdmissionNeedOutcomesPolicy
  | RequestIdentityAdmissionOutcomeLinkPolicy
  | ReplyIdentityAdmissionOutcomeLinkPolicy
  | RequestSalesOutcomeLinkInspect
  | ReplySalesOutcomeLinkInspect
  | RequestSalesOutcomeLinkApply
  | ReplySalesOutcomeLinkApply
  | RequestSalesOutcomeLinkAbort
  | ReplySalesOutcomeLinkAbort
  | RequestSalesNeedOutcomesList
  | ReplySalesNeedOutcomesList
  | RequestCrmContributionSourcesRead
  | ReplyCrmContributionSourcesRead
  | RequestSalesContributionSourcesRead
  | ReplySalesContributionSourcesRead
  | RequestIdentityAdmissionContributionSalesPolicy
  | ReplyIdentityAdmissionContributionSalesPolicy
  | RequestIdentityAdmissionSessionContactPolicy
  | ReplyIdentityAdmissionSessionContactPolicy
  | RequestCrmSessionContactRead
  | ReplyCrmSessionContactRead
  | RequestIdentityAdmissionActivityPolicy
  | ReplyIdentityAdmissionActivityPolicy
  | RequestCrmActivityNotes
  | ReplyCrmActivityNotes
  | RequestWorkflowActivityRuns
  | ReplyWorkflowActivityRuns
  | RequestIdentityAdmissionNotePolicy
  | ReplyIdentityAdmissionNotePolicy
  | ConversationConversationNotes
  | RequestCrmNoteList
  | ReplyCrmNoteList
  | RequestCrmNoteRead
  | ReplyCrmNoteRead
  | RequestCrmActivityBinding
  | ReplyCrmActivityBinding
  | RequestWorkflowActivityBinding
  | ReplyWorkflowActivityBinding
  | OwnerActivityNotificationBinding
  | RequestCrmActivityNotificationBinding
  | ReplyCrmActivityNotificationBinding
  | RequestWorkflowActivityNotificationBinding
  | ReplyWorkflowActivityNotificationBinding
  | RequestChatSessionSource
  | ReplyChatSessionSource
  | Customer360SalesSessionResponse
  | RequestSalesSessionLink
  | ReplySalesSessionLink
  | RequestSalesNeedOutcomeLink
  | ReplySalesNeedOutcomeLink
  | RequestSalesNeedOutcomeRead
  | ReplySalesNeedOutcomeRead
  | RequestSalesOutcomeReserve
  | ReplySalesOutcomeReserve
  | RequestSalesOutcomeRelease
  | ReplySalesOutcomeRelease
  | RequestSalesOutcomeStatus
  | ReplySalesOutcomeStatus
  | RequestChatRecoverNeed
  | ReplyChatRecoverNeed
  | RequestChatRecordBatch
  | ReplyChatRecordBatch
  | PublicCrmRecordPatch
  | PublicCrmRecordResponse
  | PublicCrmRecord
  | RequestChatCustomValuesPatch
  | ReplyChatCustomValuesPatch
  | RequestChatRecordGet
  | ReplyChatRecordGet
  | RequestChatRecordPatch
  | ReplyChatRecordPatch
  | PublicCrmArchive
  | RequestChatRecordArchive
  | ReplyChatRecordArchive
  | RequestChatRoutingFacts
  | ReplyChatRoutingFacts
  | RequestChatConversionFacts
  | ReplyChatConversionFacts
  | RequestChatStageFacts
  | ReplyChatStageFacts
  | RequestChatProgressFacts
  | ReplyChatProgressFacts
  | RequestChatRoutingActive
  | ReplyChatRoutingActive
  | RequestChatRoutingSyncSnapshot
  | ReplyChatRoutingSyncSnapshot
  | RequestChatRoutingReplyFacts
  | ReplyChatRoutingReplyFacts
  | RequestChatRuntimeCapabilities
  | ReplyChatRuntimeCapabilities
  | OwnerInferenceContext
  | RequestChatAgentContext
  | ReplyChatAgentContext
  | RequestChatInboundNext
  | ReplyChatInboundNext
  | ConversationConversationSendResponse
  | ConversationConversationQueued
  | RequestChatPromptSubmit
  | ReplyChatPromptSubmit
  | RequestChatReadNeed
  | ReplyChatReadNeed
  | RequestSalesContributionVisible
  | ReplySalesContributionVisible
  | RequestChatContributionApply
  | ReplyChatContributionApply
  | OwnerSnapshot
  | SessionProgressSessionProcessInput
  | OwnerSnapshotRow
  | RequestChatSnapshotPrepare
  | ReplyChatSnapshotPrepare
  | RequestChatSnapshotValidate
  | ReplyChatSnapshotValidate
  | RequestChatSnapshotRelease
  | ReplyChatSnapshotRelease
  | RequestChatSnapshotPage
  | ReplyChatSnapshotPage
  | OwnerChildResult
  | RequestSalesChildStart
  | ReplySalesChildStart
  | RequestSalesChildStatus
  | ReplySalesChildStatus
  | PublicSessionProcessResponse
  | RequestChatSessionProgressGetSessionProcess
  | ReplyChatSessionProgressGetSessionProcess
  | PublicSessionProcessInput
  | RequestChatSessionProgressPostSessionProcess
  | ReplyChatSessionProgressPostSessionProcess
  | PublicSessionProgressResponse
  | RequestChatSessionProgressGetConversationsConversationSessionsSessionProgress
  | ReplyChatSessionProgressGetConversationsConversationSessionsSessionProgress
  | PublicSessionProgressInput
  | PublicSessionProgressResult
  | RequestChatSessionProgressPostConversationsConversationSessionsSessionProgress
  | ReplyChatSessionProgressPostConversationsConversationSessionsSessionProgress
  | PublicSessionFunnelResponse
  | RequestChatSessionProgressGetSessionFunnel
  | ReplyChatSessionProgressGetSessionFunnel
  | PublicConversationList
  | PublicConversationEntity
  | RequestChatConversationGetConversations
  | ReplyChatConversationGetConversations
  | PublicConversationResponse
  | RequestChatConversationGetConversationsId
  | ReplyChatConversationGetConversationsId
  | PublicConversationTimeline
  | PublicConversationMessage
  | RequestChatConversationGetConversationsIdMessages
  | ReplyChatConversationGetConversationsIdMessages
  | PublicConversationSend
  | PublicConversationSendResponse
  | PublicConversationQueued
  | RequestChatConversationPostConversationsIdMessages
  | ReplyChatConversationPostConversationsIdMessages
  | PublicConversationEnvelopeTimeline
  | PublicConversationMessageEnvelopeV2
  | RequestChatConversationGetConversationsIdMessageEnvelopes
  | ReplyChatConversationGetConversationsIdMessageEnvelopes
  | PublicConversationRichTimeline
  | PublicConversationMessageEnvelopeV3
  | RequestChatConversationGetConversationsIdMessageEnvelopesV3
  | ReplyChatConversationGetConversationsIdMessageEnvelopesV3
  | PublicConversationIntentResponse
  | PublicConversationIntent
  | RequestChatConversationGetConversationsIdOutboundIntentsIntentId
  | ReplyChatConversationGetConversationsIdOutboundIntentsIntentId
  | PublicConversationAcquisitionSessions
  | RequestChatConversationGetConversationsIdAcquisitionSessions
  | ReplyChatConversationGetConversationsIdAcquisitionSessions
  | PublicConversationNotes
  | RequestChatConversationGetConversationsIdNotes
  | ReplyChatConversationGetConversationsIdNotes
  | PublicConversationNote
  | PublicConversationNoteResponse
  | RequestChatConversationPostConversationsIdNotes
  | ReplyChatConversationPostConversationsIdNotes
  | PublicConversationTransition
  | RequestChatConversationPostConversationsIdTransition
  | ReplyChatConversationPostConversationsIdTransition
  | PublicRoutingAssignment
  | PublicRoutingResponse
  | PublicRoutingEntity
  | RequestChatRoutingAssignment
  | ReplyChatRoutingAssignment
  | PublicRoutingTakeover
  | RequestChatRoutingTakeover
  | ReplyChatRoutingTakeover
  | PublicRoutingTargets
  | PublicRoutingTarget
  | RequestChatRoutingTargets
  | ReplyChatRoutingTargets
  | PublicRoutingHistory
  | PublicRoutingHistoryEntry
  | RequestChatRoutingHistory
  | ReplyChatRoutingHistory
  | PublicContactSendRequest
  | RequestChatContactBoundSend
  | ReplyChatContactBoundSend
  | PublicConversationChannelOptions
  | RequestChatConversationChannels
  | ReplyChatConversationChannels
  | PublicWorkspaceCapabilities
  | RequestChatWorkspaceCapabilities
  | ReplyChatWorkspaceCapabilities
  | PublicWorkspaceSidebar
  | RequestChatWorkspaceSidebar
  | ReplyChatWorkspaceSidebar
  | PublicWorkspaceList
  | PublicWorkspaceItem
  | RequestChatWorkspaceConversations
  | ReplyChatWorkspaceConversations
  | PublicWorkspaceReadResponse
  | PublicWorkspaceReadState
  | RequestChatWorkspaceConversationsIdReadState
  | ReplyChatWorkspaceConversationsIdReadState
  | PublicWorkspaceMarkRead
  | RequestChatWorkspaceMarkRead
  | ReplyChatWorkspaceMarkRead
  | PublicCatalogInboxOptions
  | RequestChatCatalogInboxOptions
  | ReplyChatCatalogInboxOptions
  | PublicCatalogInboxList
  | PublicCatalogInbox
  | PublicCatalogPredicate
  | RequestChatCatalogListInboxes
  | ReplyChatCatalogListInboxes
  | PublicCatalogInboxCreate
  | PublicCatalogPredicateInput
  | PublicCatalogInboxResponse
  | RequestChatCatalogCreateInbox
  | ReplyChatCatalogCreateInbox
  | RequestChatCatalogGetInbox
  | ReplyChatCatalogGetInbox
  | PublicCatalogInboxPatch
  | RequestChatCatalogPatchInbox
  | ReplyChatCatalogPatchInbox
  | PublicCatalogEmpty
  | PublicCatalogArchive
  | RequestChatCatalogDeleteInbox
  | ReplyChatCatalogDeleteInbox
  | PublicCatalogTagList
  | PublicCatalogTag
  | RequestChatCatalogListTags
  | ReplyChatCatalogListTags
  | PublicCatalogTagCreate
  | PublicCatalogTagResponse
  | RequestChatCatalogCreateTag
  | ReplyChatCatalogCreateTag
  | RequestChatCatalogGetTag
  | ReplyChatCatalogGetTag
  | PublicCatalogTagPatch
  | RequestChatCatalogPatchTag
  | ReplyChatCatalogPatchTag
  | RequestChatCatalogDeleteTag
  | ReplyChatCatalogDeleteTag
  | PublicCatalogSnippetList
  | PublicCatalogSnippet
  | RequestChatCatalogListSnippets
  | ReplyChatCatalogListSnippets
  | PublicCatalogSnippetCreate
  | PublicCatalogSnippetResponse
  | RequestChatCatalogCreateSnippet
  | ReplyChatCatalogCreateSnippet
  | RequestChatCatalogGetSnippet
  | ReplyChatCatalogGetSnippet
  | PublicCatalogSnippetPatch
  | RequestChatCatalogPatchSnippet
  | ReplyChatCatalogPatchSnippet
  | RequestChatCatalogDeleteSnippet
  | ReplyChatCatalogDeleteSnippet
  | PublicCatalogInboxShares
  | RequestChatCatalogInboxShares
  | ReplyChatCatalogInboxShares
  | PublicCatalogTagLinks
  | RequestChatCatalogPutConversationTag
  | ReplyChatCatalogPutConversationTag
  | RequestChatCatalogDeleteConversationTag
  | ReplyChatCatalogDeleteConversationTag
  | PublicSnoozeResponse
  | PublicSnoozeState
  | RequestChatWorkspaceGetSnooze
  | ReplyChatWorkspaceGetSnooze
  | PublicSnoozePut
  | RequestChatWorkspacePutSnooze
  | ReplyChatWorkspacePutSnooze
  | PublicSnoozeEmpty
  | RequestChatWorkspacePostWake
  | ReplyChatWorkspacePostWake
  | PublicActivityResponse
  | PublicActivityItem
  | RequestChatWorkspaceGetActivity
  | ReplyChatWorkspaceGetActivity
  | PublicConversationClassificationResponse
  | RequestChatConversationClassificationGetConversationsConversationSessionsSessionClassification
  | ReplyChatConversationClassificationGetConversationsConversationSessionsSessionClassification
  | PublicConversationClassificationInput
  | PublicConversationClassificationResult
  | RequestChatConversationClassificationPostConversationsConversationSessionsSessionClassification
  | ReplyChatConversationClassificationPostConversationsConversationSessionsSessionClassification
  | PublicConversationContributionsResponse
  | RequestChatConversationClassificationGetConversationsConversationSessionsSessionContributions
  | ReplyChatConversationClassificationGetConversationsConversationSessionsSessionContributions
  | PublicConversationAssignmentTeamsResponse
  | RequestChatConversationClassificationGetRecordsIdAssignmentTeams
  | ReplyChatConversationClassificationGetRecordsIdAssignmentTeams
  | PublicNeedAssessmentResponse
  | RequestChatNeedGetAssessment
  | ReplyChatNeedGetAssessment
  | PublicNeedAssessmentInput
  | PublicNeedAssessmentResult
  | RequestChatNeedPostAssessment
  | ReplyChatNeedPostAssessment
  | PublicNeedEnrichInput
  | RequestChatNeedPostEnrich
  | ReplyChatNeedPostEnrich
  | PublicNeedOutcomeInput
  | RequestChatNeedPostOutcome
  | ReplyChatNeedPostOutcome
  | ExternalListConversations
  | External_Conversation
  | External_Meta
  | RequestChatExternalConversations
  | ReplyChatExternalConversations
  | ExternalGetConversation
  | RequestChatExternalConversationsId
  | ReplyChatExternalConversationsId
  | ExternalListConversationMessages
  | External_Message
  | RequestChatExternalConversationsIdMessages
  | ReplyChatExternalConversationsIdMessages
  | ExternalGetConversationMessage
  | RequestChatExternalConversationsIdMessagesMessageId
  | ReplyChatExternalConversationsIdMessagesMessageId
  | OwnerExternalReadPolicy
  | RequestChatExternalPrepare
  | ReplyChatExternalPrepare
  | RequestIdentityExternalPolicy
  | ReplyIdentityExternalPolicy
  | ChatWorkspaceWorkspaceReadEvent
  | ChatActivitySnoozeEvent
  | ChatCatalogsCatalogInboxEvent
  | ChatCatalogsCatalogSnippetEvent
  | ChatCatalogsCatalogTagEvent
  | ChatCatalogsCatalogTagLinkEvent
  | ChatActivityActivityNoteEvent
  | ChatActivityActivityAutomationEvent
  | OwnerChatEvent
  | OwnerEventNotice
  | OwnerEventReceipt
  | OwnerDomainEvent
  | OwnerControlEvent
  | ChatControlV1_ChatRegistrySnapshot
  | OwnerEventPayload
  | OwnerEventReadResult
  | RequestChatEventDeliver
  | ReplyChatEventDeliver
  | RequestChatEventStatus
  | ReplyChatEventStatus
  | RequestChatEventReplay
  | ReplyChatEventReplay
  | RequestChatEventRead
  | ReplyChatEventRead
  | RequestIdentityEventDeliver
  | ReplyIdentityEventDeliver
  | RequestIdentityEventStatus
  | ReplyIdentityEventStatus
  | RequestIdentityEventReplay
  | ReplyIdentityEventReplay
  | RequestIdentityEventRead
  | ReplyIdentityEventRead
  | RequestCrmEventDeliver
  | ReplyCrmEventDeliver
  | RequestCrmEventStatus
  | ReplyCrmEventStatus
  | RequestCrmEventReplay
  | ReplyCrmEventReplay
  | RequestCrmEventRead
  | ReplyCrmEventRead
  | RequestConnectorEventDeliver
  | ReplyConnectorEventDeliver
  | RequestConnectorEventStatus
  | ReplyConnectorEventStatus
  | RequestConnectorEventReplay
  | ReplyConnectorEventReplay
  | RequestConnectorEventRead
  | ReplyConnectorEventRead
  | RequestRoutingEventDeliver
  | ReplyRoutingEventDeliver
  | RequestRoutingEventStatus
  | ReplyRoutingEventStatus
  | RequestRoutingEventReplay
  | ReplyRoutingEventReplay
  | RequestRoutingEventRead
  | ReplyRoutingEventRead
  | RequestSalesEventDeliver
  | ReplySalesEventDeliver
  | RequestSalesEventStatus
  | ReplySalesEventStatus
  | RequestSalesEventReplay
  | ReplySalesEventReplay
  | RequestSalesEventRead
  | ReplySalesEventRead
  | RequestAiRuntimeEventDeliver
  | ReplyAiRuntimeEventDeliver
  | RequestAiRuntimeEventStatus
  | ReplyAiRuntimeEventStatus
  | RequestAiRuntimeEventReplay
  | ReplyAiRuntimeEventReplay
  | RequestAiRuntimeEventRead
  | ReplyAiRuntimeEventRead
  | RequestWorkflowEventDeliver
  | ReplyWorkflowEventDeliver
  | RequestWorkflowEventStatus
  | ReplyWorkflowEventStatus
  | RequestWorkflowEventReplay
  | ReplyWorkflowEventReplay
  | RequestWorkflowEventRead
  | ReplyWorkflowEventRead
  | RequestReportingEventDeliver
  | ReplyReportingEventDeliver
  | RequestReportingEventStatus
  | ReplyReportingEventStatus
  | RequestReportingEventReplay
  | ReplyReportingEventReplay
  | RequestReportingEventRead
  | ReplyReportingEventRead;
export type OwnerRecoveryProof = OwnerCommandProof | OwnerCommandTombstone;
/**
 * This interface was referenced by `undefined`'s JSON-Schema definition
 * via the `patternProperty` "^[a-zA-Z][a-zA-Z0-9_.]{0,127}$".
 */
export type OwnerFieldValue = string | number | boolean | null | string[];
export type OwnerBatchItem =
  | {
      id: string;
      state: "found";
      record: OwnerProjectedRecord;
    }
  | {
      id: string;
      state: "not_found" | "forbidden" | "unavailable";
    };
export type OwnerFailure =
  | OwnerBoundaryFailure
  | {
      schema_version: 1;
      request_id: string;
      code: "DOMAIN_ERROR";
      public_error: AuthErrorResponse;
    };
export type OwnerRoutingViewData = HumanRoutingHumanRoutingMine | HumanRoutingHumanRoutingSnapshot;
export type OwnerSnapshotRow =
  | {
      kind: "session";
      id: string;
      conversation_id: string;
      sequence: string;
      version: string;
      status: "active" | "closed";
      opening_reason: string;
      close_reason: string | null;
      opened_at: string;
      opening_occurred_at: string;
      closed_at: string | null;
      source_classification: "paid" | "organic" | "unknown";
      source_channel: string | null;
      source_page_id: string | null;
      source_ad_id: string | null;
      source_campaign_id: string | null;
      source_connection_id: string | null;
      source_touchpoint_id: string | null;
      initial_owner_id: string | null;
      initial_team_id: string | null;
      owner_principal_id: string | null;
      team_id: string | null;
      owner_revision: string;
      record_version: string;
      process_version: string | null;
      stage_key: string | null;
      coverage: "full" | "partial" | "none";
      progress_at: string | null;
    }
  | {
      kind: "need";
      id: string;
      session_id: string;
      created_at: string;
    }
  | {
      kind: "stage";
      id: string;
      session_id: string;
      revision: string;
      from_stage: string | null;
      to_stage: string;
      recorded_at: string;
    }
  | {
      kind: "milestone";
      id: string;
      session_id: string;
      need_id: string;
      revision: string;
      milestone_key: string;
      action: "record" | "replace" | "retract";
      supersedes_id: string | null;
      message_id: string | null;
      occurred_at: string;
      recorded_at: string;
    }
  | {
      kind: "process";
      version: string;
      definition: SessionProgressSessionProcessInput;
    }
  | {
      kind: "reply";
      id: string;
      session_id: string;
      actor_id: string;
      team_id: string | null;
      recorded_at: string;
    }
  | {
      kind: "routing-session";
      session_id: string;
      conversation_id: string;
      connection_id: string;
      opened_at: string;
      closed_at: string | null;
      status: "active" | "closed";
      owner_principal_id: string | null;
      team_id: string | null;
      owner_revision: string;
      assigned_at: string;
    };
export type PublicSessionProgressInput =
  | {
      action: "enroll";
    }
  | {
      action: "stage";
      stage_key: string;
      reason: string;
    }
  | {
      action: "need";
      label: string;
    }
  | {
      action: "record";
      need_id: string;
      milestone_key: string;
      occurred_at: string;
      reason: string;
      message_id?: string;
    }
  | {
      action: "replace";
      supersedes_id: string;
      occurred_at: string;
      reason: string;
      message_id?: string;
    }
  | {
      action: "retract";
      supersedes_id: string;
      reason: string;
    }
  | {
      action: "identify_need";
      label: string;
    };
export type PublicActivityItem =
  | {
      id: string;
      kind: "message";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        message_id: string;
        envelope: PublicConversationMessageEnvelopeV3;
        inbound_seq: string | null;
      };
    }
  | {
      id: string;
      kind: "note";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        activity_id: string;
        body?: string;
      };
    }
  | {
      id: string;
      kind: "assignment";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        from_principal_id: string | null;
        to_principal_id: string | null;
        owner_revision: string;
        reason: string;
      };
    }
  | {
      id: string;
      kind: "lifecycle";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        from_status: "open" | "pending" | "closed";
        to_status: "open" | "pending" | "closed";
      };
    }
  | {
      id: string;
      kind: "snooze";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        until: string | null;
        cause: "scheduled" | "rescheduled" | "deadline" | "inbound" | "manual" | "assignment" | "closed";
      };
    }
  | {
      id: string;
      kind: "tags";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        tag_id: string;
        operation: "attached" | "detached";
      };
    }
  | {
      id: string;
      kind: "automation";
      occurred_at: string;
      recorded_at: string;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      } | null;
      source_ref: {
        service: "chat" | "crm" | "workflow";
        kind: string;
        id: string;
        revision: string;
      };
      payload: {
        source_service: "workflow";
        run_id: string;
        definition_version_id: string;
        state: "started" | "paused" | "resumed" | "completed" | "failed" | "cancelled";
      };
    };
export type OwnerChatEvent =
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      consumer: "chat.read-marker.v1";
      event_type: "chat.read_marker.updated";
      schema_version: 1;
      data: ChatWorkspaceWorkspaceReadEvent;
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      consumer: "chat.snooze.v1";
      event_type: "chat.snooze.changed";
      schema_version: 1;
      data: ChatActivitySnoozeEvent;
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      consumer: "chat.inbox.changed.v1";
      event_type: "chat.inbox.changed";
      schema_version: 1;
      data: ChatCatalogsCatalogInboxEvent;
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      consumer: "chat.snippet.changed.v1";
      event_type: "chat.snippet.changed";
      schema_version: 1;
      data: ChatCatalogsCatalogSnippetEvent;
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      consumer: "chat.tag_definition.changed.v1";
      event_type: "chat.tag_definition.changed";
      schema_version: 1;
      data: ChatCatalogsCatalogTagEvent;
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      consumer: "chat.conversation-tag.v1";
      event_type: "chat.conversation_tag.changed";
      schema_version: 1;
      data: ChatCatalogsCatalogTagLinkEvent;
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "crm";
      consumer: "chat.activity.note.v1";
      event_type: "crm.conversation_note.changed";
      schema_version: 1;
      data: ChatActivityActivityNoteEvent;
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "workflow";
      consumer: "chat.activity.automation.v1";
      event_type: "automation.conversation_activity.v1";
      schema_version: 1;
      data: ChatActivityActivityAutomationEvent;
    };
export type OwnerDomainEvent =
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "identity";
      event_type: "principal.access_changed";
      schema_version: 1;
      data: {
        principal_id: string;
        auth_revision: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "conversation.created";
      schema_version: 1;
      data: {
        contact_id: string;
        connection_id: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "acquisition_session.opened";
      schema_version: 1;
      data: {
        session_id: string;
        conversation_id: string;
        status: "active" | "closed";
        source_classification: "paid" | "organic" | "unknown";
        source_ad_id: string | null;
        sequence: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "acquisition_session.closed";
      schema_version: 1;
      data: {
        session_id: string;
        conversation_id: string;
        status: "active" | "closed";
        source_classification: "paid" | "organic" | "unknown";
        source_ad_id: string | null;
        sequence: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "need.assessed";
      schema_version: 2;
      data: {
        conversation_id: string;
        session_id: string;
        need_id: string;
        assessment_version: string;
        contact_id: string;
        connection_id: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "need.assessed";
      schema_version: 1;
      data: {
        thread_id: string;
        session_id: string;
        need_id: string;
        assessment_version: string;
        contact_id: string;
        connection_id: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "record.assigned";
      schema_version: 1;
      data: {
        record_id: string;
        object_type: "conversation";
        from_owner_id: string | null;
        to_owner_id: string | null;
        team_id: string | null;
        owner_revision: string;
        reason: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "sales";
      event_type: "lead.accepted";
      schema_version: 1;
      data: {
        lead_id: string;
        handoff_id: string;
        accepted_by: string;
        accepted_at: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "message.received";
      schema_version: 1;
      data: {
        conversation_id: string;
        message_id: string;
        connection_id: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "message.sent";
      schema_version: 1;
      data: {
        conversation_id: string;
        message_id: string;
        outbound_intent_id: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "message.delivery_failed";
      schema_version: 1;
      data: {
        conversation_id: string;
        outbound_intent_id: string;
        error_code: string | null;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "conversation.classification_changed";
      schema_version: 2;
      data: {
        conversation_id: string;
        session_id: string;
        version: string;
        /**
         * @maxItems 100
         */
        changed_keys: string[];
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "conversation.classification_changed";
      schema_version: 1;
      data: {
        thread_id: string;
        session_id: string;
        version: string;
        /**
         * @maxItems 100
         */
        changed_keys: string[];
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "sales";
      event_type: "sales.stage_changed";
      schema_version: 1;
      data: {
        object_kind: "lead" | "deal";
        subject_id: string;
        sequence: string;
        from_stage: string | null;
        to_stage: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "chat";
      event_type: "session.progress_changed";
      schema_version: 1;
      data: {
        session_id: string;
        revision: string;
        action: "enroll" | "stage" | "need" | "identify_need" | "record" | "replace" | "retract";
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "crm";
      event_type: "contact.created";
      schema_version: 1;
      data: {
        contact_id: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "sales";
      event_type: "lead.created";
      schema_version: 1;
      data: {
        lead_id: string;
        contact_id: string;
        conversation_id: string | null;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "sales";
      event_type: "lead.qualified";
      schema_version: 1;
      data: {
        lead_id: string;
        qualified_at: string;
        source_touchpoint_id: string | null;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "sales";
      event_type: "lead.handoff_requested";
      schema_version: 1;
      data: {
        lead_id: string;
        handoff_id: string;
        target_team_id: string;
        due_at: string | null;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "sales";
      event_type: "deal.created";
      schema_version: 1;
      data: {
        deal_id: string;
        contact_id: string;
        lead_id: string | null;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "sales";
      event_type: "deal.won";
      schema_version: 1;
      data: {
        deal_id: string;
        contact_id: string;
        lead_id: string | null;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "crm";
      event_type: "record.assigned";
      schema_version: 1;
      data: {
        record_id: string;
        object_type: string;
        from_owner_id: string | null;
        to_owner_id: string | null;
        team_id: string | null;
        owner_revision: string;
        reason: string;
      };
    }
  | {
      event_id: string;
      tenant_id: string;
      aggregate_id: string;
      aggregate_type: string;
      aggregate_version: string;
      stream_sequence: string;
      occurred_at: string;
      correlation_id: string;
      causation_id: string | null;
      actor: {
        kind: "human" | "ai" | "service" | "system";
        id: string;
      };
      producer: "sales";
      event_type: "record.assigned";
      schema_version: 1;
      data: {
        record_id: string;
        object_type: "lead" | "deal";
        from_owner_id: string | null;
        to_owner_id: string | null;
        team_id: string | null;
        owner_revision: string;
        reason: string;
      };
    };
export type OwnerEventPayload =
  | OwnerChatEvent
  | {
      notice: OwnerEventNotice;
    };
export type OwnerEventReadResult = OwnerChatEvent | OwnerDomainEvent | OwnerControlEvent;

export interface OwnerActor {
  kind: "human" | "app" | "service" | "ai";
  principal_id: string;
  delegation_id: string;
}
export interface OwnerResource {
  resource_id: string;
  object_key: string;
  record_version: string;
  owner_revision: string;
  control_revision: string;
  owner_principal_id: string | null;
  team_id: string | null;
  /**
   * @maxItems 200
   */
  shared_team_ids: string[];
  archived: boolean;
}
export interface OwnerTarget {
  principal_id: string | null;
  kind: "human" | "ai" | null;
  team_id: string | null;
}
export interface OwnerMetadataPin {
  object_type_id: string;
  schema_revision: string;
  snapshot_digest: string;
}
export interface OwnerCustomProperty {
  id: string;
  key: string;
  type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
  required: boolean;
  indexed: boolean;
  options: string[] | null;
  version: string;
}
export interface OwnerMetadataSnapshot {
  tenant_id: string;
  object_type_id: string;
  object_key: "conversation" | "conversation_session" | "conversation_need";
  schema_revision: string;
  /**
   * @maxItems 200
   */
  properties: OwnerCustomProperty[];
  snapshot_digest: string;
}
export interface OwnerDependency {
  owner:
    | "chat"
    | "identity"
    | "crm"
    | "connector"
    | "routing"
    | "ai-runtime"
    | "workflow"
    | "reporting"
    | "external-api"
    | "bff"
    | "sales";
  receipt_id: string;
  binding_digest: string;
}
export interface OwnerGraph {
  graph_version_id: string;
  run_id: string;
  step_id: string;
  attempt: string;
  action_key: string;
}
export interface OwnerCommandBinding {
  tenant_id: string;
  command_id: string;
  owner:
    | "chat"
    | "identity"
    | "crm"
    | "connector"
    | "routing"
    | "ai-runtime"
    | "workflow"
    | "reporting"
    | "external-api"
    | "bff"
    | "sales";
  operation: string;
  actor: OwnerActor;
  resource: OwnerResource;
  target: OwnerTarget | null;
  session_id: string | null;
  /**
   * @maxItems 200
   */
  fields: string[];
  payload_digest: string;
  legacy_receipt_key: string;
  graph: OwnerGraph | null;
  /**
   * @maxItems 16
   */
  dependencies:
    | []
    | [OwnerDependency]
    | [OwnerDependency, OwnerDependency]
    | [OwnerDependency, OwnerDependency, OwnerDependency]
    | [OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency]
    | [OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency]
    | [OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ];
  metadata?: OwnerMetadataPin;
  /**
   * @maxItems 200
   */
  session_write_fields?: string[];
  /**
   * @maxItems 200
   */
  session_read_fields?: string[];
  /**
   * @maxItems 200
   */
  record_read_fields?: string[];
  need?: {
    need_id: string;
    assessment_version: string;
  };
  outcome?: OwnerOutcomePin;
  inbox_inputs?: OwnerInboxInputs;
  projection?: OwnerProjectionPin;
  /**
   * @maxItems 200
   */
  query_filter_fields?: string[];
  routing_snapshot?: string;
  routing_dispatch?: OwnerRoutingDispatchPin;
  routing_reroute?: OwnerRoutingReroutePin;
  routing_view?: OwnerRoutingViewSelection;
  references?: OwnerIngressReferences;
  ingress_channel?: OwnerIngressChannel;
  ingress_touchpoint?: OwnerIngressTouchpoint;
  note?: OwnerNotePin;
}
export interface OwnerOutcomePin {
  record_id: string;
  source: OwnerOutcomeSource | null;
  request_hash: string;
  key: string;
  correlation_id: string;
}
export interface OwnerOutcomeSource {
  resource: OwnerResource;
  source_digest: string;
}
export interface OwnerInboxInputs {
  /**
   * @maxItems 52
   */
  targets: {
    kind: "principal" | "team";
    id: string;
  }[];
  /**
   * @maxItems 200
   */
  filter_fields: string[];
}
export interface OwnerProjectionPin {
  contact_id: string;
  connection_id: string;
}
export interface OwnerRoutingDispatchPin {
  work_id: string;
  entry_id: string;
  queue_version_id: string;
}
export interface OwnerRoutingReroutePin {
  work_id: string;
  work_version: string;
  queue_version_id: string;
}
export interface OwnerRoutingViewSelection {
  mine: boolean;
  /**
   * @maxItems 500
   */
  profile_ids: string[];
  /**
   * @maxItems 500
   */
  conversation_ids: string[];
  /**
   * @maxItems 5000
   */
  session_ids: string[];
  from: string;
}
export interface OwnerIngressReferences {
  connection_id: string;
  crm_contact_id: string;
  crm_identity_id: string;
  external_subject_digest: string;
  mapping_revision: "1";
  contact_revision: string;
  platform: "mock_messenger";
  connection_revision: "1";
}
export interface OwnerIngressChannel {
  service_actor_id: string;
  team_id: string;
  channel_id: string;
}
export interface OwnerIngressTouchpoint {
  id: string;
  receipt_id: string;
  provider_message_digest: string;
  occurred_at: string;
  ad_id: string | null;
  campaign_id: string | null;
}
export interface OwnerNotePin {
  body_digest: string;
  request_hash: string;
  key: string;
  correlation_id: string;
}
export interface OwnerCommandRef {
  command_id: string;
  binding_digest: string;
}
export interface OwnerCommandTombstone {
  command_id: string;
  binding_digest: string;
  state: "aborted";
}
export interface OwnerCommandProof {
  binding: OwnerCommandBinding;
  binding_digest: string;
  state: "prepared" | "committed" | "aborted";
  effect_id: string | null;
  effect_revision: string | null;
  /**
   * @maxItems 16
   */
  children:
    | []
    | [OwnerDependency]
    | [OwnerDependency, OwnerDependency]
    | [OwnerDependency, OwnerDependency, OwnerDependency]
    | [OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency]
    | [OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency]
    | [OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency, OwnerDependency]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ]
    | [
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency,
        OwnerDependency
      ];
  candidate_digest: string | null;
  /**
   * @maxItems 100
   */
  resource_contexts: OwnerResource[];
  ingress_result?: OwnerIngressResult;
}
export interface OwnerIngressResult {
  receipt_id: string;
  state: "processed" | "failed";
  conversation_id: string | null;
  message_id: string | null;
  touchpoint_id: string | null;
  session_id: string | null;
}
export interface OwnerAdmission {
  admission_id: string;
  command_id: string;
  binding_digest: string;
  state: "admitted" | "settled" | "denied";
  auth_revision: string;
  /**
   * @maxItems 200
   */
  allowed_fields: string[];
}
export interface OwnerBarrier {
  barrier_id: string;
  state: "closing" | "completed";
  pending_count: number;
  auth_revision: string;
}
export interface OwnerCapacity {
  reservation_id: string;
  command_id: string;
  binding_digest: string;
  session_id: string;
  principal_id: string | null;
  owner_revision: string;
  state: "reserved" | "confirmed" | "released" | "not-managed";
  allocation_id: string | null;
  queue_version_id: string | null;
}
export interface OwnerReference {
  reservation_id: string;
  command_id: string;
  binding_digest: string;
  resource_id: string;
  revision: string;
  state: "reserved" | "released" | "closing" | "archived" | "rejected";
}
export interface OwnerPage {
  limit: number;
  cursor: string | null;
  minimum_watermark: string;
  /**
   * @maxItems 200
   */
  fields: string[];
}
export interface OwnerFreshness {
  as_of: string;
  watermark: string;
  state: "ready" | "delayed" | "unavailable" | "partial";
  next_cursor: string | null;
}
export interface OwnerProjectedRecord {
  id: string;
  version: string;
  properties: {
    [k: string]: OwnerFieldValue;
  };
}
export interface OwnerBatch {
  /**
   * @maxItems 100
   */
  data: OwnerBatchItem[];
  freshness: OwnerFreshness;
}
export interface OwnerSessionSource {
  conversation_id: string;
  session_id: string | null;
  crm_contact_id: string;
  source_touchpoint_id: string | null;
  source_classification: "paid" | "organic" | "unknown";
  source_channel: string | null;
  source_connection_id: string | null;
  source_page_id: string | null;
  source_ad_id: string | null;
  source_campaign_id: string | null;
  record_version: string;
  session_revision: string;
}
export interface OwnerOutcome {
  need_id: string;
  state: "absent" | "linked" | "ambiguous";
  record_id: string | null;
  record_version: string | null;
  reservation: OwnerReference | null;
}
export interface OwnerFact {
  id: string;
  conversation_id: string;
  session_id: string | null;
  need_id: string | null;
  actor_id: string | null;
  team_id: string | null;
  kind:
    "session" | "stage_enter" | "stage_exit" | "milestone" | "contribution" | "reply_submitted" | "owner" | "coverage";
  occurred_at: string;
  recorded_at: string;
  revision: string;
  stage_key: string | null;
  process_version_id: string | null;
  supersedes_id: string | null;
  coverage: "full" | "partial" | "none";
}
export interface OwnerFacts {
  /**
   * @maxItems 5000
   */
  data: OwnerFact[];
  freshness: OwnerFreshness;
}
export interface OwnerActivityBinding {
  conversation_id: string;
  source_id: string;
  revision: string;
  definition_version_id: string | null;
  visible: boolean;
}
export interface OwnerRecovery {
  outcome:
    | "recovered"
    | "already_recovered"
    | "not_assessed"
    | "assessment_changed"
    | "newer_session"
    | "thread_open"
    | "cooldown"
    | "stale_evidence"
    | "newer_evidence"
    | "need_not_clear"
    | "no_unresolved_reason"
    | "confidence_too_low"
    | "outcome_exists"
    | "outcome_unmapped";
  conversation_id: string;
  session_id: string | null;
  owner_id: string | null;
}
export interface OwnerCapabilities {
  lineage: "crm_chat";
  /**
   * @maxItems 4
   */
  capabilities:
    | []
    | ["workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1"]
    | [
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1",
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1"
      ]
    | [
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1",
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1",
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1"
      ]
    | [
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1",
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1",
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1",
        "workspace_read_v1" | "workspace_catalog_v1" | "activity_v1" | "owner_v1"
      ];
  watermark: string;
}
export interface OwnerBoundaryFailure {
  schema_version: 1;
  request_id: string;
  code:
    | "INVALID_REQUEST"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "REVOKED"
    | "NOT_FOUND"
    | "CONFLICT"
    | "STALE_VERSION"
    | "CAPACITY"
    | "INVALID_TRANSITION"
    | "LIMIT_EXCEEDED"
    | "REFERENCE_INVALID"
    | "PRECONDITION_REQUIRED"
    | "DEPENDENCY_UNAVAILABLE";
}
export interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
    fields: string[];
    retryable: boolean;
  };
  meta: {
    correlation_id: string;
  };
}
export interface OwnerOutcomeReceipt {
  command: OwnerCommandRef;
  state: "committed" | "aborted";
  record_id: string | null;
}
export interface OwnerClassificationMetadata {
  snapshot: OwnerMetadataSnapshot;
  /**
   * @maxItems 100
   */
  definitions: {
    id: string;
    key: string;
    type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
    required: boolean;
    indexed: boolean;
    options: string[] | null;
    version: string;
    label: string;
    default_value: null;
    sensitive: boolean;
  }[];
}
export interface OwnerClassificationPolicy {
  principal_id: string;
  auth_revision: string;
  can_edit: boolean;
  /**
   * @maxItems 200
   */
  read_fields: string[];
  /**
   * @maxItems 200
   */
  write_fields: string[];
}
export interface OwnerContactSummary {
  id?: string;
  display_name?: string;
  normalized_phone?: string | null;
  normalized_email?: string | null;
}
export interface OwnerConversationPolicy {
  principal_id: string;
  auth_revision: string;
  owner_kind: "human" | "ai" | null;
  /**
   * @maxItems 200
   */
  allowed_fields: string[];
  /**
   * @maxItems 5
   */
  allowed_actions:
    | []
    | ["reply" | "note" | "update" | "assign" | "takeover"]
    | ["reply" | "note" | "update" | "assign" | "takeover", "reply" | "note" | "update" | "assign" | "takeover"]
    | [
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover"
      ]
    | [
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover"
      ]
    | [
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover",
        "reply" | "note" | "update" | "assign" | "takeover"
      ];
}
export interface OwnerAssignmentDirectory {
  principal_id: string;
  auth_revision: string;
  resource: OwnerResource;
  team_id: string | null;
  /**
   * @maxItems 200
   */
  candidates: {
    id: string;
    kind: "human" | "ai";
    eligible: boolean;
    reason: null | "unavailable" | "team" | "capability" | "role" | "field" | "policy";
  }[];
  /**
   * @maxItems 200
   */
  teams: {
    id: string;
    name: string;
    purpose: "chat" | "sales" | "service" | "general";
  }[];
}
export interface OwnerRoutingSession {
  session_id: string;
  conversation_id: string;
  connection_id: string;
  opened_at: string;
  closed_at: string | null;
  status: "active" | "closed";
  owner_principal_id: string | null;
  team_id: string | null;
  owner_revision: string;
  assigned_at: string;
}
export interface OwnerRoutingSnapshot {
  /**
   * @maxItems 1000
   */
  sessions: OwnerRoutingSession[];
  /**
   * @maxItems 500
   */
  missing: string[];
  snapshot_digest: string;
}
export interface OwnerRoutingReplyFact {
  id: string;
  session_id: string;
  actor_id: string;
  team_id: string | null;
  recorded_at: string;
}
export interface OwnerRoutingReplySnapshot {
  /**
   * @maxItems 5000
   */
  facts: OwnerRoutingReplyFact[];
  /**
   * @maxItems 500
   */
  replies: {
    principal_id: string;
    submitted_replies: number;
  }[];
  snapshot_digest: string;
}
export interface OwnerReadPredicate {
  all: boolean;
  own: boolean;
  /**
   * @maxItems 200
   */
  team_ids: string[];
}
export interface OwnerRoutingViewPolicy {
  principal_id: string;
  auth_revision: string;
  selection: OwnerRoutingViewSelection;
  read: OwnerReadPredicate;
  /**
   * @maxItems 200
   */
  allowed_fields: string[];
}
export interface OwnerRoutingViewDirectory {
  policy_digest: string;
  /**
   * @maxItems 500
   */
  available: {
    principal_id: string;
    available: boolean;
  }[];
  /**
   * @maxItems 500
   */
  principals: {
    id: string;
    name: string;
  }[];
  /**
   * @maxItems 200
   */
  teams: {
    id: string;
    name: string;
  }[];
}
export interface OwnerRoutingViewChat {
  policy_digest: string;
  /**
   * @maxItems 500
   */
  visible_ids: string[];
  /**
   * @maxItems 500
   */
  replies: {
    principal_id: string;
    submitted_replies: number;
  }[];
  snapshot_digest: string;
}
export interface HumanRoutingHumanRoutingMine {
  /**
   * @maxItems 500
   */
  profiles: {
    principal_id: string;
    version: string;
    enabled: boolean;
    capacity: number;
    workload: number;
    available: boolean;
  }[];
  /**
   * @maxItems 500
   */
  work: {
    id: string;
    conversation_id: string;
    session_id: string;
    state: "waiting" | "assigned";
    version: string;
    allocation_id: null | string;
    principal_id: null | string;
    team_id: null | string;
    assigned_at: null | string;
    queue_id: null | string;
    queue_name: null | string;
    blocked_reason: null | string;
    wait_started_at: null | string;
  }[];
}
export interface HumanRoutingHumanRoutingSnapshot {
  /**
   * @maxItems 500
   */
  profiles: {
    principal_id: string;
    version: string;
    enabled: boolean;
    capacity: number;
    workload: number;
    available: boolean;
  }[];
  /**
   * @maxItems 500
   */
  work: {
    id: string;
    conversation_id: string;
    session_id: string;
    state: "waiting" | "assigned";
    version: string;
    allocation_id: null | string;
    principal_id: null | string;
    team_id: null | string;
    assigned_at: null | string;
    queue_id: null | string;
    queue_name: null | string;
    blocked_reason: null | string;
    wait_started_at: null | string;
  }[];
  /**
   * @maxItems 200
   */
  skills: {
    id: string;
    skill_key: string;
    name: string;
  }[];
  /**
   * @maxItems 200
   */
  team_skills: {
    team_id: string;
    /**
     * @maxItems 200
     */
    skill_ids: string[];
    version: string;
  }[];
  /**
   * @maxItems 50
   */
  queues: {
    id: string;
    name: string;
    team_id: string;
    connection_id: null | string;
    /**
     * @maxItems 200
     */
    skill_ids: string[];
    priority: number;
    enabled: boolean;
    version: string;
  }[];
  /**
   * @maxItems 500
   */
  principals: {
    id: string;
    name: string;
  }[];
  /**
   * @maxItems 500
   */
  teams: {
    id: string;
    name: string;
  }[];
  /**
   * @maxItems 201
   */
  connections: {
    id: string;
    name: string;
    provider: string;
  }[];
  /**
   * @maxItems 500
   */
  performance: {
    principal_id: string;
    assignments: number;
    completed: number;
    transferred: number;
    handling_seconds: null | number;
  }[];
  /**
   * @maxItems 500
   */
  replies: {
    principal_id: string;
    submitted_replies: number;
  }[];
  average_wait_seconds: null | number;
  period_days: 30;
}
export interface OwnerFunnelPolicy {
  principal_id: string;
  auth_revision: string;
  read: OwnerReadPredicate;
  fields_visible: boolean;
}
export interface OwnerWorkspacePolicy {
  principal_id: string;
  auth_revision: string;
  /**
   * @maxItems 200
   */
  team_ids: string[];
  read: OwnerReadPredicate;
  update: OwnerReadPredicate;
  /**
   * @maxItems 200
   */
  allowed_fields: string[];
  /**
   * @maxItems 200
   */
  filter_fields: string[];
  tags_write: boolean;
  inbox_manage_all: boolean;
  /**
   * @maxItems 100
   */
  rows: {
    id: string;
    policy: OwnerConversationPolicy;
  }[];
}
export interface OwnerContactDecision {
  id: string;
  allowed: boolean;
  /**
   * @maxItems 200
   */
  fields: string[];
}
export interface OwnerContactBinding {
  connection_id: string;
  crm_contact_id: string;
  crm_identity_id: string;
  external_subject_digest: string;
  mapping_revision: "1";
  contact_revision: string;
}
export interface OwnerTouchpointReceipt {
  id: string;
  command: OwnerCommandRef;
  state: "prepared" | "bound" | "discarded" | "cancelled";
  conversation_id: string | null;
  message_id: string | null;
  session_id: string | null;
}
export interface OwnerIngressVerdict {
  input_digest: string;
  state: "valid" | "denied";
  error_code: null | "CONTACT_BINDING_STALE" | "REVOKED";
  service_actor_id: string | null;
  team_id: string | null;
}
export interface RequestCrmIngressVerdict {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "ingress-verdict";
  payload: {
    connection_id: string;
    crm_contact_id: string;
    crm_identity_id: string;
    external_subject_digest: string;
    mapping_revision: "1";
  };
}
export interface ReplyCrmIngressVerdict {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerIngressVerdict;
}
export interface RequestConnectorIngressVerdict {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "ingress-verdict";
  payload: {
    connection_id: string;
    platform: "mock_messenger";
  };
}
export interface ReplyConnectorIngressVerdict {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerIngressVerdict;
}
export interface RequestIdentityIngressVerdict {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "ingress-verdict";
  payload: {
    service_actor_id: string;
    team_id: string;
  };
}
export interface ReplyIdentityIngressVerdict {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerIngressVerdict;
}
export interface RequestConnectorTouchpointPrepare {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "touchpoint-prepare";
  payload: OwnerCommandRef;
}
export interface ReplyConnectorTouchpointPrepare {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerTouchpointReceipt;
}
export interface RequestConnectorTouchpointFinalize {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "touchpoint-finalize";
  payload: OwnerCommandRef;
}
export interface ReplyConnectorTouchpointFinalize {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerTouchpointReceipt;
}
export interface RequestChatCommandProof {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-proof";
  payload: OwnerCommandRef;
}
export interface ReplyChatCommandProof {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestChatCommandAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-abort";
  payload: OwnerCommandRef;
}
export interface ReplyChatCommandAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestCrmCommandProof {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-proof";
  payload: OwnerCommandRef;
}
export interface ReplyCrmCommandProof {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestCrmCommandAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-abort";
  payload: OwnerCommandRef;
}
export interface ReplyCrmCommandAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestConnectorCommandProof {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-proof";
  payload: OwnerCommandRef;
}
export interface ReplyConnectorCommandProof {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestConnectorCommandAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-abort";
  payload: OwnerCommandRef;
}
export interface ReplyConnectorCommandAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestRoutingCommandProof {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-proof";
  payload: OwnerCommandRef;
}
export interface ReplyRoutingCommandProof {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestRoutingCommandAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-abort";
  payload: OwnerCommandRef;
}
export interface ReplyRoutingCommandAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestSalesCommandProof {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-proof";
  payload: OwnerCommandRef;
}
export interface ReplySalesCommandProof {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestSalesCommandAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-abort";
  payload: OwnerCommandRef;
}
export interface ReplySalesCommandAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestAiRuntimeCommandProof {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-proof";
  payload: OwnerCommandRef;
}
export interface ReplyAiRuntimeCommandProof {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestAiRuntimeCommandAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-abort";
  payload: OwnerCommandRef;
}
export interface ReplyAiRuntimeCommandAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestWorkflowCommandProof {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-proof";
  payload: OwnerCommandRef;
}
export interface ReplyWorkflowCommandProof {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestWorkflowCommandAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-abort";
  payload: OwnerCommandRef;
}
export interface ReplyWorkflowCommandAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestReportingCommandProof {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-proof";
  payload: OwnerCommandRef;
}
export interface ReplyReportingCommandProof {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestReportingCommandAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "command-abort";
  payload: OwnerCommandRef;
}
export interface ReplyReportingCommandAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecoveryProof;
}
export interface RequestIdentityAdmit {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admit";
  payload: {
    owner:
      | "chat"
      | "identity"
      | "crm"
      | "connector"
      | "routing"
      | "ai-runtime"
      | "workflow"
      | "reporting"
      | "external-api"
      | "bff"
      | "sales";
    command: OwnerCommandRef;
  };
}
export interface ReplyIdentityAdmit {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerAdmission;
}
export interface RequestIdentityAdmissionRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-read";
  payload: {
    owner:
      | "chat"
      | "identity"
      | "crm"
      | "connector"
      | "routing"
      | "ai-runtime"
      | "workflow"
      | "reporting"
      | "external-api"
      | "bff"
      | "sales";
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerAdmission;
}
export interface RequestIdentityAdmissionCursorSubject {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-cursor-subject";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionCursorSubject {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    account_id: string;
  };
}
export interface RequestIdentityAdmissionCatalogPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-catalog-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionCatalogPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    kind: "tags" | "snippets";
    principal_id: string;
    auth_revision: string;
    can_read: boolean;
    can_manage: boolean;
  };
}
export interface RequestIdentityAdmissionConversationPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-conversation-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionConversationPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerConversationPolicy;
}
export interface RequestIdentityAdmissionAssignmentDirectory {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-assignment-directory";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionAssignmentDirectory {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerAssignmentDirectory;
}
export interface RequestIdentityAdmissionRoutingView {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-routing-view";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionRoutingView {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRoutingViewPolicy;
}
export interface RequestIdentityRoutingViewDirectory {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-view-directory";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityRoutingViewDirectory {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRoutingViewDirectory;
}
export interface RequestChatRoutingView {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-view";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyChatRoutingView {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRoutingViewChat;
}
export interface RequestConnectorRoutingViewConnections {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-view-connections";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyConnectorRoutingViewConnections {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    policy_digest: string;
    /**
     * @maxItems 201
     */
    data: {
      id: string;
      name: string;
      provider: string;
    }[];
  };
}
export interface RequestRoutingAssignmentDirectoryCapacity {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "assignment-directory-capacity";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyRoutingAssignmentDirectoryCapacity {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    directory_digest: string;
    /**
     * @maxItems 200
     */
    data: {
      id: string;
      eligible: boolean;
    }[];
  };
}
export interface RequestChatRoutingProposal {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-proposal";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    team_id: string;
  };
}
export interface ReplyChatRoutingProposal {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerAssignmentDirectory;
}
export interface RequestChatRoutingDispatch {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-dispatch";
  actor: OwnerActor;
  command_id: string;
  payload: {
    resource: OwnerResource;
    session_id: string;
    target: {
      principal_id: string;
      kind: "human";
      team_id: string;
    };
    pin: OwnerRoutingDispatchPin;
  };
}
export interface ReplyChatRoutingDispatch {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    command: OwnerCommandRef;
    state: "committed";
    reconciliation: "pending" | "complete";
  };
}
export interface RequestChatRoutingRerouteSource {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-reroute-source";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatRoutingRerouteSource {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    resource: OwnerResource;
    session_id: string;
  };
}
export interface RequestChatRoutingReroute {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-reroute";
  actor: OwnerActor;
  command_id: string;
  payload: {
    resource: OwnerResource;
    session_id: string;
    target: {
      principal_id: string | null;
      kind: "human" | null;
      team_id: string;
    };
    pin: OwnerRoutingReroutePin;
  };
}
export interface ReplyChatRoutingReroute {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    command: OwnerCommandRef;
    state: "committed";
    reconciliation: "pending" | "complete";
  };
}
export interface RequestIdentityAdmissionWorkspacePolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-workspace-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 100
     */
    resources: OwnerResource[];
  };
}
export interface ReplyIdentityAdmissionWorkspacePolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerWorkspacePolicy;
}
export interface RequestIdentityAdmissionContactBatchPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-contact-batch-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 100
     */
    resources: OwnerResource[];
  };
}
export interface ReplyIdentityAdmissionContactBatchPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string;
    auth_revision: string;
    /**
     * @maxItems 100
     */
    data: OwnerContactDecision[];
  };
}
export interface RequestCrmContactSummaryBatch {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contact-summary-batch";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 100
     */
    ids: string[];
  };
}
export interface ReplyCrmContactSummaryBatch {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    data: {
      contact_id: string;
      summary: OwnerContactSummary | null;
    }[];
  };
}
export interface RequestIdentityAdmissionContactPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-contact-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    resource: OwnerResource;
  };
}
export interface ReplyIdentityAdmissionContactPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string;
    auth_revision: string;
    allowed: boolean;
    /**
     * @maxItems 200
     */
    fields: string[];
  };
}
export interface RequestCrmContactSummaryRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contact-summary-read";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyCrmContactSummaryRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    contact_id: string;
    summary: OwnerContactSummary | null;
  };
}
export interface RequestConnectorDetailChannelRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "detail-channel-read";
  payload: {
    connection_id: string;
    conversation_id: string;
  };
}
export interface ReplyConnectorDetailChannelRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    channel: "mock_messenger" | "messenger";
    channel_id: string;
    page_id: string;
    channel_name: string;
    attribution: {
      source: "unknown" | "ctm";
      ad_id: string | null;
      campaign_id: string | null;
    };
  };
}
export interface RequestConnectorDetailChannelBatch {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "detail-channel-batch";
  payload: {
    /**
     * @maxItems 100
     */
    items: {
      connection_id: string;
      conversation_id: string;
    }[];
  };
}
export interface ReplyConnectorDetailChannelBatch {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    data: {
      conversation_id: string;
      metadata: {
        channel: "mock_messenger" | "messenger";
        channel_id: string;
        page_id: string;
        channel_name: string;
        attribution: {
          source: "unknown" | "ctm";
          ad_id: string | null;
          campaign_id: string | null;
        };
      };
    }[];
  };
}
export interface RequestConnectorSourceChannelRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "source-channel-read";
  payload: {
    connection_id: string;
    conversation_id: string;
  };
}
export interface ReplyConnectorSourceChannelRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    channel: "mock_messenger" | "messenger";
    channel_id: string;
    page_id: string;
    channel_name: string;
    attribution: {
      source: "unknown" | "ctm";
      ad_id: string | null;
      campaign_id: string | null;
    };
    source_touchpoint_id: string | null;
  };
}
export interface RequestIdentityAdmissionInboxPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-inbox-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionInboxPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string;
    auth_revision: string;
    /**
     * @maxItems 200
     */
    team_ids: string[];
    can_manage_own: boolean;
    can_manage_all: boolean;
    can_share_own: boolean;
    /**
     * @maxItems 200
     */
    filter_fields: string[];
    directory: {
      /**
       * @maxItems 200
       */
      teams: {
        id: string;
        name: string;
      }[];
      /**
       * @maxItems 500
       */
      principals: {
        id: string;
        name: string;
      }[];
    } | null;
  };
}
export interface RequestConnectorCatalogConnectionRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-connection-read";
  payload: {
    connection_id: string;
  };
}
export interface ReplyConnectorCatalogConnectionRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    connection_id: string;
  };
}
export interface RequestConnectorHistoryPlatformRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "history-platform-read";
  payload: {
    connection_id: string;
  };
}
export interface ReplyConnectorHistoryPlatformRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    connection_id: string;
    platform: "mock_messenger";
  };
}
export interface RequestCrmContactBindingRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contact-binding-read";
  payload: {
    connection_id: string;
    crm_contact_id: string;
    crm_identity_id: string;
    external_subject_id: string;
  };
}
export interface ReplyCrmContactBindingRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerContactBinding;
}
export interface RequestConnectorConnectionBindingRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "connection-binding-read";
  payload: {
    connection_id: string;
  };
}
export interface ReplyConnectorConnectionBindingRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    connection_id: string;
    platform: "mock_messenger";
    connection_revision: "1";
    channel_id: string;
    team_id: string;
  };
}
export interface RequestConnectorConnectionIngressRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "connection-ingress-read";
  payload: {
    connection_id: string;
  };
}
export interface ReplyConnectorConnectionIngressRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    connection_id: string;
    platform: "mock_messenger";
    connection_revision: "1";
    channel_id: string;
    team_id: string;
    service_actor_id: string;
  };
}
export interface RequestConnectorTransportDisable {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "transport-disable";
  payload: {
    connection_id: string;
    barrier_id: string;
  };
}
export interface ReplyConnectorTransportDisable {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    connection_id: string;
    barrier_id: string;
    state: "disabled" | "enabled" | "absent";
  };
}
export interface RequestConnectorTransportEnable {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "transport-enable";
  payload: {
    connection_id: string;
    barrier_id: string;
  };
}
export interface ReplyConnectorTransportEnable {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    connection_id: string;
    barrier_id: string;
    state: "disabled" | "enabled" | "absent";
  };
}
export interface RequestConnectorTransportStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "transport-status";
  payload: {
    connection_id: string;
    barrier_id: string;
  };
}
export interface ReplyConnectorTransportStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    connection_id: string;
    barrier_id: string;
    state: "disabled" | "enabled" | "absent";
  };
}
export interface RequestIdentitySettle {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "settle";
  payload: {
    owner:
      | "chat"
      | "identity"
      | "crm"
      | "connector"
      | "routing"
      | "ai-runtime"
      | "workflow"
      | "reporting"
      | "external-api"
      | "bff"
      | "sales";
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentitySettle {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerAdmission;
}
export interface RequestIdentityTargetRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "target-read";
  payload: {
    principal_id: string | null;
    team_id: string | null;
  };
}
export interface ReplyIdentityTargetRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    target: OwnerTarget;
    observed_revision: string;
  };
}
export interface RequestIdentityPrincipalKindRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "principal-kind-read";
  payload: {
    principal_id: string | null;
  };
}
export interface ReplyIdentityPrincipalKindRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string | null;
    kind: "human" | "ai" | null;
  };
}
export interface RequestIdentityBarrierStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "barrier-status";
  payload: {
    barrier_id: string;
    delegation_id: string;
  };
}
export interface ReplyIdentityBarrierStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerBarrier;
}
export interface RequestIdentityDirectory {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "directory";
  actor: OwnerActor;
  command_id: string;
  payload: {
    kind: "principals" | "teams" | "inbox-targets" | "assignment-targets";
    page: OwnerPage;
    resource: OwnerResource | null;
  };
}
export interface ReplyIdentityDirectory {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerBatch;
}
export interface RequestRoutingCapacityReserve {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "capacity-reserve";
  payload: {
    command: OwnerCommandRef;
    session_id: string;
    reservation_id: string | null;
  };
}
export interface ReplyRoutingCapacityReserve {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerCapacity;
}
export interface RequestRoutingCapacityConfirm {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "capacity-confirm";
  payload: {
    command: OwnerCommandRef;
    session_id: string;
    reservation_id: string | null;
  };
}
export interface ReplyRoutingCapacityConfirm {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerCapacity;
}
export interface RequestRoutingCapacityRelease {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "capacity-release";
  payload: {
    command: OwnerCommandRef;
    session_id: string;
    reservation_id: string | null;
  };
}
export interface ReplyRoutingCapacityRelease {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerCapacity;
}
export interface RequestRoutingCapacityStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "capacity-status";
  payload: {
    command: OwnerCommandRef;
    session_id: string;
    reservation_id: string | null;
  };
}
export interface ReplyRoutingCapacityStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerCapacity;
}
export interface RequestCrmReferenceReserve {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "reference-reserve";
  payload: {
    command: OwnerCommandRef;
    resource_id: string;
    kind: "contact" | "mapping" | "metadata";
    expected_revision: string;
    reservation_id: string | null;
  };
}
export interface ReplyCrmReferenceReserve {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerReference;
}
export interface RequestCrmReferenceStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "reference-status";
  payload: {
    command: OwnerCommandRef;
    resource_id: string;
    kind: "contact" | "mapping" | "metadata";
    expected_revision: string;
    reservation_id: string | null;
  };
}
export interface ReplyCrmReferenceStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerReference;
}
export interface RequestCrmReferenceRelease {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "reference-release";
  payload: {
    command: OwnerCommandRef;
    resource_id: string;
    kind: "contact" | "mapping" | "metadata";
    expected_revision: string;
    reservation_id: string | null;
  };
}
export interface ReplyCrmReferenceRelease {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerReference;
}
export interface RequestConnectorReferenceReserve {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "reference-reserve";
  payload: {
    command: OwnerCommandRef;
    resource_id: string;
    kind: "connection" | "touchpoint";
    expected_revision: string;
    reservation_id: string | null;
  };
}
export interface ReplyConnectorReferenceReserve {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerReference;
}
export interface RequestConnectorReferenceStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "reference-status";
  payload: {
    command: OwnerCommandRef;
    resource_id: string;
    kind: "connection" | "touchpoint";
    expected_revision: string;
    reservation_id: string | null;
  };
}
export interface ReplyConnectorReferenceStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerReference;
}
export interface RequestConnectorReferenceRelease {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "reference-release";
  payload: {
    command: OwnerCommandRef;
    resource_id: string;
    kind: "connection" | "touchpoint";
    expected_revision: string;
    reservation_id: string | null;
  };
}
export interface ReplyConnectorReferenceRelease {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerReference;
}
export interface RequestChatContactArchiveGuard {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contact-archive-guard";
  payload: {
    command: OwnerCommandRef;
    contact_id: string;
  };
}
export interface ReplyChatContactArchiveGuard {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerReference;
}
export interface ContactResolutionContactLookupResponse {
  data: {
    mapping: {
      tenant_id: string;
      connection_id: string;
      external_subject_id: string;
      crm_contact_id: string;
      crm_identity_id: string;
      mapping_revision: "1";
    } | null;
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestCrmContactLookup {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contact-lookup";
  actor: OwnerActor;
  command_id: string;
  payload: {
    connection_id: string;
    external_subject_id: string;
  };
}
export interface ReplyCrmContactLookup {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: ContactResolutionContactLookupResponse;
}
export interface ContactResolutionContactResolveRequest {
  external_subject_id: string;
  operation_id: string;
  display_label?: string;
}
export interface ContactResolutionContactResolveResponse {
  data: {
    mapping: {
      tenant_id: string;
      connection_id: string;
      external_subject_id: string;
      crm_contact_id: string;
      crm_identity_id: string;
      mapping_revision: "1";
    };
    created: boolean;
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestCrmContactResolve {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contact-resolve";
  actor: OwnerActor;
  command_id: string;
  payload: {
    connection_id: string;
    input: ContactResolutionContactResolveRequest;
  };
}
export interface ReplyCrmContactResolve {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: ContactResolutionContactResolveResponse;
}
export interface RequestCrmContactBatch {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contact-batch";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 100
     */
    ids: string[];
    page: OwnerPage;
  };
}
export interface ReplyCrmContactBatch {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerBatch;
}
export interface PublicCrmDescriptorResponse {
  data: {
    object_key: string;
    standard: {
      key: string;
      label: string;
      type: string;
      required?: boolean;
      indexed: boolean;
      immutable?: boolean;
      writable: boolean;
      options?: string[];
    }[];
    custom: {
      key: string;
      label: string;
      type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
      required: boolean;
      default_value: unknown;
      options: string[] | null;
      indexed: boolean;
      sensitive: boolean;
      id: string;
      version: string;
      writable: boolean;
    }[];
    order: string[];
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestCrmMetadataRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "metadata-read";
  actor: OwnerActor;
  command_id: string;
  payload: {
    object_key: "conversation" | "conversation_session" | "conversation_need";
    schema_revision: string | null;
  };
}
export interface ReplyCrmMetadataRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCrmDescriptorResponse;
}
export interface RequestCrmMetadataSchemaRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "metadata-schema-read";
  payload: {
    object_key: "conversation" | "conversation_session" | "conversation_need";
    schema_revision: string | null;
  };
}
export interface ReplyCrmMetadataSchemaRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerMetadataSnapshot;
}
export interface RequestConnectorChannelBatch {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "channel-batch";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 100
     */
    ids: string[];
    page: OwnerPage;
  };
}
export interface ReplyConnectorChannelBatch {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerBatch;
}
export interface OwnerNoteReceipt {
  command: OwnerCommandRef;
  state: "committed" | "aborted";
  activity_id: string | null;
  occurred_at: string | null;
}
export interface RequestIdentityAdmissionNoteChild {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-note-child";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionNoteChild {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerAdmission;
}
export interface RequestCrmNoteCreate {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "note-create";
  payload: {
    command: OwnerCommandRef;
    text: string;
  };
}
export interface ReplyCrmNoteCreate {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerNoteReceipt;
}
export interface RequestCrmNoteAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "note-abort";
  payload: OwnerCommandRef;
}
export interface ReplyCrmNoteAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerNoteReceipt;
}
export interface OwnerNotePolicy {
  principal_id: string;
  auth_revision: string;
  all: boolean;
  own: boolean;
  /**
   * @maxItems 200
   */
  team_ids: string[];
  body: boolean;
}
export interface OwnerActivityPolicy {
  principal_id: string;
  auth_revision: string;
  /**
   * @maxItems 200
   */
  allowed_fields: string[];
  automation_read: boolean;
  note_policy_digest: string;
}
export interface OwnerSessionProgressPolicy {
  principal_id: string;
  auth_revision: string;
  can_edit: boolean;
}
export interface RequestIdentityAdmissionSessionProgressPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-session-progress-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionSessionProgressPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerSessionProgressPolicy;
}
export interface RequestIdentityAdmissionFunnelPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-funnel-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionFunnelPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerFunnelPolicy;
}
export interface RequestIdentityAdmissionFunnelContactPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-funnel-contact-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 25
     */
    resources: OwnerResource[];
  };
}
export interface ReplyIdentityAdmissionFunnelContactPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string;
    auth_revision: string;
    /**
     * @maxItems 25
     */
    visible_ids: string[];
  };
}
export interface RequestCrmFunnelContactRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "funnel-contact-read";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 100
     */
    ids: string[];
  };
}
export interface ReplyCrmFunnelContactRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    visible_ids: string[];
  };
}
export interface RequestIdentityAdmissionClassificationPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-classification-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionClassificationPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerClassificationPolicy;
}
export interface RequestCrmClassificationMetadataRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "classification-metadata-read";
  payload: {
    schema_revision: string | null;
  };
}
export interface ReplyCrmClassificationMetadataRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerClassificationMetadata;
}
export interface RequestCrmNeedMetadataRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "need-metadata-read";
  payload: {
    schema_revision: string | null;
  };
}
export interface ReplyCrmNeedMetadataRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerClassificationMetadata;
}
export interface RequestIdentityAdmissionNeedPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-need-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionNeedPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerClassificationPolicy;
}
export interface RequestIdentityAdmissionNeedOutcomesPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-need-outcomes-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 25
     */
    resources: OwnerResource[];
  };
}
export interface ReplyIdentityAdmissionNeedOutcomesPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string;
    auth_revision: string;
    /**
     * @maxItems 25
     */
    data: {
      id: string;
      visible: boolean;
      can_link: boolean;
    }[];
  };
}
export interface RequestIdentityAdmissionOutcomeLinkPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-outcome-link-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    resource: OwnerResource;
  };
}
export interface ReplyIdentityAdmissionOutcomeLinkPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string;
    auth_revision: string;
    allowed: boolean;
  };
}
export interface RequestSalesOutcomeLinkInspect {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "outcome-link-inspect";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplySalesOutcomeLinkInspect {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerOutcomeSource;
}
export interface RequestSalesOutcomeLinkApply {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "outcome-link-apply";
  payload: OwnerCommandRef;
}
export interface ReplySalesOutcomeLinkApply {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerOutcomeReceipt;
}
export interface RequestSalesOutcomeLinkAbort {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "outcome-link-abort";
  payload: OwnerCommandRef;
}
export interface ReplySalesOutcomeLinkAbort {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerOutcomeReceipt;
}
export interface RequestSalesNeedOutcomesList {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "need-outcomes-list";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplySalesNeedOutcomesList {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    data: {
      id: string;
      label: string;
      linked: boolean;
      can_link: boolean;
    }[];
  };
}
export interface RequestCrmContributionSourcesRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contribution-sources-read";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 50
     */
    ids: string[];
  };
}
export interface ReplyCrmContributionSourcesRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 50
     */
    visible_ids: string[];
  };
}
export interface RequestSalesContributionSourcesRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contribution-sources-read";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 50
     */
    ids: string[];
  };
}
export interface ReplySalesContributionSourcesRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 50
     */
    visible_ids: string[];
  };
}
export interface RequestIdentityAdmissionContributionSalesPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-contribution-sales-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 50
     */
    resources: OwnerResource[];
  };
}
export interface ReplyIdentityAdmissionContributionSalesPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string;
    auth_revision: string;
    /**
     * @maxItems 50
     */
    visible_ids: string[];
  };
}
export interface RequestIdentityAdmissionSessionContactPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-session-contact-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    resource: OwnerResource;
  };
}
export interface ReplyIdentityAdmissionSessionContactPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    principal_id: string;
    auth_revision: string;
    allowed: boolean;
  };
}
export interface RequestCrmSessionContactRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "session-contact-read";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyCrmSessionContactRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    contact_id: string;
    version: string;
  };
}
export interface RequestIdentityAdmissionActivityPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-activity-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionActivityPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerActivityPolicy;
}
export interface RequestCrmActivityNotes {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "activity-notes";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 2000
     */
    ids: string[];
    limit: number;
  };
}
export interface ReplyCrmActivityNotes {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    policy_digest: string;
    state: "ready" | "delayed" | "unavailable";
    /**
     * @maxItems 100
     */
    data: {
      activity_id: string;
      body?: string | null;
    }[];
  };
}
export interface RequestWorkflowActivityRuns {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "activity-runs";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    /**
     * @maxItems 2000
     */
    ids: string[];
    limit: number;
  };
}
export interface ReplyWorkflowActivityRuns {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    policy_digest: string;
    state: "ready" | "delayed" | "unavailable";
    /**
     * @maxItems 100
     */
    data: {
      run_id: string;
      definition_version_id: string;
      revision: string;
    }[];
  };
}
export interface RequestIdentityAdmissionNotePolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "admission-note-policy";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
  };
}
export interface ReplyIdentityAdmissionNotePolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerNotePolicy;
}
export interface ConversationConversationNotes {
  data: {
    id: string;
    created_at: string;
    body?: string | null;
  }[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
export interface RequestCrmNoteList {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "note-list";
  payload: {
    command: OwnerCommandRef;
    admission_id: string;
    limit: number;
    cursor: string | null;
  };
}
export interface ReplyCrmNoteList {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: ConversationConversationNotes;
}
export interface RequestCrmNoteRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "note-read";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    activity_id: string;
  };
}
export interface ReplyCrmNoteRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerProjectedRecord;
}
export interface RequestCrmActivityBinding {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "activity-binding";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    source_id: string;
    minimum_revision: string;
  };
}
export interface ReplyCrmActivityBinding {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerActivityBinding;
}
export interface RequestWorkflowActivityBinding {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "activity-binding";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    source_id: string;
    minimum_revision: string;
  };
}
export interface ReplyWorkflowActivityBinding {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerActivityBinding;
}
export interface OwnerActivityNotificationBinding {
  conversation_id: string;
  source_id: string;
  revision: string;
  definition_version_id: string | null;
  projection: {
    contact_id: string;
    connection_id: string;
  } | null;
}
export interface RequestCrmActivityNotificationBinding {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "activity-notification-binding";
  payload: {
    conversation_id: string;
    source_id: string;
    minimum_revision: string;
  };
}
export interface ReplyCrmActivityNotificationBinding {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerActivityNotificationBinding;
}
export interface RequestWorkflowActivityNotificationBinding {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "activity-notification-binding";
  payload: {
    conversation_id: string;
    source_id: string;
    minimum_revision: string;
  };
}
export interface ReplyWorkflowActivityNotificationBinding {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerActivityNotificationBinding;
}
export interface RequestChatSessionSource {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "session-source";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    session_id: string | null;
    contact_id: string;
  };
}
export interface ReplyChatSessionSource {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerSessionSource;
}
export interface Customer360SalesSessionResponse {
  data: {
    id: string;
    version: string;
    context_id: string;
    conversation_id: string;
    session_id: string;
    kind: "follow_up";
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestSalesSessionLink {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "session-link";
  actor: OwnerActor;
  command_id: string;
  payload: {
    record_id: string;
    expected_version: string;
    source: OwnerSessionSource;
  };
}
export interface ReplySalesSessionLink {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: Customer360SalesSessionResponse;
}
export interface RequestSalesNeedOutcomeLink {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "need-outcome-link";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    session_id: string;
    need_id: string;
    record_id: string;
    contact_id: string;
    expected_version: string;
  };
}
export interface ReplySalesNeedOutcomeLink {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerOutcome;
}
export interface RequestSalesNeedOutcomeRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "need-outcome-read";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    session_id: string;
    need_id: string;
    contact_id: string;
  };
}
export interface ReplySalesNeedOutcomeRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerOutcome;
}
export interface RequestSalesOutcomeReserve {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "outcome-reserve";
  payload: {
    command: OwnerCommandRef;
    conversation_id: string;
    session_id: string;
    need_id: string;
    reservation_id: string | null;
  };
}
export interface ReplySalesOutcomeReserve {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerOutcome;
}
export interface RequestSalesOutcomeRelease {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "outcome-release";
  payload: {
    command: OwnerCommandRef;
    conversation_id: string;
    session_id: string;
    need_id: string;
    reservation_id: string | null;
  };
}
export interface ReplySalesOutcomeRelease {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerOutcome;
}
export interface RequestSalesOutcomeStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "outcome-status";
  payload: {
    command: OwnerCommandRef;
    conversation_id: string;
    session_id: string;
    need_id: string;
    reservation_id: string | null;
  };
}
export interface ReplySalesOutcomeStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerOutcome;
}
export interface RequestChatRecoverNeed {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "recover-need";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    session_id: string;
    need_id: string;
    assessment_version: string;
    team_id: string;
    preference: "human" | "ai" | "any";
    min_confidence: number;
    cooldown_seconds: number;
    max_age_seconds: number;
    graph: OwnerGraph;
  };
}
export interface ReplyChatRecoverNeed {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRecovery;
}
export interface RequestChatRecordBatch {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "record-batch";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 100
     */
    ids: string[];
    page: OwnerPage;
  };
}
export interface ReplyChatRecordBatch {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerBatch;
}
export interface PublicCrmRecordPatch {
  fields?: {
    [k: string]: unknown;
  };
  custom_values?: {
    [k: string]: unknown;
  };
}
export interface PublicCrmRecordResponse {
  data: PublicCrmRecord;
  meta: {
    correlation_id: string;
  };
}
export interface PublicCrmRecord {
  id: string;
  tenant_id: string;
  object_key: string;
  version: string;
  owner_revision: string;
  owner_principal_id: string | null;
  team_id: string | null;
  archived: boolean;
  fields: {
    [k: string]: unknown;
  };
  custom_values: {
    [k: string]: unknown;
  };
}
export interface RequestChatCustomValuesPatch {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "custom-values-patch";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    expected_version: string;
    schema_revision: string;
    input: PublicCrmRecordPatch;
    hydrate_record?: true;
  };
}
export interface ReplyChatCustomValuesPatch {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCrmRecordResponse;
}
export interface RequestChatRecordGet {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "record-get";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatRecordGet {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCrmRecordResponse;
}
export interface RequestChatRecordPatch {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "record-patch";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    expected_version: string | null;
    idempotency_key: string;
    body: PublicCrmRecordPatch;
  };
}
export interface ReplyChatRecordPatch {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCrmRecordResponse;
}
export interface PublicCrmArchive {
  reason: string;
}
export interface RequestChatRecordArchive {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "record-archive";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    expected_version: string;
    input: PublicCrmArchive;
  };
}
export interface ReplyChatRecordArchive {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCrmRecordResponse;
}
export interface RequestChatRoutingFacts {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-facts";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 5000
     */
    session_ids: string[];
    from: string;
    to: string;
    as_of: string;
    process_version_id: string | null;
    page: OwnerPage;
    snapshot_id: string;
  };
}
export interface ReplyChatRoutingFacts {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    rows: OwnerSnapshotRow[];
    snapshot: OwnerSnapshot;
    freshness: OwnerFreshness;
  };
}
export interface SessionProgressSessionProcessInput {
  /**
   * @minItems 1
   * @maxItems 20
   */
  stages:
    | [SessionProcessStage]
    | [SessionProcessStage, SessionProcessStage]
    | [SessionProcessStage, SessionProcessStage, SessionProcessStage]
    | [SessionProcessStage, SessionProcessStage, SessionProcessStage, SessionProcessStage]
    | [SessionProcessStage, SessionProcessStage, SessionProcessStage, SessionProcessStage, SessionProcessStage]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ]
    | [
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage,
        SessionProcessStage
      ];
  /**
   * @minItems 1
   * @maxItems 12
   */
  milestones:
    | [
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ];
  automations?: {
    set_convert_time: boolean;
    clear_convert_time: boolean;
  };
}
export interface SessionProcessStage {
  key: string;
  label: string;
  description?: string;
  color?: string;
  requirements?: SessionStageRequirements;
  type?: "open" | "converted" | "unqualified";
}
export interface SessionStageRequirements {
  /**
   * @maxItems 100
   */
  fields?: string[];
  need?: boolean;
  /**
   * @maxItems 12
   */
  milestones?:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string, string];
}
export interface OwnerSnapshot {
  snapshot_id: string;
  dataset: "routing" | "conversion" | "stage" | "progress";
  watermark: string;
  digest: string;
  as_of: string;
  row_count: number;
  state: "prepared" | "valid" | "changed" | "released";
}
export interface RequestChatConversionFacts {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversion-facts";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 5000
     */
    session_ids: string[];
    from: string;
    to: string;
    as_of: string;
    process_version_id: string | null;
    page: OwnerPage;
    snapshot_id: string;
  };
}
export interface ReplyChatConversionFacts {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    rows: OwnerSnapshotRow[];
    snapshot: OwnerSnapshot;
    freshness: OwnerFreshness;
  };
}
export interface RequestChatStageFacts {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "stage-facts";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 5000
     */
    session_ids: string[];
    from: string;
    to: string;
    as_of: string;
    process_version_id: string | null;
    page: OwnerPage;
    snapshot_id: string;
  };
}
export interface ReplyChatStageFacts {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    rows: OwnerSnapshotRow[];
    snapshot: OwnerSnapshot;
    freshness: OwnerFreshness;
  };
}
export interface RequestChatProgressFacts {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "progress-facts";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 5000
     */
    session_ids: string[];
    from: string;
    to: string;
    as_of: string;
    process_version_id: string | null;
    page: OwnerPage;
    snapshot_id: string;
  };
}
export interface ReplyChatProgressFacts {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    rows: OwnerSnapshotRow[];
    snapshot: OwnerSnapshot;
    freshness: OwnerFreshness;
  };
}
export interface RequestChatRoutingActive {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-active";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 500
     */
    principal_ids: string[];
    /**
     * @maxItems 500
     */
    connection_ids: string[];
    all_channels: boolean;
    page: OwnerPage;
  };
}
export interface ReplyChatRoutingActive {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerBatch;
}
export interface RequestChatRoutingSyncSnapshot {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-sync-snapshot";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 500
     */
    principal_ids: string[];
    /**
     * @maxItems 500
     */
    connection_ids: string[];
    all_channels: boolean;
    /**
     * @maxItems 500
     */
    known_session_ids: string[];
  };
}
export interface ReplyChatRoutingSyncSnapshot {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRoutingSnapshot;
}
export interface RequestChatRoutingReplyFacts {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-reply-facts";
  actor: OwnerActor;
  command_id: string;
  payload: {
    /**
     * @maxItems 5000
     */
    session_ids: string[];
    from: string;
    mode: "aggregate" | "facts";
  };
}
export interface ReplyChatRoutingReplyFacts {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerRoutingReplySnapshot;
}
export interface RequestChatRuntimeCapabilities {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "runtime-capabilities";
  actor: OwnerActor;
  command_id: string;
  payload: {};
}
export interface ReplyChatRuntimeCapabilities {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerCapabilities;
}
export interface OwnerInferenceContext {
  conversation_id: string;
  owner_revision: string;
  control_revision: string;
  /**
   * @maxItems 20
   */
  messages:
    | []
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ]
    | [
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        },
        {
          id: string;
          direction: "inbound" | "outbound";
          text: string;
          text_source: "original" | "preview" | "extracted";
        }
      ];
  contact: OwnerProjectedRecord | null;
  input_digest: string;
}
export interface RequestChatAgentContext {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "agent-context";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    message_id: string;
    expected_owner_revision: string;
    expected_control_revision: string;
  };
}
export interface ReplyChatAgentContext {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerInferenceContext;
}
export interface RequestChatInboundNext {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "inbound-next";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    purpose: "consent" | "inference";
    /**
     * @maxItems 1000
     */
    used_message_ids: string[];
    expected_control_revision: string;
  };
}
export interface ReplyChatInboundNext {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    message: {
      id: string;
      text: string;
      text_source: "original" | "preview" | "extracted";
    } | null;
  };
}
export interface ConversationConversationSendResponse {
  data: ConversationConversationQueued;
  meta: {
    correlation_id: string;
  };
}
export interface ConversationConversationQueued {
  id: string;
  conversation_id: string;
  message_id: string;
  status: "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  status_url: string;
  provider_message_id?: string | null;
  error_code?: string | null;
}
export interface RequestChatPromptSubmit {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "prompt-submit";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    crm_contact_id: string;
    expected_owner_revision: string;
    expected_control_revision: string;
    graph: OwnerGraph;
    text: string;
  };
}
export interface ReplyChatPromptSubmit {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: ConversationConversationSendResponse;
}
export interface RequestChatReadNeed {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "read-need";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation_id: string;
    session_id: string;
    need_id: string;
    assessment_version: string;
  };
}
export interface ReplyChatReadNeed {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    current: boolean;
    assessment_status: "" | "unassessed" | "insufficient" | "assessed";
    need_clarity: "" | "none" | "ambiguous" | "clear";
    intent: "" | "research" | "buy" | "support" | "cancel" | "other";
    product_interest: string;
    unresolved_reason: string;
  };
}
export interface RequestSalesContributionVisible {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contribution-visible";
  actor: OwnerActor;
  command_id: string;
  payload: {
    context_id: string;
    session_id: string;
  };
}
export interface ReplySalesContributionVisible {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    visible: boolean;
  };
}
export interface RequestChatContributionApply {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contribution-apply";
  payload: {
    command: OwnerCommandRef;
    conversation_id: string;
    session_id: string;
    source_context_id: string;
    source_revision: string;
    kind: "outcome";
    record_id: string;
    role: "created" | "follow_up" | "closing";
    admitted_resource: OwnerResource;
  };
}
export interface ReplyChatContributionApply {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    contribution_id: string;
    revision: string;
  };
}
export interface RequestChatSnapshotPrepare {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "snapshot-prepare";
  actor: OwnerActor;
  command_id: string;
  payload: {
    dataset: "routing" | "conversion" | "stage" | "progress";
    from: string;
    to: string;
    as_of: string;
    process_version: string | null;
  };
}
export interface ReplyChatSnapshotPrepare {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerSnapshot;
}
export interface RequestChatSnapshotValidate {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "snapshot-validate";
  payload: {
    snapshot_id: string;
    digest: string;
    watermark: string;
  };
}
export interface ReplyChatSnapshotValidate {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerSnapshot;
}
export interface RequestChatSnapshotRelease {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "snapshot-release";
  payload: {
    snapshot_id: string;
    digest: string;
    watermark: string;
  };
}
export interface ReplyChatSnapshotRelease {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerSnapshot;
}
export interface RequestChatSnapshotPage {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "snapshot-page";
  actor: OwnerActor;
  command_id: string;
  payload: {
    snapshot_id: string;
    digest: string;
    page: OwnerPage;
  };
}
export interface ReplyChatSnapshotPage {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    rows: OwnerSnapshotRow[];
    snapshot: OwnerSnapshot;
    freshness: OwnerFreshness;
  };
}
export interface OwnerChildResult {
  child_id: string;
  parent_run_id: string;
  state: "pending" | "completed" | "cancelled" | "failed";
  outcome: string | null;
  lead_id: string | null;
}
export interface RequestSalesChildStart {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "child-start";
  actor: OwnerActor;
  command_id: string;
  payload: {
    graph: OwnerGraph;
    input: {
      lead_id: string;
      target_team_id: string;
      expected_version: string;
    };
  };
}
export interface ReplySalesChildStart {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerChildResult;
}
export interface RequestSalesChildStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "child-status";
  actor: OwnerActor;
  command_id: string;
  payload: {
    child_id: string;
    parent_run_id: string;
    graph: OwnerGraph;
  };
}
export interface ReplySalesChildStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerChildResult;
}
export interface PublicSessionProcessResponse {
  data: {
    version: string;
    current_version: string;
    definition: {
      /**
       * @minItems 1
       * @maxItems 20
       */
      stages:
        | [SessionProcessStage1]
        | [SessionProcessStage1, SessionProcessStage1]
        | [SessionProcessStage1, SessionProcessStage1, SessionProcessStage1]
        | [SessionProcessStage1, SessionProcessStage1, SessionProcessStage1, SessionProcessStage1]
        | [SessionProcessStage1, SessionProcessStage1, SessionProcessStage1, SessionProcessStage1, SessionProcessStage1]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ]
        | [
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1,
            SessionProcessStage1
          ];
      /**
       * @minItems 1
       * @maxItems 12
       */
      milestones:
        | [
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ]
        | [
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            },
            {
              key: string;
              label: string;
            }
          ];
      automations?: {
        set_convert_time: boolean;
        clear_convert_time: boolean;
      };
    };
  };
  meta: {
    correlation_id: string;
  };
}
export interface SessionProcessStage1 {
  key: string;
  label: string;
  description?: string;
  color?: string;
  requirements?: SessionStageRequirements1;
  type?: "open" | "converted" | "unqualified";
}
export interface SessionStageRequirements1 {
  /**
   * @maxItems 100
   */
  fields?: string[];
  need?: boolean;
  /**
   * @maxItems 12
   */
  milestones?:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string, string];
}
export interface RequestChatSessionProgressGetSessionProcess {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "session-progress-get-session-process";
  actor: OwnerActor;
  command_id: string;
  payload: {
    version?: string;
  };
}
export interface ReplyChatSessionProgressGetSessionProcess {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicSessionProcessResponse;
}
export interface PublicSessionProcessInput {
  /**
   * @minItems 1
   * @maxItems 20
   */
  stages:
    | [SessionProcessStage2]
    | [SessionProcessStage2, SessionProcessStage2]
    | [SessionProcessStage2, SessionProcessStage2, SessionProcessStage2]
    | [SessionProcessStage2, SessionProcessStage2, SessionProcessStage2, SessionProcessStage2]
    | [SessionProcessStage2, SessionProcessStage2, SessionProcessStage2, SessionProcessStage2, SessionProcessStage2]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ]
    | [
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2,
        SessionProcessStage2
      ];
  /**
   * @minItems 1
   * @maxItems 12
   */
  milestones:
    | [
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ]
    | [
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        },
        {
          key: string;
          label: string;
        }
      ];
  automations?: {
    set_convert_time: boolean;
    clear_convert_time: boolean;
  };
}
export interface SessionProcessStage2 {
  key: string;
  label: string;
  description?: string;
  color?: string;
  requirements?: SessionStageRequirements2;
  type?: "open" | "converted" | "unqualified";
}
export interface SessionStageRequirements2 {
  /**
   * @maxItems 100
   */
  fields?: string[];
  need?: boolean;
  /**
   * @maxItems 12
   */
  milestones?:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string, string];
}
export interface RequestChatSessionProgressPostSessionProcess {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "session-progress-post-session-process";
  actor: OwnerActor;
  command_id: string;
  payload: {
    body: PublicSessionProcessInput;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatSessionProgressPostSessionProcess {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicSessionProcessResponse;
}
export interface PublicSessionProgressResponse {
  data: {
    session_id: string;
    can_edit: boolean;
    status: "active" | "closed";
    coverage: "full" | "partial" | "none";
    version: string;
    process: {
      version: string;
      current_version: string;
      definition: {
        /**
         * @minItems 1
         * @maxItems 20
         */
        stages:
          | [SessionProcessStage3]
          | [SessionProcessStage3, SessionProcessStage3]
          | [SessionProcessStage3, SessionProcessStage3, SessionProcessStage3]
          | [SessionProcessStage3, SessionProcessStage3, SessionProcessStage3, SessionProcessStage3]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ]
          | [
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3,
              SessionProcessStage3
            ];
        /**
         * @minItems 1
         * @maxItems 12
         */
        milestones:
          | [
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ]
          | [
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              },
              {
                key: string;
                label: string;
              }
            ];
        automations?: {
          set_convert_time: boolean;
          clear_convert_time: boolean;
        };
      };
    } | null;
    /**
     * @maxItems 100
     */
    needs: {
      id: string;
      session_id: string;
      label: string;
      created_at: string;
      actor_id: string;
    }[];
    /**
     * @maxItems 50
     */
    history: (
      | {
          id: string;
          session_id: string;
          need_id: string;
          revision: string;
          milestone_key: string;
          kind: "record" | "replace" | "retract";
          supersedes_id: string | null;
          message_id: string | null;
          reason: string;
          occurred_at: string;
          recorded_at: string;
          actor_id: string;
          corrected_by: string | null;
          type: "milestone";
        }
      | {
          id: string;
          session_id: string;
          revision: string;
          from_stage: string;
          to_stage: string;
          reason: string;
          actor_id: string;
          recorded_at: string;
          type: "stage";
        }
    )[];
    next_before_revision: string | null;
    process_version?: string;
    stage_key?: string;
    created_at?: string;
    updated_at?: string;
    convert_time?: string | null;
  };
  meta: {
    correlation_id: string;
  };
}
export interface SessionProcessStage3 {
  key: string;
  label: string;
  description?: string;
  color?: string;
  requirements?: SessionStageRequirements3;
  type?: "open" | "converted" | "unqualified";
}
export interface SessionStageRequirements3 {
  /**
   * @maxItems 100
   */
  fields?: string[];
  need?: boolean;
  /**
   * @maxItems 12
   */
  milestones?:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string, string];
}
export interface RequestChatSessionProgressGetConversationsConversationSessionsSessionProgress {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "session-progress-get-conversations-conversation-sessions-session-progress";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
    before_revision?: string;
  };
}
export interface ReplyChatSessionProgressGetConversationsConversationSessionsSessionProgress {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicSessionProgressResponse;
}
export interface PublicSessionProgressResult {
  data: {
    id: string;
    session_id: string;
    version: string;
    action: "enroll" | "stage" | "need" | "record" | "replace" | "retract" | "identify_need";
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatSessionProgressPostConversationsConversationSessionsSessionProgress {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "session-progress-post-conversations-conversation-sessions-session-progress";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
    body: PublicSessionProgressInput;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatSessionProgressPostConversationsConversationSessionsSessionProgress {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicSessionProgressResult;
}
export interface PublicSessionFunnelResponse {
  data: {
    sessions: number;
    denominator: number;
    coverage: {
      full: number;
      partial: number;
      none: number;
      other_version: number;
    };
    /**
     * @maxItems 12
     */
    steps:
      | []
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ]
      | [
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          },
          {
            key: string;
            label: string;
            sessions: number;
            cohort_rate: number | null;
            previous_rate: number | null;
          }
        ];
    from: string;
    to: string;
    as_of: string;
    process_version: string;
    timezone: "UTC";
    scope: "current_authorized_conversations";
    mode: "same_need_ordered";
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatSessionProgressGetSessionFunnel {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "session-progress-get-session-funnel";
  actor: OwnerActor;
  command_id: string;
  payload: {
    from: string;
    to: string;
    as_of?: string;
    process_version: string;
  };
}
export interface ReplyChatSessionProgressGetSessionFunnel {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicSessionFunnelResponse;
}
export interface PublicConversationList {
  data: PublicConversationEntity[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
export interface PublicConversationEntity {
  id: string;
  contact_id: string;
  contact_identity_id: string;
  connection_id: string;
  status: "open" | "pending" | "closed";
  /**
   * Response assessment: inbound is null until assessed; confirmed sent coverage is false; true requires a valid Assist assessment.
   */
  need_response?: boolean | null;
  opened_at: string;
  closed_at: string | null;
  version: string;
  owner_revision: string;
  owner_principal_id: string | null;
  team_id: string | null;
  contact: {
    id?: string;
    display_name?: string;
    normalized_phone?: string | null;
    normalized_email?: string | null;
  } | null;
  attribution?: {
    source: "unknown" | "ctm";
    ad_id: string | null;
    campaign_id: string | null;
  };
  owner_kind?: "human" | "ai" | null;
  allowed_actions?: ("reply" | "note" | "update" | "assign" | "takeover")[];
  latest_message?: {
    id: string;
    text?: string;
    status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
    direction: "inbound" | "outbound";
    received_at: string;
  } | null;
  channel?: "mock_messenger" | "messenger";
  channel_id?: string;
  page_id?: string;
  channel_name?: string;
}
export interface RequestChatConversationGetConversations {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-get-conversations";
  actor: OwnerActor;
  command_id: string;
  payload: {
    limit?: number;
    cursor?: string;
    state?: string;
    owner?: string;
    team?: string;
    channel?: "messenger" | "mock_messenger";
    channel_id?: string;
    page_id?: string;
  };
}
export interface ReplyChatConversationGetConversations {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationList;
}
export interface PublicConversationResponse {
  data: PublicConversationEntity;
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatConversationGetConversationsId {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-get-conversations-id";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatConversationGetConversationsId {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationResponse;
}
export interface PublicConversationTimeline {
  data: PublicConversationMessage[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
export interface PublicConversationMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  text?: string;
  status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  provider_message_id: string | null;
  outbound_intent_id: string | null;
  occurred_at: string;
  received_at: string;
}
export interface RequestChatConversationGetConversationsIdMessages {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-get-conversations-id-messages";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    limit?: number;
    cursor?: string;
  };
}
export interface ReplyChatConversationGetConversationsIdMessages {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationTimeline;
}
export interface PublicConversationSend {
  text: string;
  owner_revision: string;
}
export interface PublicConversationSendResponse {
  data: PublicConversationQueued;
  meta: {
    correlation_id: string;
  };
}
export interface PublicConversationQueued {
  id: string;
  conversation_id: string;
  message_id: string;
  status: "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  status_url: string;
  provider_message_id?: string | null;
  error_code?: string | null;
}
export interface RequestChatConversationPostConversationsIdMessages {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-post-conversations-id-messages";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicConversationSend;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatConversationPostConversationsIdMessages {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationSendResponse;
}
export interface PublicConversationEnvelopeTimeline {
  data: PublicConversationMessageEnvelopeV2[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
export interface PublicConversationMessageEnvelopeV2 {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  text?: string;
  status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  outbound_intent_id: string | null;
  occurred_at: string;
  received_at: string;
  external_msg_id: string | null;
  schema_version: 2;
  connection_id: string;
  platform: "mock_messenger";
  message_type: "text";
  reply_to?: null;
  attachment?: null;
}
export interface RequestChatConversationGetConversationsIdMessageEnvelopes {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-get-conversations-id-message-envelopes";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    limit?: number;
    cursor?: string;
  };
}
export interface ReplyChatConversationGetConversationsIdMessageEnvelopes {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationEnvelopeTimeline;
}
export interface PublicConversationRichTimeline {
  data: PublicConversationMessageEnvelopeV3[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
export interface PublicConversationMessageEnvelopeV3 {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  text?: string;
  status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  outbound_intent_id: string | null;
  occurred_at: string;
  received_at: string;
  external_msg_id: string | null;
  schema_version: 3;
  connection_id: string;
  platform: "mock_messenger";
  message_type: "text" | "media" | "template" | "unsupported";
  reply_to?: {
    external_msg_id: string;
    internal_message_id: string | null;
  } | null;
  attachment?:
    | null
    | {
        version: 1;
        kind: "media";
        /**
         * @minItems 1
         * @maxItems 10
         */
        items:
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ]
          | [
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              },
              {
                media_type: "image" | "audio" | "video" | "file";
                external_media_id: string;
                name: string | null;
              }
            ];
      }
    | {
        version: 1;
        kind: "gallery";
        /**
         * @minItems 1
         * @maxItems 10
         */
        cards:
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ]
          | [
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              },
              {
                title: string;
                subtitle: string | null;
                /**
                 * @minItems 0
                 * @maxItems 3
                 */
                buttons:
                  | []
                  | [
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ]
                  | [
                      {
                        label: string;
                      },
                      {
                        label: string;
                      },
                      {
                        label: string;
                      }
                    ];
              }
            ];
      }
    | {
        version: 1;
        kind: "csat";
        title: string;
        prompt: string;
      }
    | {
        version: 1;
        kind: "unsupported";
        label: string;
      };
  text_source: "original" | "extracted" | "preview";
}
export interface RequestChatConversationGetConversationsIdMessageEnvelopesV3 {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-get-conversations-id-message-envelopes-v3";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    limit?: number;
    cursor?: string;
  };
}
export interface ReplyChatConversationGetConversationsIdMessageEnvelopesV3 {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationRichTimeline;
}
export interface PublicConversationIntentResponse {
  data: PublicConversationIntent;
  meta: {
    correlation_id: string;
  };
}
export interface PublicConversationIntent {
  id: string;
  conversation_id: string;
  message_id: string;
  status: "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
  provider_message_id: string | null;
  error_code: string | null;
}
export interface RequestChatConversationGetConversationsIdOutboundIntentsIntentId {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-get-conversations-id-outbound-intents-intentId";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    intentId: string;
  };
}
export interface ReplyChatConversationGetConversationsIdOutboundIntentsIntentId {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationIntentResponse;
}
export interface PublicConversationAcquisitionSessions {
  data: {
    id: string;
    conversation_id: string;
    sequence: string;
    version: string;
    status: "active" | "closed";
    opening_reason: "first_inbound" | "new_referral" | "after_close";
    close_reason: "agent_closed" | "new_referral" | null;
    opened_at: string;
    opening_occurred_at: string;
    closed_at: string | null;
    source_classification: "organic" | "paid" | "unknown";
    source_channel: string | null;
    source_page_id: string | null;
    source_ad_id: string | null;
    source_campaign_id: string | null;
    source_connection_id: string | null;
    source_touchpoint_id: string | null;
    policy_version: "acquisition_v1" | "inbox_v2";
  }[];
  next_before_sequence: string | null;
  meta: {
    correlation_id: string;
    [k: string]: unknown;
  };
}
export interface RequestChatConversationGetConversationsIdAcquisitionSessions {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-get-conversations-id-acquisition-sessions";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    limit?: number;
    before_sequence?: string;
  };
}
export interface ReplyChatConversationGetConversationsIdAcquisitionSessions {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationAcquisitionSessions;
}
export interface PublicConversationNotes {
  data: {
    id: string;
    created_at: string;
    body?: string | null;
  }[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatConversationGetConversationsIdNotes {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-get-conversations-id-notes";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    limit?: number;
    cursor?: string;
  };
}
export interface ReplyChatConversationGetConversationsIdNotes {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationNotes;
}
export interface PublicConversationNote {
  text: string;
}
export interface PublicConversationNoteResponse {
  data: {
    id: string;
    conversation_id: string;
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatConversationPostConversationsIdNotes {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-post-conversations-id-notes";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicConversationNote;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatConversationPostConversationsIdNotes {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationNoteResponse;
}
export interface PublicConversationTransition {
  target_status: "open" | "pending" | "closed";
  reason: string;
}
export interface RequestChatConversationPostConversationsIdTransition {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-post-conversations-id-transition";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicConversationTransition;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatConversationPostConversationsIdTransition {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationResponse;
}
export interface PublicRoutingAssignment {
  owner_principal_id: string | null;
  team_id?: string | null;
  reason: "manual" | "handoff";
}
export interface PublicRoutingResponse {
  data: PublicRoutingEntity;
  meta: {
    correlation_id: string;
  };
}
export interface PublicRoutingEntity {
  id: string;
  tenant_id: string;
  object_key: string;
  version: string;
  owner_revision: string;
  owner_principal_id: string | null;
  team_id: string | null;
}
export interface RequestChatRoutingAssignment {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-assignment";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicRoutingAssignment;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatRoutingAssignment {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicRoutingResponse;
}
export interface PublicRoutingTakeover {
  reason: "human_takeover";
}
export interface RequestChatRoutingTakeover {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-takeover";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicRoutingTakeover;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatRoutingTakeover {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicRoutingResponse;
}
export interface PublicRoutingTargets {
  data: PublicRoutingTarget[];
  meta: {
    correlation_id: string;
  };
}
export interface PublicRoutingTarget {
  id: string;
  kind: "human" | "ai";
  eligible: boolean;
  reason: null | "unavailable" | "team" | "capability" | "role" | "field" | "policy" | "capacity";
}
export interface RequestChatRoutingTargets {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-targets";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    team_id?: string;
  };
}
export interface ReplyChatRoutingTargets {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicRoutingTargets;
}
export interface PublicRoutingHistory {
  /**
   * @maxItems 100
   */
  data: PublicRoutingHistoryEntry[];
  meta: {
    correlation_id: string;
  };
}
export interface PublicRoutingHistoryEntry {
  from_owner_id: string | null;
  to_owner_id: string | null;
  from_team_id: string | null;
  to_team_id: string | null;
  owner_revision: string;
  reason: string;
  actor_kind: "human" | "ai" | "service" | "system";
  actor_id: string;
}
export interface RequestChatRoutingHistory {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "routing-history";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatRoutingHistory {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicRoutingHistory;
}
export interface PublicContactSendRequest {
  crm_contact_id: string;
  owner_revision: string;
  text: string;
}
export interface RequestChatContactBoundSend {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "contact-bound-send";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicContactSendRequest;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatContactBoundSend {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationSendResponse;
}
export interface PublicConversationChannelOptions {
  data: {
    id: string;
    channel: "messenger" | "mock_messenger";
    channel_id: string;
    page_id: string;
    channel_name: string;
  }[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatConversationChannels {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-channels";
  actor: OwnerActor;
  command_id: string;
  payload: {
    limit?: number;
    cursor?: string;
  };
}
export interface ReplyChatConversationChannels {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationChannelOptions;
}
export interface PublicWorkspaceCapabilities {
  data: {
    contract_version: 1;
    features: {
      queue_v1: boolean;
      read_state_v1: boolean;
      inbox_v1: boolean;
      tags_v1: boolean;
      snooze_v1: boolean;
      activity_v1: boolean;
      snippets_v1: boolean;
      contact_channels_v1: boolean;
    };
  };
  meta: {
    correlation_id: string;
    as_of?: string;
  };
}
export interface RequestChatWorkspaceCapabilities {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-capabilities";
  actor: OwnerActor;
  command_id: string;
  payload: {};
}
export interface ReplyChatWorkspaceCapabilities {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicWorkspaceCapabilities;
}
export interface PublicWorkspaceSidebar {
  data: {
    scopes: {
      key: string;
      team_id?: string;
      as_of: string;
      conversation_count: string;
      unread_conversation_count: string;
      waiting_conversation_count: string | null;
      waiting_metric_coverage: "partial" | "complete";
      metrics_state: "ready";
    }[];
    inboxes: {
      id: string;
      name: string;
      creator_principal_id: string;
      shared: boolean;
      version: string;
      conversation_count: string;
      unread_conversation_count: string;
    }[];
    metrics_state: "ready";
  };
  meta: {
    correlation_id: string;
    as_of?: string;
  };
}
export interface RequestChatWorkspaceSidebar {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-sidebar";
  actor: OwnerActor;
  command_id: string;
  payload: {};
}
export interface ReplyChatWorkspaceSidebar {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicWorkspaceSidebar;
}
export interface PublicWorkspaceList {
  data: PublicWorkspaceItem[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
    as_of: string;
    conversation_count: string;
    unread_conversation_count: string;
    waiting_conversation_count: string | null;
    waiting_metric_coverage: "partial" | "complete";
    metrics_state: "ready";
  };
}
export interface PublicWorkspaceItem {
  conversation: PublicConversationEntity;
  latest_inbound_seq: string;
  read_state: {
    last_read_inbound_seq: string;
    unread_message_count: string;
  };
  snooze: null | {
    until: string;
    revision: string;
  };
  tags?: {
    id: string;
    name: string;
    color: string;
    archived?: boolean;
  }[];
  last_message_at: string;
  waiting_since: string | null;
  waiting_seconds: number | null;
  waiting_metric_state: "ready" | "unavailable";
  workspace_allowed_actions: ("mark_read" | "snooze" | "wake" | "tags")[];
}
export interface RequestChatWorkspaceConversations {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-conversations";
  actor: OwnerActor;
  command_id: string;
  payload: {
    limit?: number;
    cursor?: string;
    scope?: string;
    team_id?: string;
    status?: string;
    snooze?: string;
    unread?: string;
    channel?: string;
    channel_id?: string;
    page_id?: string;
    q?: string;
    sort?: string;
    inbox_id?: string;
    tag_ids?: string;
  };
}
export interface ReplyChatWorkspaceConversations {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicWorkspaceList;
}
export interface PublicWorkspaceReadResponse {
  data: PublicWorkspaceReadState;
  meta: {
    correlation_id: string;
    as_of?: string;
  };
}
export interface PublicWorkspaceReadState {
  conversation_id: string;
  last_read_inbound_seq: string;
  latest_inbound_seq: string;
  unread_message_count: string;
  read_state_revision: string;
}
export interface RequestChatWorkspaceConversationsIdReadState {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-conversations-id-read-state";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatWorkspaceConversationsIdReadState {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicWorkspaceReadResponse;
}
export interface PublicWorkspaceMarkRead {
  through_inbound_seq: string;
}
export interface RequestChatWorkspaceMarkRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-mark-read";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicWorkspaceMarkRead;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatWorkspaceMarkRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicWorkspaceReadResponse;
}
export interface PublicCatalogInboxOptions {
  data: {
    /**
     * @maxItems 6
     */
    filter_fields:
      | []
      | ["status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ]
      | [
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags",
          "status" | "owner_principal_id" | "team_id" | "channel" | "channel_id" | "tags"
        ];
    can_share: boolean;
    /**
     * @maxItems 200
     */
    teams: {
      id: string;
      name: string;
    }[];
    /**
     * @maxItems 500
     */
    principals: {
      id: string;
      name: string;
    }[];
  };
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface RequestChatCatalogInboxOptions {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-inbox-options";
  actor: OwnerActor;
  command_id: string;
  payload: {};
}
export interface ReplyChatCatalogInboxOptions {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogInboxOptions;
}
export interface PublicCatalogInboxList {
  data: PublicCatalogInbox[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface PublicCatalogInbox {
  id: string;
  name: string;
  creator_principal_id: string;
  predicate_schema_version: 1;
  predicate: PublicCatalogPredicate;
  sort: "latest_message_desc" | "latest_message_asc" | "waiting_longest";
  version: string;
  archived: boolean;
  shared: boolean;
  /**
   * @maxItems 50
   */
  shares?: {
    kind: "principal" | "team";
    id: string;
  }[];
  allowed_actions: string[];
}
export interface PublicCatalogPredicate {
  scope: "all" | "mine" | "unassigned" | "team";
  team_id?: string;
  /**
   * @minItems 1
   * @maxItems 3
   */
  status:
    | ["open" | "pending" | "closed"]
    | ["open" | "pending" | "closed", "open" | "pending" | "closed"]
    | ["open" | "pending" | "closed", "open" | "pending" | "closed", "open" | "pending" | "closed"];
  snooze: "exclude" | "include" | "only";
  unread: "any" | "only";
  channel?: "messenger" | "mock_messenger";
  channel_id?: string;
  /**
   * @maxItems 10
   */
  tag_ids?:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string];
}
export interface RequestChatCatalogListInboxes {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-list-inboxes";
  actor: OwnerActor;
  command_id: string;
  payload: {
    limit?: number;
    cursor?: string;
    group?: string;
  };
}
export interface ReplyChatCatalogListInboxes {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogInboxList;
}
export interface PublicCatalogInboxCreate {
  name: string;
  predicate_schema_version: 1;
  predicate: PublicCatalogPredicateInput;
  sort: "latest_message_desc" | "latest_message_asc" | "waiting_longest";
  /**
   * @maxItems 50
   */
  shares: {
    kind: "principal" | "team";
    id: string;
  }[];
}
export interface PublicCatalogPredicateInput {
  scope?: "all" | "mine" | "unassigned" | "team";
  team_id?: string;
  /**
   * @minItems 1
   * @maxItems 3
   */
  status?:
    | ["open" | "pending" | "closed"]
    | ["open" | "pending" | "closed", "open" | "pending" | "closed"]
    | ["open" | "pending" | "closed", "open" | "pending" | "closed", "open" | "pending" | "closed"];
  snooze?: "exclude" | "include" | "only";
  unread?: "any" | "only";
  channel?: "messenger" | "mock_messenger";
  channel_id?: string;
  /**
   * @maxItems 10
   */
  tag_ids?:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string];
}
export interface PublicCatalogInboxResponse {
  data: PublicCatalogInbox;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface RequestChatCatalogCreateInbox {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-create-inbox";
  actor: OwnerActor;
  command_id: string;
  payload: {
    body: PublicCatalogInboxCreate;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogCreateInbox {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogInboxResponse;
}
export interface RequestChatCatalogGetInbox {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-get-inbox";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatCatalogGetInbox {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogInboxResponse;
}
export interface PublicCatalogInboxPatch {
  name?: string;
  predicate_schema_version?: 1;
  predicate?: PublicCatalogPredicateInput;
  sort?: "latest_message_desc" | "latest_message_asc" | "waiting_longest";
  creator_principal_id?: string;
}
export interface RequestChatCatalogPatchInbox {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-patch-inbox";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicCatalogInboxPatch;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogPatchInbox {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogInboxResponse;
}
export interface PublicCatalogEmpty {}
export interface PublicCatalogArchive {
  data: {
    id: string;
    archived: true;
  };
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface RequestChatCatalogDeleteInbox {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-delete-inbox";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicCatalogEmpty;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogDeleteInbox {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogArchive;
}
export interface PublicCatalogTagList {
  data: PublicCatalogTag[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface PublicCatalogTag {
  id: string;
  name: string;
  color: "gray" | "blue" | "green" | "amber" | "red" | "purple";
  version: string;
  archived: boolean;
  allowed_actions: string[];
}
export interface RequestChatCatalogListTags {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-list-tags";
  actor: OwnerActor;
  command_id: string;
  payload: {
    limit?: number;
    cursor?: string;
    q?: string;
  };
}
export interface ReplyChatCatalogListTags {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogTagList;
}
export interface PublicCatalogTagCreate {
  name: string;
  color: "gray" | "blue" | "green" | "amber" | "red" | "purple";
}
export interface PublicCatalogTagResponse {
  data: PublicCatalogTag;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface RequestChatCatalogCreateTag {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-create-tag";
  actor: OwnerActor;
  command_id: string;
  payload: {
    body: PublicCatalogTagCreate;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogCreateTag {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogTagResponse;
}
export interface RequestChatCatalogGetTag {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-get-tag";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatCatalogGetTag {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogTagResponse;
}
export interface PublicCatalogTagPatch {
  name?: string;
  color?: "gray" | "blue" | "green" | "amber" | "red" | "purple";
}
export interface RequestChatCatalogPatchTag {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-patch-tag";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicCatalogTagPatch;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogPatchTag {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogTagResponse;
}
export interface RequestChatCatalogDeleteTag {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-delete-tag";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicCatalogEmpty;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogDeleteTag {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogArchive;
}
export interface PublicCatalogSnippetList {
  data: PublicCatalogSnippet[];
  next_cursor: string | null;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface PublicCatalogSnippet {
  id: string;
  title: string;
  shortcut: string;
  text: string;
  version: string;
  archived: boolean;
  allowed_actions: string[];
}
export interface RequestChatCatalogListSnippets {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-list-snippets";
  actor: OwnerActor;
  command_id: string;
  payload: {
    limit?: number;
    cursor?: string;
    q?: string;
  };
}
export interface ReplyChatCatalogListSnippets {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogSnippetList;
}
export interface PublicCatalogSnippetCreate {
  title: string;
  shortcut: string;
  text: string;
}
export interface PublicCatalogSnippetResponse {
  data: PublicCatalogSnippet;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface RequestChatCatalogCreateSnippet {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-create-snippet";
  actor: OwnerActor;
  command_id: string;
  payload: {
    body: PublicCatalogSnippetCreate;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogCreateSnippet {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogSnippetResponse;
}
export interface RequestChatCatalogGetSnippet {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-get-snippet";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatCatalogGetSnippet {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogSnippetResponse;
}
export interface PublicCatalogSnippetPatch {
  title?: string;
  shortcut?: string;
  text?: string;
}
export interface RequestChatCatalogPatchSnippet {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-patch-snippet";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicCatalogSnippetPatch;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogPatchSnippet {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogSnippetResponse;
}
export interface RequestChatCatalogDeleteSnippet {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-delete-snippet";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicCatalogEmpty;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogDeleteSnippet {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogArchive;
}
export interface PublicCatalogInboxShares {
  /**
   * @maxItems 50
   */
  shares: {
    kind: "principal" | "team";
    id: string;
  }[];
}
export interface RequestChatCatalogInboxShares {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-inbox-shares";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicCatalogInboxShares;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogInboxShares {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogInboxResponse;
}
export interface PublicCatalogTagLinks {
  data: {
    conversation_id: string;
    /**
     * @maxItems 20
     */
    tag_ids:
      | []
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string, string, string, string, string]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string
        ];
    tag_set_revision: string;
    version: string;
  };
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface RequestChatCatalogPutConversationTag {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-put-conversation-tag";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    tagId: string;
    body: PublicCatalogEmpty;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogPutConversationTag {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogTagLinks;
}
export interface RequestChatCatalogDeleteConversationTag {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "catalog-delete-conversation-tag";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    tagId: string;
    body: PublicCatalogEmpty;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatCatalogDeleteConversationTag {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicCatalogTagLinks;
}
export interface PublicSnoozeResponse {
  data: PublicSnoozeState;
  meta: {
    as_of?: string;
    correlation_id?: string;
  };
}
export interface PublicSnoozeState {
  conversation_id: string;
  until: string | null;
  snooze_revision: string;
  version: string;
  reason?: string;
}
export interface RequestChatWorkspaceGetSnooze {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-get-snooze";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatWorkspaceGetSnooze {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicSnoozeResponse;
}
export interface PublicSnoozePut {
  until: string;
  reason?: string;
}
export interface RequestChatWorkspacePutSnooze {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-put-snooze";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicSnoozePut;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatWorkspacePutSnooze {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicSnoozeResponse;
}
export interface PublicSnoozeEmpty {}
export interface RequestChatWorkspacePostWake {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-post-wake";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    body: PublicSnoozeEmpty;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatWorkspacePostWake {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicSnoozeResponse;
}
export interface PublicActivityResponse {
  data: PublicActivityItem[];
  older_cursor: string | null;
  newer_cursor: string;
  has_more: boolean;
  meta: {
    state: "ready" | "backfilling" | "partial";
    as_of: string;
    sources: {
      service: "chat" | "crm" | "workflow";
      state: "ready" | "delayed" | "unavailable";
      last_observed_at: string | null;
    }[];
    correlation_id?: string;
  };
}
export interface RequestChatWorkspaceGetActivity {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "workspace-get-activity";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    before?: string;
    after?: string;
    limit?: string;
  };
}
export interface ReplyChatWorkspaceGetActivity {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicActivityResponse;
}
export interface PublicConversationClassificationResponse {
  data: {
    session_id: string;
    conversation_id: string;
    status: "active" | "closed";
    version: string;
    can_edit: boolean;
    /**
     * @maxItems 100
     */
    definitions: {
      id: string;
      key: string;
      label: string;
      type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
      required: boolean;
      default_value: string | number | boolean | null;
      options: string[] | null;
      indexed: boolean;
      sensitive: boolean;
      version: string;
      can_write: boolean;
    }[];
    values: {
      [k: string]: string | number | boolean | null;
    };
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatConversationClassificationGetConversationsConversationSessionsSessionClassification {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-classification-get-conversations-conversation-sessions-session-classification";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
  };
}
export interface ReplyChatConversationClassificationGetConversationsConversationSessionsSessionClassification {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationClassificationResponse;
}
export interface PublicConversationClassificationInput {
  values: {
    [k: string]: string | number | boolean | null;
  };
}
export interface PublicConversationClassificationResult {
  data: {
    session_id: string;
    version: string;
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatConversationClassificationPostConversationsConversationSessionsSessionClassification {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-classification-post-conversations-conversation-sessions-session-classification";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
    body: PublicConversationClassificationInput;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatConversationClassificationPostConversationsConversationSessionsSessionClassification {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationClassificationResult;
}
export interface PublicConversationContributionsResponse {
  data: {
    session_id: string;
    coverage: "full" | "partial" | "none";
    owner: null | {
      id: string | null;
      team_id: string | null;
      revision: string;
    };
    /**
     * @maxItems 50
     */
    history: {
      id: string;
      revision: string;
      kind:
        | "opened"
        | "closed"
        | "assignment"
        | "outbound_submitted"
        | "note"
        | "stage"
        | "evidence"
        | "classification"
        | "outcome";
      source_id: string;
      source_revision: string;
      actor: null | {
        kind: string;
        id: string;
      };
      owner_id: string | null;
      handling_team_id: string | null;
      owner_revision: string;
      recorded_at: string;
      payload: {
        [k: string]: unknown;
      };
    }[];
    next_before_revision: string | null;
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatConversationClassificationGetConversationsConversationSessionsSessionContributions {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-classification-get-conversations-conversation-sessions-session-contributions";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
    before_revision?: string;
  };
}
export interface ReplyChatConversationClassificationGetConversationsConversationSessionsSessionContributions {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationContributionsResponse;
}
export interface PublicConversationAssignmentTeamsResponse {
  /**
   * @maxItems 200
   */
  data: {
    id: string;
    name: string;
    purpose: string;
  }[];
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatConversationClassificationGetRecordsIdAssignmentTeams {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "conversation-classification-get-records-id-assignment-teams";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatConversationClassificationGetRecordsIdAssignmentTeams {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicConversationAssignmentTeamsResponse;
}
export interface PublicNeedAssessmentResponse {
  data: {
    conversation_id: string;
    session_id: string;
    need_id: string;
    version: string;
    /**
     * @maxItems 100
     */
    outcomes: {
      id: string;
      label: string;
      linked: boolean;
      can_link: boolean;
    }[];
    can_edit: boolean;
    /**
     * @maxItems 105
     */
    definitions: {
      id: string;
      key: string;
      label: string;
      type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
      required: boolean;
      default_value: string | number | boolean | null;
      options: string[] | null;
      indexed: boolean;
      sensitive: boolean;
      version: string;
      can_write: boolean;
    }[];
    values: {
      [k: string]: string | number | boolean | null;
    };
    /**
     * @maxItems 100
     */
    pinned: string[];
    proposal: {
      values: {
        [k: string]: string | number | boolean | null;
      };
      confidence?: number;
      /**
       * @maxItems 100
       */
      evidence_ids?: string[];
      provider?: string;
      model?: string;
      config_version?: string;
      input_fingerprint?: string;
      assessed_at?: string;
    };
    /**
     * @maxItems 50
     */
    history: {
      version: string;
      values: {
        [k: string]: string | number | boolean | null;
      };
      recorded_at: string;
      proposal: {
        values: {
          [k: string]: string | number | boolean | null;
        };
        confidence?: number;
        /**
         * @maxItems 100
         */
        evidence_ids?: string[];
        provider?: string;
        model?: string;
        config_version?: string;
        input_fingerprint?: string;
        assessed_at?: string;
      };
    }[];
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatNeedGetAssessment {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "need-get-assessment";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
    need: string;
  };
}
export interface ReplyChatNeedGetAssessment {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicNeedAssessmentResponse;
}
export interface PublicNeedAssessmentInput {
  values?: {
    [k: string]: string | number | boolean | null;
  };
  /**
   * @maxItems 100
   */
  release_pins?: string[];
}
export interface PublicNeedAssessmentResult {
  data: {
    conversation_id: string;
    session_id: string;
    need_id: string;
    version: string;
  };
  meta: {
    correlation_id: string;
  };
}
export interface RequestChatNeedPostAssessment {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "need-post-assessment";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
    need: string;
    body: PublicNeedAssessmentInput;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatNeedPostAssessment {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicNeedAssessmentResult;
}
export interface PublicNeedEnrichInput {}
export interface RequestChatNeedPostEnrich {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "need-post-enrich";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
    need: string;
    body: PublicNeedEnrichInput;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatNeedPostEnrich {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicNeedAssessmentResult;
}
export interface PublicNeedOutcomeInput {
  record_id: string;
}
export interface RequestChatNeedPostOutcome {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "need-post-outcome";
  actor: OwnerActor;
  command_id: string;
  payload: {
    conversation: string;
    session: string;
    need: string;
    body: PublicNeedOutcomeInput;
    expected_version: string | null;
    idempotency_key: string;
  };
}
export interface ReplyChatNeedPostOutcome {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: PublicNeedAssessmentResult;
}
export interface ExternalListConversations {
  data: External_Conversation[];
  meta: External_Meta;
  next_cursor?: string | null;
  [k: string]: unknown;
}
export interface External_Conversation {
  id: string;
  version: string;
  /**
   * Only explicitly selected properties are present. Opaque references do not expand related data.
   */
  properties: {
    status?: string;
    opened_at?: string;
    closed_at?: string | null;
    contact_id?: string;
    team_id?: string | null;
    owner_principal_id?: string | null;
  };
}
export interface External_Meta {
  correlation_id: string;
  [k: string]: unknown;
}
export interface RequestChatExternalConversations {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "external-conversations";
  actor: OwnerActor;
  command_id: string;
  payload: {
    limit?: number;
    cursor?: string;
  };
}
export interface ReplyChatExternalConversations {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: ExternalListConversations;
}
export interface ExternalGetConversation {
  data: External_Conversation;
  meta: External_Meta;
  [k: string]: unknown;
}
export interface RequestChatExternalConversationsId {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "external-conversations-id";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
  };
}
export interface ReplyChatExternalConversationsId {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: ExternalGetConversation;
}
export interface ExternalListConversationMessages {
  data: External_Message[];
  meta: External_Meta;
  next_cursor?: string | null;
  [k: string]: unknown;
}
export interface External_Message {
  id: string;
  conversation_id: string;
  properties: {
    direction?: "inbound" | "outbound";
    status?: string;
    occurred_at?: string;
    received_at?: string;
    /**
     * Sensitive stored plain text or media preview; never an attachment URL.
     */
    text?: string;
  };
}
export interface RequestChatExternalConversationsIdMessages {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "external-conversations-id-messages";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    limit?: number;
    cursor?: string;
  };
}
export interface ReplyChatExternalConversationsIdMessages {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: ExternalListConversationMessages;
}
export interface ExternalGetConversationMessage {
  data: External_Message;
  meta: External_Meta;
  [k: string]: unknown;
}
export interface RequestChatExternalConversationsIdMessagesMessageId {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "external-conversations-id-messages-messageId";
  actor: OwnerActor;
  command_id: string;
  payload: {
    id: string;
    messageId: string;
  };
}
export interface ReplyChatExternalConversationsIdMessagesMessageId {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: ExternalGetConversationMessage;
}
export interface OwnerExternalReadPolicy {
  admission: OwnerAdmission;
  app_id: string;
  policy_key: string;
  /**
   * @maxItems 2
   */
  predicates:
    | []
    | [
        {
          all: boolean;
          /**
           * @maxItems 20
           */
          team_ids:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ];
        }
      ]
    | [
        {
          all: boolean;
          /**
           * @maxItems 20
           */
          team_ids:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ];
        },
        {
          all: boolean;
          /**
           * @maxItems 20
           */
          team_ids:
            | []
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string]
            | [string, string, string, string, string]
            | [string, string, string, string, string, string]
            | [string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string, string]
            | [string, string, string, string, string, string, string, string, string, string, string, string, string]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ]
            | [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string
              ];
        }
      ];
}
export interface RequestChatExternalPrepare {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "external-prepare";
  payload:
    | RequestChatExternalConversations
    | RequestChatExternalConversationsId
    | RequestChatExternalConversationsIdMessages
    | RequestChatExternalConversationsIdMessagesMessageId;
}
export interface ReplyChatExternalPrepare {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerCommandRef;
}
export interface RequestIdentityExternalPolicy {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "external-policy";
  payload: OwnerCommandRef;
}
export interface ReplyIdentityExternalPolicy {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerExternalReadPolicy;
}
export interface ChatWorkspaceWorkspaceReadEvent {
  conversation_id: string;
  principal_id: string;
  through_inbound_seq: string;
  read_state_revision: string;
}
export interface ChatActivitySnoozeEvent {
  conversation_id: string;
  until: string | null;
  snooze_revision: string;
  cause: "scheduled" | "rescheduled" | "deadline" | "inbound" | "manual" | "assignment" | "closed";
}
export interface ChatCatalogsCatalogInboxEvent {
  inbox_id: string;
  operation: "created" | "updated" | "shared" | "archived" | "transferred";
}
export interface ChatCatalogsCatalogSnippetEvent {
  snippet_id: string;
  operation: "created" | "updated" | "archived";
}
export interface ChatCatalogsCatalogTagEvent {
  tag_id: string;
  operation: "created" | "updated" | "archived";
}
export interface ChatCatalogsCatalogTagLinkEvent {
  conversation_id: string;
  tag_id: string;
  operation: "attached" | "detached";
  tag_set_revision: string;
}
export interface ChatActivityActivityNoteEvent {
  conversation_id: string;
  activity_id: string;
  operation: "created" | "updated" | "archived";
  source_revision: string;
}
export interface ChatActivityActivityAutomationEvent {
  conversation_id: string;
  source_service: "workflow";
  run_id: string;
  definition_version_id: string;
  state: "started" | "paused" | "resumed" | "completed" | "failed" | "cancelled";
  source_revision: string;
}
export interface OwnerEventNotice {
  producer:
    | "chat"
    | "identity"
    | "crm"
    | "connector"
    | "routing"
    | "ai-runtime"
    | "workflow"
    | "reporting"
    | "external-api"
    | "bff"
    | "sales";
  consumer: string;
  event_id: string;
  event_type: string;
  schema_version: number;
  aggregate_id: string;
  stream_sequence: string;
  digest: string;
}
export interface OwnerEventReceipt {
  event_id: string;
  consumer: string;
  producer:
    | "chat"
    | "identity"
    | "crm"
    | "connector"
    | "routing"
    | "ai-runtime"
    | "workflow"
    | "reporting"
    | "external-api"
    | "bff"
    | "sales";
  digest: string;
  state: "pending" | "applied" | "duplicate" | "reconciled" | "quarantined";
  watermark: string;
}
export interface OwnerControlEvent {
  schema_version: 1;
  event_type: "chat.registry.changed.v1";
  producer: "chat";
  event_id: string;
  tenant_id: string;
  conversation_id: string;
  registry_revision: string;
  occurred_at: string;
  correlation_id: string;
  snapshot: ChatControlV1_ChatRegistrySnapshot;
}
export interface ChatControlV1_ChatRegistrySnapshot {
  tenant_id: string;
  conversation_id: string;
  registry_revision: string;
  record_version: string;
  owner_revision: string;
  control_revision: string;
  pause_through_revision: string;
  cancel_through_revision: string;
  crm_contact_id: string;
  crm_identity_id: string;
  connection_id: string;
  owner_principal_id: string | null;
  owner_kind: "human" | "ai" | null;
  team_id: string | null;
  /**
   * @maxItems 200
   */
  shared_team_ids: string[];
  active_session_id: string | null;
  status: "open" | "pending" | "closed";
  archived: boolean;
}
export interface RequestChatEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplyChatEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestChatEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplyChatEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestChatEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplyChatEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestChatEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplyChatEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
export interface RequestIdentityEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplyIdentityEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestIdentityEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplyIdentityEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestIdentityEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplyIdentityEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestIdentityEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplyIdentityEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
export interface RequestCrmEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplyCrmEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestCrmEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplyCrmEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestCrmEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplyCrmEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestCrmEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplyCrmEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
export interface RequestConnectorEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplyConnectorEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestConnectorEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplyConnectorEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestConnectorEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplyConnectorEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestConnectorEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplyConnectorEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
export interface RequestRoutingEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplyRoutingEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestRoutingEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplyRoutingEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestRoutingEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplyRoutingEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestRoutingEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplyRoutingEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
export interface RequestSalesEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplySalesEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestSalesEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplySalesEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestSalesEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplySalesEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestSalesEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplySalesEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
export interface RequestAiRuntimeEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplyAiRuntimeEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestAiRuntimeEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplyAiRuntimeEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestAiRuntimeEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplyAiRuntimeEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestAiRuntimeEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplyAiRuntimeEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
export interface RequestWorkflowEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplyWorkflowEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestWorkflowEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplyWorkflowEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestWorkflowEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplyWorkflowEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestWorkflowEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplyWorkflowEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
export interface RequestReportingEventDeliver {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-deliver";
  payload: OwnerEventPayload;
}
export interface ReplyReportingEventDeliver {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestReportingEventStatus {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-status";
  payload: OwnerEventNotice;
}
export interface ReplyReportingEventStatus {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReceipt;
}
export interface RequestReportingEventReplay {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-replay";
  payload: {
    consumer: string;
    aggregate_id: string;
    after_sequence: string;
    limit: number;
  };
}
export interface ReplyReportingEventReplay {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: {
    /**
     * @maxItems 100
     */
    events: OwnerEventNotice[];
    high_watermark: string;
  };
}
export interface RequestReportingEventRead {
  schema_version: 1;
  request_id: string;
  correlation_id: string;
  tenant_id: string;
  operation: "event-read";
  payload: OwnerEventNotice;
}
export interface ReplyReportingEventRead {
  schema_version: 1;
  request_id: string;
  tenant_id: string;
  result: OwnerEventReadResult;
}
