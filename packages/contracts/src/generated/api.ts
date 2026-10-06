export interface paths {
    "/api/v1/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getLiveness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getReadiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getAuthSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/csrf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getAuthCsrf"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["login"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["callback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/memberships": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list-memberships"];
        put?: never;
        post: operations["create-memberships"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/memberships/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["patch-memberships"];
        trace?: never;
    };
    "/api/v1/admin/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list-teams"];
        put?: never;
        post: operations["create-teams"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/teams/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["patch-teams"];
        trace?: never;
    };
    "/api/v1/admin/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list-roles"];
        put?: never;
        post: operations["create-roles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/roles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["patch-roles"];
        trace?: never;
    };
    "/api/v1/admin/ai-agents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list-ai-agents"];
        put?: never;
        post: operations["create-ai-agents"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/ai-agents/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["patch-ai-agents"];
        trace?: never;
    };
    "/api/v1/admin/principals/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["patch-principals"];
        trace?: never;
    };
    "/api/v1/me/memberships": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listMyMemberships"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/object-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["registry-list-object"];
        put?: never;
        post: operations["registry-create-object"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/association-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["registry-list-type"];
        put?: never;
        post: operations["registry-create-type"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/associations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["registry-create-association"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/records/{id}/associations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["registry-list-association"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/crm/context": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-crm-context"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/objects/{key}/descriptor": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-objects-key-descriptor"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-leads"];
        put?: never;
        post: operations["crm-post-leads"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leads/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-leads-id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leads/{id}/qualification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["crm-post-leads-id-qualification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leads/{id}/disqualify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["crm-post-leads-id-disqualify"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/object-types/{key}/properties": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-object-types-key-properties"];
        put?: never;
        post: operations["crm-post-object-types-key-properties"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/object-types/{key}/properties/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["crm-patch-object-types-key-properties-id"];
        trace?: never;
    };
    "/api/v1/object-types/{key}/forms/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-object-types-key-forms-id"];
        put: operations["crm-put-object-types-key-forms-id"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/object-types/{key}/views/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-object-types-key-views-id"];
        put: operations["crm-put-object-types-key-views-id"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/objects/{key}/records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-objects-key-records"];
        put?: never;
        post: operations["crm-post-objects-key-records"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/objects/{key}/records/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crm-get-objects-key-records-id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["crm-patch-objects-key-records-id"];
        trace?: never;
    };
    "/api/v1/objects/{key}/records/{id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["crm-post-objects-key-records-id-archive"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["conversation-get-conversations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["conversation-get-conversations-id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["conversation-get-conversations-id-messages"];
        put?: never;
        post: operations["conversation-post-conversations-id-messages"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/message-envelopes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["conversation-get-conversations-id-message-envelopes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/message-envelopes-v3": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["conversation-get-conversations-id-message-envelopes-v3"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/outbound-intents/{intentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["conversation-get-conversations-id-outbound-intents-intentId"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/notes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["conversation-get-conversations-id-notes"];
        put?: never;
        post: operations["conversation-post-conversations-id-notes"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/transition": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["conversation-post-conversations-id-transition"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/mock-messenger/deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["intake-request"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/deliveries/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["intake-status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/deliveries/{id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["intake-retry"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/mock-messenger/binding": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["intake-binding"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/connector/v1/deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["connector-ack"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/connector/v1/deliveries/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["connector-response"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/records/{id}/assignment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["routing-assignment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/takeover": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["routing-takeover"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/records/{id}/assignment-targets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["routing-targets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/records/{id}/ownership-history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["routing-history"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/connector/v1/messenger/{appId}/webhook": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["messenger-challenge"];
        put?: never;
        /** @description Optional signed capture only. HMAC SHA256 over exact raw uncompressed bytes <=64KiB; max100 total events. Every Page must be explicitly bound. No Chat delivery implied. */
        post: operations["messenger-capture"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workflow-get-workflows"];
        put?: never;
        post: operations["workflow-post-workflows"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["workflow-patch-workflows-id"];
        trace?: never;
    };
    "/api/v1/workflows/{id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workflow-get-workflows-id-versions"];
        put?: never;
        post: operations["workflow-post-workflows-id-versions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows/{id}/versions/{version}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["workflow-post-workflows-id-versions-version-publish"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflow-runs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workflow-get-workflow-runs-id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflow-runs/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["workflow-post-workflow-runs-id-cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chatflows": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["chatflow-get-chatflows"];
        put?: never;
        post: operations["chatflow-post-chatflows"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chatflows/{id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["chatflow-get-chatflows-id-versions"];
        put?: never;
        post: operations["chatflow-post-chatflows-id-versions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chatflows/{id}/versions/{version}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["chatflow-post-chatflows-id-versions-version-publish"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chatflow-sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["chatflow-get-chatflow-sessions-id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/chatflow-session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["chatflow-get-conversations-id-chatflow-session"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chatflow-sessions/{id}/complete-qualification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["chatflow-post-chatflow-sessions-id-complete-qualification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leads/{id}/handoffs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["sales-handoff-list"];
        put?: never;
        post: operations["sales-handoff-request"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leads/{id}/handoffs/{handoffId}/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["sales-handoff-accept"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sales/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["m2-sales-leads"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sales/leads/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["m2-sales-leads-id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/operations/failed-deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["m2-operations-failed-deliveries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/operations/workflow-runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["m2-operations-workflow-runs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/operations/agent-executions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["m2-operations-agent-executions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/operations/deliveries/{id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["m2-delivery-retry"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/contact-identities/lookup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["contact-lookup-request"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/contact-identities/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["contact-resolve-request"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/mock-messenger/deliveries-v2": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["contact-delivery-request"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversations/{id}/messages-v2": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["contact-bound-send"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/channels/facebook/pages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin-channels-facebook-pages"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/conversation-channels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["conversation-channels"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/channels/facebook/connect": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["facebook-connect"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/channels/facebook/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["facebook-callback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workspace-capabilities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/sidebar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workspace-sidebar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workspace-conversations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/conversations/{id}/read-state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["workspace-conversations-id-read-state"];
        put?: never;
        post: operations["workspace-mark-read"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/inboxes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["catalog-list-inboxes"];
        put?: never;
        post: operations["catalog-create-inbox"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/inboxes/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["catalog-get-inbox"];
        put?: never;
        post?: never;
        delete: operations["catalog-delete-inbox"];
        options?: never;
        head?: never;
        patch: operations["catalog-patch-inbox"];
        trace?: never;
    };
    "/api/v1/chat-workspace/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["catalog-list-tags"];
        put?: never;
        post: operations["catalog-create-tag"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/tags/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["catalog-get-tag"];
        put?: never;
        post?: never;
        delete: operations["catalog-delete-tag"];
        options?: never;
        head?: never;
        patch: operations["catalog-patch-tag"];
        trace?: never;
    };
    "/api/v1/chat-workspace/snippets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["catalog-list-snippets"];
        put?: never;
        post: operations["catalog-create-snippet"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/snippets/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["catalog-get-snippet"];
        put?: never;
        post?: never;
        delete: operations["catalog-delete-snippet"];
        options?: never;
        head?: never;
        patch: operations["catalog-patch-snippet"];
        trace?: never;
    };
    "/api/v1/chat-workspace/inboxes/{id}/shares": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["catalog-inbox-shares"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chat-workspace/conversations/{id}/tags/{tagId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["catalog-put-conversation-tag"];
        post?: never;
        delete: operations["catalog-delete-conversation-tag"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** HealthResponse */
        HealthResponse: {
            /** @enum {unknown} */
            status: "ok" | "degraded";
            /** @enum {unknown} */
            service: "api" | "worker";
            /** @constant */
            stage: "scaffold";
            checks: {
                /** @enum {unknown} */
                mysql: "up" | "down" | "not_configured";
                /** @enum {unknown} */
                redis: "up" | "down" | "not_configured";
            };
        };
        /** AuthSessionResponse */
        AuthSessionResponse: {
            data: {
                /** Format: uuid */
                account_id: string;
                display_name: string;
                /** Format: date-time */
                expires_at: string;
            };
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        /** AuthCsrfResponse */
        AuthCsrfResponse: {
            data: {
                csrf_token: string;
            };
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        /** AuthErrorResponse */
        AuthErrorResponse: {
            error: {
                code: string;
                message: string;
                fields: string[];
                retryable: boolean;
            };
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "memberships-create": {
            /** Format: uuid */
            account_id: string;
            /** @enum {unknown} */
            seat_code: "viewer" | "chat" | "sales" | "service" | "admin";
            role_ids: string[];
            team_ids: string[];
        };
        "teams-create": {
            name: string;
            /** @enum {unknown} */
            purpose: "chat" | "sales" | "service" | "general";
        };
        "roles-create": {
            key: string;
            name: string;
            permissions: {
                resource: string;
                action: string;
                /** @enum {unknown} */
                scope: "own" | "team" | "all";
            }[];
        };
        "ai-agents-create": {
            name: string;
            /** Format: uuid */
            policy_id: string;
            runtime_adapter: string;
            max_concurrency: number;
            role_ids: string[];
            team_ids: string[];
        };
        "memberships-patch": {
            /** @enum {unknown} */
            seat_code?: "viewer" | "chat" | "sales" | "service" | "admin";
            role_ids?: string[];
            team_ids?: string[];
            /** @enum {unknown} */
            status?: "active" | "suspended";
        };
        "teams-patch": {
            name?: string;
            active?: boolean;
        };
        "roles-patch": {
            name?: string;
            permissions?: {
                resource: string;
                action: string;
                /** @enum {unknown} */
                scope: "own" | "team" | "all";
            }[];
        };
        "ai-agents-patch": {
            name?: string;
            /** Format: uuid */
            policy_id?: string;
            max_concurrency?: number;
            role_ids?: string[];
            team_ids?: string[];
        };
        "principals-patch": {
            /** @enum {unknown} */
            availability?: "available" | "unavailable";
            /** @enum {unknown} */
            status?: "active" | "suspended";
        };
        "memberships-entity": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            version: string;
            /** Format: uuid */
            account_id: string;
            /** @enum {unknown} */
            seat_code: "viewer" | "chat" | "sales" | "service" | "admin";
            role_ids: string[];
            team_ids: string[];
            /** Format: uuid */
            principal_id: string;
            principal_version: string;
            auth_revision: string;
            /** @enum {unknown} */
            status: "invited" | "active" | "suspended";
        };
        "teams-entity": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            version: string;
            name: string;
            /** @enum {unknown} */
            purpose: "chat" | "sales" | "service" | "general";
            active: boolean;
        };
        "roles-entity": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            version: string;
            key: string;
            name: string;
            permissions: {
                resource: string;
                action: string;
                /** @enum {unknown} */
                scope: "own" | "team" | "all";
            }[];
        };
        "ai-agents-entity": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            version: string;
            name: string;
            /** Format: uuid */
            policy_id: string;
            runtime_adapter: string;
            max_concurrency: number;
            role_ids: string[];
            team_ids: string[];
            /** Format: uuid */
            principal_id: string;
            principal_version: string;
            auth_revision: string;
        };
        "principals-entity": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            version: string;
            /** @enum {unknown} */
            kind: "human" | "ai";
            /** @enum {unknown} */
            status: "active" | "suspended";
            /** @enum {unknown} */
            availability: "available" | "unavailable";
            auth_revision: string;
        };
        "my-membership-entity": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            version: string;
            /** @enum {unknown} */
            seat_code: "viewer" | "chat" | "sales" | "service" | "admin";
            /** Format: uuid */
            principal_id: string;
            tenant_name: string;
        };
        "memberships-response": {
            data: components["schemas"]["memberships-entity"];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "memberships-list": {
            data: components["schemas"]["memberships-entity"][];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
            next_cursor: string | null;
        };
        "teams-response": {
            data: components["schemas"]["teams-entity"];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "teams-list": {
            data: components["schemas"]["teams-entity"][];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
            next_cursor: string | null;
        };
        "roles-response": {
            data: components["schemas"]["roles-entity"];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "roles-list": {
            data: components["schemas"]["roles-entity"][];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
            next_cursor: string | null;
        };
        "ai-agents-response": {
            data: components["schemas"]["ai-agents-entity"];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "ai-agents-list": {
            data: components["schemas"]["ai-agents-entity"][];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
            next_cursor: string | null;
        };
        "principals-response": {
            data: components["schemas"]["principals-entity"];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "principals-list": {
            data: components["schemas"]["principals-entity"][];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
            next_cursor: string | null;
        };
        "my-membership-response": {
            data: components["schemas"]["my-membership-entity"];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "my-membership-list": {
            data: components["schemas"]["my-membership-entity"][];
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
            next_cursor: string | null;
        };
        "registry-object-create": {
            key: string;
            label: string;
        };
        "registry-type-create": {
            key: string;
            label: string;
            source_type: string;
            target_type: string;
            /** @enum {unknown} */
            cardinality: "many_to_many" | "one_to_many" | "one_to_one";
        };
        "registry-association-create": {
            type_key: string;
            /** Format: uuid */
            source_record_id: string;
            /** Format: uuid */
            target_record_id: string;
        };
        "registry-object": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            key: string;
            label: string;
            version: string;
            /** @enum {unknown} */
            kind: "standard" | "custom";
            schema_version: string;
        };
        "registry-type": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            key: string;
            label: string;
            version: string;
            /** Format: uuid */
            source_object_type_id: string;
            /** Format: uuid */
            target_object_type_id: string;
            /** @enum {unknown} */
            cardinality: "many_to_many" | "one_to_many" | "one_to_one";
        };
        "registry-association": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            /** Format: uuid */
            association_type_id: string;
            /** Format: uuid */
            source_record_id: string;
            /** Format: uuid */
            target_record_id: string;
        };
        "registry-association-created": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            /** Format: uuid */
            association_type_id: string;
            /** Format: uuid */
            source_record_id: string;
            /** Format: uuid */
            target_record_id: string;
            source_version: string;
        };
        "registry-object-list": {
            data: components["schemas"]["registry-object"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "registry-object-response": {
            data: components["schemas"]["registry-object"];
            meta: {
                correlation_id: string;
            };
        };
        "registry-type-list": {
            data: components["schemas"]["registry-type"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "registry-type-response": {
            data: components["schemas"]["registry-type"];
            meta: {
                correlation_id: string;
            };
        };
        "registry-association-list": {
            data: components["schemas"]["registry-association"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "registry-association-response": {
            data: components["schemas"]["registry-association-created"];
            meta: {
                correlation_id: string;
            };
        };
        "crm-property-create": {
            key: string;
            label: string;
            /** @enum {unknown} */
            type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
            required: boolean;
            default_value?: unknown;
            options?: string[] | null;
            indexed: boolean;
            sensitive: boolean;
        };
        "crm-property-patch": {
            label: string;
        };
        "crm-property": {
            key: string;
            label: string;
            /** @enum {unknown} */
            type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
            required: boolean;
            default_value: unknown;
            options: string[] | null;
            indexed: boolean;
            sensitive: boolean;
            /** Format: uuid */
            id: string;
            version: string;
        };
        "crm-record": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            object_key: string;
            version: string;
            owner_revision: string;
            owner_principal_id: string | null;
            team_id: string | null;
            archived: boolean;
            fields: {
                [key: string]: unknown;
            };
            custom_values: {
                [key: string]: unknown;
            };
        };
        "crm-record-create": {
            fields?: {
                [key: string]: unknown;
            };
            custom_values?: {
                [key: string]: unknown;
            };
            team_id?: string | null;
        };
        "crm-record-patch": {
            fields?: {
                [key: string]: unknown;
            };
            custom_values?: {
                [key: string]: unknown;
            };
        };
        "crm-archive": {
            reason: string;
        };
        "crm-form-put": {
            fields: string[];
        };
        "crm-view-put": {
            columns: string[];
            filter: {
                field: string;
                /** @enum {unknown} */
                op: "eq" | "in" | "gte" | "lte";
                value: unknown;
            }[];
            sort: {
                field: string;
                /** @enum {unknown} */
                direction: "asc" | "desc";
            } | null;
        };
        "crm-form": {
            fields: string[];
            /** Format: uuid */
            id: string;
            key: string;
            version: string;
        };
        "crm-view": {
            columns: string[];
            filter: {
                field: string;
                /** @enum {unknown} */
                op: "eq" | "in" | "gte" | "lte";
                value: unknown;
            }[];
            sort: {
                field: string;
                /** @enum {unknown} */
                direction: "asc" | "desc";
            } | null;
            /** Format: uuid */
            id: string;
            key: string;
            version: string;
        };
        "crm-property-response": {
            data: components["schemas"]["crm-property"];
            meta: {
                correlation_id: string;
            };
        };
        "crm-record-response": {
            data: components["schemas"]["crm-record"];
            meta: {
                correlation_id: string;
            };
        };
        "crm-form-response": {
            data: components["schemas"]["crm-form"];
            meta: {
                correlation_id: string;
            };
        };
        "crm-view-response": {
            data: components["schemas"]["crm-view"];
            meta: {
                correlation_id: string;
            };
        };
        "crm-property-list": {
            data: components["schemas"]["crm-property"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "crm-record-list": {
            data: components["schemas"]["crm-record"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "crm-lead-create": {
            /** Format: uuid */
            contact_id: string;
            qualification?: {
                service_interest?: string;
                need_summary?: string;
                contact_permission?: boolean;
                /** @enum {unknown} */
                preferred_contact_method?: "messenger" | "phone";
                phone?: string | null;
                consent_evidence?: {
                    /** @constant */
                    kind: "manual";
                    note: string;
                };
            };
            conversation_id?: null;
            qualification_session_id?: null;
        };
        "crm-lead-qualify": {
            qualification: {
                service_interest?: string;
                need_summary?: string;
                contact_permission?: boolean;
                /** @enum {unknown} */
                preferred_contact_method?: "messenger" | "phone";
                phone?: string | null;
                consent_evidence?: {
                    /** @constant */
                    kind: "manual";
                    note: string;
                };
            };
        };
        "crm-lead-disqualify": {
            reason: string;
        };
        "crm-contact-fields": {
            display_name: string;
            normalized_phone?: string | null;
            normalized_email?: string | null;
            contact_preference?: {
                /** @enum {unknown} */
                preferred_contact_method?: "messenger" | "phone" | "email";
            };
        };
        "crm-company-fields": {
            name: string;
            domain?: string | null;
        };
        "crm-activity-fields": {
            /** @enum {unknown} */
            kind: "note" | "task" | "call";
            subject: string;
            body?: string | null;
            /** Format: date-time */
            due_at?: string | null;
            /** Format: uuid */
            related_record_id: string;
        };
        "crm-context-response": {
            data: {
                /** Format: uuid */
                principal_id: string;
                capabilities: string[];
                grants: {
                    resource: string;
                    action: string;
                    /** @enum {unknown} */
                    scope: "own" | "team" | "all";
                }[];
                objects: {
                    /** Format: uuid */
                    id: string;
                    key: string;
                    label: string;
                    /** @enum {unknown} */
                    kind: "standard" | "custom";
                    version: string;
                }[];
            };
            meta: {
                correlation_id: string;
            };
        };
        "crm-descriptor-response": {
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
                    /** @enum {unknown} */
                    type: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "enum";
                    required: boolean;
                    default_value: unknown;
                    options: string[] | null;
                    indexed: boolean;
                    sensitive: boolean;
                    /** Format: uuid */
                    id: string;
                    version: string;
                    writable: boolean;
                }[];
                order: string[];
            };
            meta: {
                correlation_id: string;
            };
        };
        "conversation-send": {
            text: string;
            owner_revision: string;
        };
        "conversation-note": {
            text: string;
        };
        "conversation-transition": {
            /** @enum {unknown} */
            target_status: "open" | "pending" | "closed";
            reason: string;
        };
        "conversation-entity": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            contact_id: string;
            /** Format: uuid */
            contact_identity_id: string;
            /** Format: uuid */
            connection_id: string;
            /** @enum {unknown} */
            status: "open" | "pending" | "closed";
            /** Format: date-time */
            opened_at: string;
            closed_at: string | null;
            version: string;
            owner_revision: string;
            owner_principal_id: string | null;
            team_id: string | null;
            contact: {
                /** Format: uuid */
                id?: string;
                display_name?: string;
                normalized_phone?: string | null;
                normalized_email?: string | null;
            } | null;
            attribution?: {
                /** @enum {unknown} */
                source: "unknown" | "ctm";
                ad_id: string | null;
                campaign_id: string | null;
            };
            /** @enum {unknown} */
            owner_kind?: "human" | "ai" | null;
            allowed_actions?: ("reply" | "note" | "update" | "assign" | "takeover")[];
            latest_message?: {
                /** Format: uuid */
                id: string;
                text?: string;
                /** @enum {unknown} */
                status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
                /** @enum {unknown} */
                direction: "inbound" | "outbound";
                /** Format: date-time */
                received_at: string;
            } | null;
            /** @enum {unknown} */
            channel?: "mock_messenger" | "messenger";
            /** Format: uuid */
            channel_id?: string;
            page_id?: string;
            channel_name?: string;
        };
        "conversation-message": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            conversation_id: string;
            /** @enum {unknown} */
            direction: "inbound" | "outbound";
            text?: string;
            /** @enum {unknown} */
            status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
            provider_message_id: string | null;
            outbound_intent_id: string | null;
            /** Format: date-time */
            occurred_at: string;
            /** Format: date-time */
            received_at: string;
        };
        "conversation-intent": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            conversation_id: string;
            /** Format: uuid */
            message_id: string;
            /** @enum {unknown} */
            status: "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
            provider_message_id: string | null;
            error_code: string | null;
        };
        "conversation-queued": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            conversation_id: string;
            /** Format: uuid */
            message_id: string;
            /** @enum {unknown} */
            status: "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
            status_url: string;
            provider_message_id?: string | null;
            error_code?: string | null;
        };
        "conversation-response": {
            data: components["schemas"]["conversation-entity"];
            meta: {
                correlation_id: string;
            };
        };
        "conversation-intent-response": {
            data: components["schemas"]["conversation-intent"];
            meta: {
                correlation_id: string;
            };
        };
        "conversation-send-response": {
            data: components["schemas"]["conversation-queued"];
            meta: {
                correlation_id: string;
            };
        };
        "conversation-note-response": {
            data: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                conversation_id: string;
            };
            meta: {
                correlation_id: string;
            };
        };
        "conversation-list": {
            data: components["schemas"]["conversation-entity"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "conversation-timeline": {
            data: components["schemas"]["conversation-message"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "conversation-notes": {
            data: {
                /** Format: uuid */
                id: string;
                /** Format: date-time */
                created_at: string;
                body?: string | null;
            }[];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "conversation-message-envelope-v2": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            conversation_id: string;
            /** @enum {unknown} */
            direction: "inbound" | "outbound";
            text?: string;
            /** @enum {unknown} */
            status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
            outbound_intent_id: string | null;
            /** Format: date-time */
            occurred_at: string;
            /** Format: date-time */
            received_at: string;
            external_msg_id: string | null;
            /** @constant */
            schema_version: 2;
            /** Format: uuid */
            connection_id: string;
            /** @constant */
            platform: "mock_messenger";
            /** @constant */
            message_type: "text";
            reply_to?: null;
            attachment?: null;
        };
        "conversation-envelope-timeline": {
            data: components["schemas"]["conversation-message-envelope-v2"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "conversation-message-envelope-v3": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            conversation_id: string;
            /** @enum {unknown} */
            direction: "inbound" | "outbound";
            text?: string;
            /** @enum {unknown} */
            status: "received" | "queued" | "sending" | "sent" | "failed" | "unknown" | "cancelled";
            outbound_intent_id: string | null;
            /** Format: date-time */
            occurred_at: string;
            /** Format: date-time */
            received_at: string;
            external_msg_id: string | null;
            /** @constant */
            schema_version: 3;
            /** Format: uuid */
            connection_id: string;
            /** @constant */
            platform: "mock_messenger";
            /** @enum {unknown} */
            message_type: "text" | "media" | "template" | "unsupported";
            reply_to?: {
                external_msg_id: string;
                internal_message_id: string | null;
            } | null;
            attachment?: null | {
                /** @constant */
                version: 1;
                /** @constant */
                kind: "media";
                items: {
                    /** @enum {unknown} */
                    media_type: "image" | "audio" | "video" | "file";
                    external_media_id: string;
                    name: string | null;
                }[];
            } | {
                /** @constant */
                version: 1;
                /** @constant */
                kind: "gallery";
                cards: {
                    title: string;
                    subtitle: string | null;
                    buttons: {
                        label: string;
                    }[];
                }[];
            } | {
                /** @constant */
                version: 1;
                /** @constant */
                kind: "csat";
                title: string;
                prompt: string;
            } | {
                /** @constant */
                version: 1;
                /** @constant */
                kind: "unsupported";
                label: string;
            };
            /** @enum {unknown} */
            text_source: "original" | "extracted" | "preview";
        };
        "conversation-rich-timeline": {
            data: components["schemas"]["conversation-message-envelope-v3"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "intake-request": {
            provider_event_id: string;
            provider_message_id: string;
            external_subject_id: string;
            /** Format: date-time */
            occurred_at: string;
            display_label?: string;
            message: {
                /** @constant */
                type: "text";
                text: string;
            } | {
                /** @constant */
                type: "rich";
                content: {
                    /** @constant */
                    version: 1;
                    /** @constant */
                    message_type: "text";
                    text: string;
                    reply_to: {
                        external_msg_id: string;
                    } | null;
                    attachment: null;
                } | {
                    /** @constant */
                    version: 1;
                    /** @constant */
                    message_type: "media";
                    text: string | null;
                    reply_to: {
                        external_msg_id: string;
                    } | null;
                    attachment: {
                        /** @constant */
                        version: 1;
                        /** @constant */
                        kind: "media";
                        items: {
                            /** @enum {unknown} */
                            media_type: "image" | "audio" | "video" | "file";
                            external_media_id: string;
                            name: string | null;
                        }[];
                    };
                    /** @enum {unknown} */
                    text_source?: "extracted" | "preview";
                } | {
                    /** @constant */
                    version: 1;
                    /** @constant */
                    message_type: "template";
                    text: string | null;
                    reply_to: {
                        external_msg_id: string;
                    } | null;
                    attachment: {
                        /** @constant */
                        version: 1;
                        /** @constant */
                        kind: "gallery";
                        cards: {
                            title: string;
                            subtitle: string | null;
                            buttons: {
                                label: string;
                            }[];
                        }[];
                    } | {
                        /** @constant */
                        version: 1;
                        /** @constant */
                        kind: "csat";
                        title: string;
                        prompt: string;
                    };
                    /** @enum {unknown} */
                    text_source?: "extracted" | "preview";
                } | {
                    /** @constant */
                    version: 1;
                    /** @constant */
                    message_type: "unsupported";
                    text: string | null;
                    reply_to: {
                        external_msg_id: string;
                    } | null;
                    attachment: {
                        /** @constant */
                        version: 1;
                        /** @constant */
                        kind: "unsupported";
                        label: string;
                    };
                    /** @enum {unknown} */
                    text_source?: "extracted" | "preview";
                };
            };
            referral?: {
                /** @constant */
                source: "ctm";
                ad_id?: string | null;
                campaign_id?: string | null;
            };
        };
        "intake-status": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            connection_id: string;
            /** @enum {unknown} */
            status: "received" | "processed" | "failed";
            attempts: number;
            error_code: string | null;
            conversation_id: string | null;
            message_id: string | null;
            duplicate: boolean;
            /** @enum {unknown} */
            attribution: "unknown" | "ctm";
            /** Format: date-time */
            received_at: string;
            processed_at: string | null;
        };
        "intake-ack": {
            data: {
                /** Format: uuid */
                delivery_id: string;
                /** @constant */
                status: "received";
            };
            meta: {
                correlation_id: string;
            };
        };
        "intake-response": {
            data: components["schemas"]["intake-status"];
            meta: {
                correlation_id: string;
            };
        };
        "intake-retry": Record<string, never>;
        "intake-binding": {
            data: {
                /** Format: uuid */
                tenant_id: string;
                /** Format: uuid */
                connection_id: string;
                /** @constant */
                platform: "mock_messenger";
            };
            meta: {
                correlation_id: string;
            };
        };
        "connector-ack": {
            data: {
                /** Format: uuid */
                delivery_id: string;
                /** @enum {unknown} */
                status: "queued" | "forwarded" | "completed" | "blocked" | "attention";
            };
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "connector-response": {
            data: {
                /** Format: uuid */
                id: string;
                /** @enum {unknown} */
                status: "queued" | "forwarded" | "completed" | "blocked" | "attention";
                attempts: number;
                error_code: string | null;
                remote_delivery_id: string | null;
            };
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "connector-error": {
            error: {
                code: string;
                retryable: boolean;
            };
            meta: {
                /** Format: uuid */
                correlation_id: string;
            };
        };
        "messenger-webhook": {
            /** @constant */
            object: "page";
            entry: ({
                id: string;
                time?: number;
                messaging?: {
                    sender: {
                        id: string;
                    };
                    recipient: {
                        id: string;
                    };
                    timestamp: number;
                }[];
                standby?: {
                    sender: {
                        id: string;
                    };
                    recipient: {
                        id: string;
                    };
                    timestamp: number;
                }[];
            } | unknown | unknown)[];
        };
        "routing-assignment": {
            /** Format: uuid */
            owner_principal_id: string | null;
            /** Format: uuid */
            team_id?: string | null;
            /** @enum {unknown} */
            reason: "manual" | "handoff";
        };
        "routing-takeover": {
            /** @constant */
            reason: "human_takeover";
        };
        "routing-entity": {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            object_key: string;
            version: string;
            owner_revision: string;
            /** Format: uuid */
            owner_principal_id: string | null;
            /** Format: uuid */
            team_id: string | null;
        };
        "routing-response": {
            data: components["schemas"]["routing-entity"];
            meta: {
                correlation_id: string;
            };
        };
        "routing-target": {
            /** Format: uuid */
            id: string;
            /** @enum {unknown} */
            kind: "human" | "ai";
            eligible: boolean;
            /** @enum {unknown} */
            reason: null | "unavailable" | "team" | "capability" | "role" | "field" | "policy" | "capacity";
        };
        "routing-targets": {
            data: components["schemas"]["routing-target"][];
            meta: {
                correlation_id: string;
            };
        };
        "routing-history-entry": {
            /** Format: uuid */
            from_owner_id: string | null;
            /** Format: uuid */
            to_owner_id: string | null;
            /** Format: uuid */
            from_team_id: string | null;
            /** Format: uuid */
            to_team_id: string | null;
            owner_revision: string;
            reason: string;
            /** @enum {unknown} */
            actor_kind: "human" | "ai" | "service" | "system";
            /** Format: uuid */
            actor_id: string;
        };
        "routing-history": {
            data: components["schemas"]["routing-history-entry"][];
            meta: {
                correlation_id: string;
            };
        };
        "workflow-graph": {
            trigger: {
                /** @constant */
                event_type: "conversation.created";
                /** Format: uuid */
                connection_id: string;
            };
            entry_node: string;
            nodes: ({
                key: string;
                /** @constant */
                type: "assign_owner";
                config: {
                    record_id: string | {
                        ref: string;
                    };
                    /** Format: uuid */
                    team_id: string;
                    /** @enum {unknown} */
                    capability: "chat" | "sales";
                    /** @enum {unknown} */
                    preference: "human" | "ai" | "any";
                };
                next: string;
            } | {
                key: string;
                /** @constant */
                type: "start_chatflow";
                config: {
                    conversation_id: string | {
                        ref: string;
                    };
                    /** Format: uuid */
                    chatflow_version_id: string;
                };
                next: string;
            } | {
                key: string;
                /** @constant */
                type: "request_lead_handoff";
                config: {
                    lead_id: string | {
                        ref: string;
                    };
                    /** Format: uuid */
                    target_team_id: string;
                };
                next: string;
            } | {
                key: string;
                /** @constant */
                type: "wait_event";
                config: {
                    /** @enum {unknown} */
                    event_type: "chatflow.completed" | "lead.accepted";
                    match_key: {
                        ref: string;
                    };
                    timeout_seconds: number;
                };
                next: string;
                on_timeout: string;
            } | {
                key: string;
                /** @constant */
                type: "wait_timer";
                config: {
                    duration_seconds: number;
                };
                next: string;
            } | {
                key: string;
                /** @constant */
                type: "condition";
                config: {
                    left: (string | number | boolean | null) | {
                        ref: string;
                    };
                    /** @enum {unknown} */
                    op: "eq" | "exists";
                    right?: (string | number | boolean | null) | {
                        ref: string;
                    };
                    on_true: string;
                    on_false: string;
                };
            } | {
                key: string;
                /** @constant */
                type: "end";
                config: {
                    outcome: string;
                };
            })[];
        };
        "workflow-create": {
            key: string;
            name: string;
            /** Format: uuid */
            service_actor_id: string;
        };
        "workflow-version-create": {
            graph: components["schemas"]["workflow-graph"];
            /** Format: uuid */
            execution_role_id: string;
        };
        "workflow-publish": Record<string, never>;
        "workflow-enable": {
            enabled: boolean;
        };
        "workflow-cancel": {
            /** @constant */
            reason: "operator_cancelled";
        };
        "workflow-mutation": {
            data: {
                /** Format: uuid */
                id: string;
                version?: string;
                number?: number;
                /** @enum {unknown} */
                state?: "draft";
                definition_version?: string;
                /** @enum {unknown} */
                status?: "cancelled" | "completed" | "failed";
            };
            meta: {
                correlation_id: string;
            };
        };
        "workflow-list": {
            data: {
                /** Format: uuid */
                id: string;
                key: string;
                name: string;
                /** Format: uuid */
                service_actor_id: string;
                active_version_id: string | null;
                enabled: boolean;
                version: string;
            }[];
            meta: {
                correlation_id: string;
            };
        };
        "workflow-versions": {
            data: {
                /** Format: uuid */
                id: string;
                number: number;
                /** @enum {unknown} */
                state: "draft" | "published";
                graph: components["schemas"]["workflow-graph"];
                /** Format: uuid */
                execution_role_id: string;
            }[];
            meta: {
                correlation_id: string;
            };
        };
        "workflow-run": {
            data: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                definition_id: string;
                /** Format: uuid */
                version_id: string;
                /** @enum {unknown} */
                status: "queued" | "running" | "waiting" | "completed" | "failed" | "cancelled";
                current_node: string;
                error_code: string | null;
                attention: boolean;
                cancel_pending: boolean;
                steps: {
                    node_key: string;
                    status: string;
                    attempt: number;
                    error_code: string | null;
                }[];
                waits: {
                    node_key: string;
                    /** @enum {unknown} */
                    kind: "timer" | "event";
                    status: string;
                    resume_at: string;
                }[];
            };
            meta: {
                correlation_id: string;
            };
        };
        "chatflow-create": {
            key: string;
            name: string;
        };
        "chatflow-version-create": {
            graph: {
                entry_node: string;
                nodes: ({
                    key: string;
                    /** @constant */
                    type: "send_prompt";
                    config: {
                        text: string;
                        variable_refs: ("service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission")[];
                    };
                    next: string;
                } | {
                    key: string;
                    /** @constant */
                    type: "collect";
                    config: {
                        /** @constant */
                        variable_key: "service_interest";
                        /** @constant */
                        value_type: "string";
                        /** @constant */
                        required: true;
                        prompt: string;
                    } | {
                        /** @constant */
                        variable_key: "need_summary";
                        /** @constant */
                        value_type: "string";
                        /** @constant */
                        required: true;
                        prompt: string;
                    } | {
                        /** @constant */
                        variable_key: "preferred_contact_method";
                        /** @constant */
                        value_type: "enum";
                        /** @constant */
                        required: true;
                        prompt: string;
                        choices: ("messenger" | "phone")[];
                    } | {
                        /** @constant */
                        variable_key: "phone";
                        /** @constant */
                        value_type: "string";
                        required: boolean;
                        prompt: string;
                    } | {
                        /** @constant */
                        variable_key: "contact_permission";
                        /** @constant */
                        value_type: "boolean";
                        /** @constant */
                        required: true;
                        prompt: string;
                    };
                    next: string;
                } | {
                    key: string;
                    /** @constant */
                    type: "invoke_agent";
                    config: {
                        /** @enum {unknown} */
                        instruction: "ask_need" | "ask_contact_method" | "confirm_contact_permission";
                        allowed_tools: ("crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human")[];
                    };
                    next: string;
                } | {
                    key: string;
                    /** @constant */
                    type: "validate_qualification";
                    config: {
                        on_valid: string;
                        on_invalid: string;
                    };
                } | {
                    key: string;
                    /** @constant */
                    type: "upsert_lead";
                    config: Record<string, never>;
                    next: string;
                } | {
                    key: string;
                    /** @constant */
                    type: "request_human";
                    config: {
                        /** @enum {unknown} */
                        reason: "request_human" | "invalid_answers" | "qualification_incomplete";
                        /** Format: uuid */
                        target_chat_team: string;
                    };
                    next: string;
                } | {
                    key: string;
                    /** @constant */
                    type: "end";
                    config: {
                        /** @enum {unknown} */
                        outcome: "qualified" | "disqualified" | "needs_attention";
                    };
                })[];
            };
        };
        "chatflow-publish": Record<string, never>;
        "chatflow-complete": {
            qualification: {
                service_interest: string;
                need_summary: string;
                /** @enum {unknown} */
                preferred_contact_method: "messenger" | "phone";
                phone?: string | null;
                contact_permission: boolean;
            };
            /** Format: uuid */
            consent_message_id: string;
            owner_revision: string;
        };
        "chatflow-session": {
            data: {
                /** Format: uuid */
                id: string;
                version: string;
                /** Format: uuid */
                version_id: string;
                /** Format: uuid */
                parent_run_id: string;
                /** Format: uuid */
                conversation_id: string;
                /** @enum {unknown} */
                status: "running" | "waiting_message" | "paused_human" | "completed" | "failed" | "cancelled";
                node_key: string;
                owner_revision: string;
                /** @enum {unknown} */
                outcome: "qualified" | "disqualified" | "needs_attention" | null;
                error_code: string | null;
                lead_id: string | null;
                draft: {
                    service_interest?: string;
                    need_summary?: string;
                    /** @enum {unknown} */
                    preferred_contact_method?: "messenger" | "phone";
                    phone?: string | null;
                };
                variables: {
                    service_interest?: string;
                    need_summary?: string;
                    /** @enum {unknown} */
                    preferred_contact_method?: "messenger" | "phone";
                    phone?: string | null;
                    contact_permission?: boolean;
                };
                provenance: {
                    service_interest?: {
                        /** @constant */
                        kind: "message";
                        /** Format: uuid */
                        message_id: string;
                        node_key: string;
                    } | {
                        /** @constant */
                        kind: "human";
                        /** Format: uuid */
                        principal_id: string;
                    };
                    need_summary?: {
                        /** @constant */
                        kind: "message";
                        /** Format: uuid */
                        message_id: string;
                        node_key: string;
                    } | {
                        /** @constant */
                        kind: "human";
                        /** Format: uuid */
                        principal_id: string;
                    };
                    preferred_contact_method?: {
                        /** @constant */
                        kind: "message";
                        /** Format: uuid */
                        message_id: string;
                        node_key: string;
                    } | {
                        /** @constant */
                        kind: "human";
                        /** Format: uuid */
                        principal_id: string;
                    };
                    phone?: {
                        /** @constant */
                        kind: "message";
                        /** Format: uuid */
                        message_id: string;
                        node_key: string;
                    } | {
                        /** @constant */
                        kind: "human";
                        /** Format: uuid */
                        principal_id: string;
                    };
                    contact_permission?: {
                        /** @constant */
                        kind: "message";
                        /** Format: uuid */
                        message_id: string;
                        node_key: string;
                    } | {
                        /** @constant */
                        kind: "human";
                        /** Format: uuid */
                        principal_id: string;
                    };
                };
                can_complete: boolean;
                nodes: {
                    node_key: string;
                    /** @enum {unknown} */
                    status: "pending" | "running" | "waiting" | "succeeded" | "cancelled";
                    invalid_attempts: number;
                }[];
                turns: {
                    /** Format: uuid */
                    message_id: string;
                    node_key: string;
                    /** @enum {unknown} */
                    status: "validated" | "invalid" | "runtime";
                }[];
            } | null;
            meta: {
                correlation_id: string;
            };
        };
        "chatflow-mutation": {
            data: {
                /** Format: uuid */
                id: string;
                version?: string;
                number?: number;
                /** @enum {unknown} */
                state?: "draft";
                /** @enum {unknown} */
                status?: "running" | "waiting_message" | "paused_human" | "completed" | "failed" | "cancelled";
                /** @enum {unknown} */
                outcome?: "qualified" | "disqualified" | "needs_attention" | null;
                lead_id?: string | null;
            };
            meta: {
                correlation_id: string;
            };
        };
        "chatflow-list": {
            data: {
                /** Format: uuid */
                id: string;
                key: string;
                name: string;
                active_version_id: string | null;
                version: string;
            }[];
            meta: {
                correlation_id: string;
            };
        };
        "chatflow-versions": {
            data: {
                /** Format: uuid */
                id: string;
                number: number;
                /** @enum {unknown} */
                state: "draft" | "published";
                graph: {
                    entry_node: string;
                    nodes: ({
                        key: string;
                        /** @constant */
                        type: "send_prompt";
                        config: {
                            text: string;
                            variable_refs: ("service_interest" | "need_summary" | "preferred_contact_method" | "phone" | "contact_permission")[];
                        };
                        next: string;
                    } | {
                        key: string;
                        /** @constant */
                        type: "collect";
                        config: {
                            /** @constant */
                            variable_key: "service_interest";
                            /** @constant */
                            value_type: "string";
                            /** @constant */
                            required: true;
                            prompt: string;
                        } | {
                            /** @constant */
                            variable_key: "need_summary";
                            /** @constant */
                            value_type: "string";
                            /** @constant */
                            required: true;
                            prompt: string;
                        } | {
                            /** @constant */
                            variable_key: "preferred_contact_method";
                            /** @constant */
                            value_type: "enum";
                            /** @constant */
                            required: true;
                            prompt: string;
                            choices: ("messenger" | "phone")[];
                        } | {
                            /** @constant */
                            variable_key: "phone";
                            /** @constant */
                            value_type: "string";
                            required: boolean;
                            prompt: string;
                        } | {
                            /** @constant */
                            variable_key: "contact_permission";
                            /** @constant */
                            value_type: "boolean";
                            /** @constant */
                            required: true;
                            prompt: string;
                        };
                        next: string;
                    } | {
                        key: string;
                        /** @constant */
                        type: "invoke_agent";
                        config: {
                            /** @enum {unknown} */
                            instruction: "ask_need" | "ask_contact_method" | "confirm_contact_permission";
                            allowed_tools: ("crm.read_contact" | "qualification.save" | "conversation.propose_reply" | "routing.request_human")[];
                        };
                        next: string;
                    } | {
                        key: string;
                        /** @constant */
                        type: "validate_qualification";
                        config: {
                            on_valid: string;
                            on_invalid: string;
                        };
                    } | {
                        key: string;
                        /** @constant */
                        type: "upsert_lead";
                        config: Record<string, never>;
                        next: string;
                    } | {
                        key: string;
                        /** @constant */
                        type: "request_human";
                        config: {
                            /** @enum {unknown} */
                            reason: "request_human" | "invalid_answers" | "qualification_incomplete";
                            /** Format: uuid */
                            target_chat_team: string;
                        };
                        next: string;
                    } | {
                        key: string;
                        /** @constant */
                        type: "end";
                        config: {
                            /** @enum {unknown} */
                            outcome: "qualified" | "disqualified" | "needs_attention";
                        };
                    })[];
                };
            }[];
            meta: {
                correlation_id: string;
            };
        };
        "sales-handoff-request": {
            /** Format: uuid */
            target_team_id: string;
        };
        "sales-handoff-accept": {
            owner_revision: string;
        };
        "sales-handoff-data": {
            /** Format: uuid */
            id: string;
            version: string;
            owner_revision: string;
            owner_principal_id: string | null;
            /** Format: uuid */
            team_id: string;
            /** Format: uuid */
            handoff_id: string;
            /** @enum {unknown} */
            status: "pending" | "accepted" | "cancelled";
            /** Format: date-time */
            due_at: string;
            /** Format: date-time */
            accepted_at: string | null;
            attention: boolean;
        };
        "sales-handoff-response": {
            data: components["schemas"]["sales-handoff-data"];
            meta: {
                correlation_id: string;
            };
        };
        "sales-handoff-list": {
            data: components["schemas"]["sales-handoff-data"][];
            meta: {
                correlation_id: string;
            };
        };
        "m2-sales-detail": {
            data: {
                record: {
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    tenant_id: string;
                    object_key: string;
                    version: string;
                    owner_revision: string;
                    owner_principal_id: string | null;
                    team_id: string | null;
                    archived: boolean;
                    fields: {
                        [key: string]: unknown;
                    };
                    custom_values: {
                        [key: string]: unknown;
                    };
                };
                handoff: {
                    /** Format: uuid */
                    id: string;
                    /** @enum {unknown} */
                    status: "pending" | "accepted" | "cancelled";
                    /** Format: date-time */
                    due_at: string;
                    accepted_at: string | null;
                    attention: boolean;
                } | null;
                /** @enum {unknown} */
                source: "ctm" | "unknown" | null;
                can_accept: boolean;
                contact: {
                    /** Format: uuid */
                    id: string;
                    label: string;
                } | null;
                conversation_id: string | null;
            };
            meta: {
                correlation_id: string;
            };
        };
        "m2-sales-list": {
            data: {
                record: {
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    tenant_id: string;
                    object_key: string;
                    version: string;
                    owner_revision: string;
                    owner_principal_id: string | null;
                    team_id: string | null;
                    archived: boolean;
                    fields: {
                        [key: string]: unknown;
                    };
                    custom_values: {
                        [key: string]: unknown;
                    };
                };
                handoff: {
                    /** Format: uuid */
                    id: string;
                    /** @enum {unknown} */
                    status: "pending" | "accepted" | "cancelled";
                    /** Format: date-time */
                    due_at: string;
                    accepted_at: string | null;
                    attention: boolean;
                } | null;
                /** @enum {unknown} */
                source: "ctm" | "unknown" | null;
                can_accept: boolean;
                contact: {
                    /** Format: uuid */
                    id: string;
                    label: string;
                } | null;
                conversation_id: string | null;
            }[];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "m2-deliveries-list": {
            data: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                connection_id: string;
                /** @constant */
                status: "failed";
                attempts: number;
                error_code: string | null;
                next_attempt_at: string | null;
                /** Format: date-time */
                received_at: string;
                can_retry: boolean;
            }[];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "m2-runs-list": {
            data: {
                /** Format: uuid */
                id: string;
                status: string;
                current_node: string;
                attention: boolean;
                /** Format: date-time */
                started_at: string;
                /** Format: uuid */
                conversation_id: string;
            }[];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "m2-retry": {
            /** @constant */
            reason: "operator_retry";
        };
        "m2-agents-list": {
            data: {
                /** Format: uuid */
                id: string;
                status: string;
                attention: boolean;
                /** Format: uuid */
                conversation_id: string;
                /** Format: date-time */
                created_at: string;
                error_code: string | null;
            }[];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "contact-mapping": {
            /** Format: uuid */
            tenant_id: string;
            /** Format: uuid */
            connection_id: string;
            external_subject_id: string;
            /** Format: uuid */
            crm_contact_id: string;
            /** Format: uuid */
            crm_identity_id: string;
            /** @constant */
            mapping_revision: "1";
        };
        "contact-lookup-request": {
            external_subject_id: string;
        };
        "contact-resolve-request": {
            external_subject_id: string;
            /** Format: uuid */
            operation_id: string;
            display_label?: string;
        };
        "contact-lookup-response": {
            data: {
                mapping: {
                    /** Format: uuid */
                    tenant_id: string;
                    /** Format: uuid */
                    connection_id: string;
                    external_subject_id: string;
                    /** Format: uuid */
                    crm_contact_id: string;
                    /** Format: uuid */
                    crm_identity_id: string;
                    /** @constant */
                    mapping_revision: "1";
                } | null;
            };
            meta: {
                correlation_id: string;
            };
        };
        "contact-resolve-response": {
            data: {
                mapping: {
                    /** Format: uuid */
                    tenant_id: string;
                    /** Format: uuid */
                    connection_id: string;
                    external_subject_id: string;
                    /** Format: uuid */
                    crm_contact_id: string;
                    /** Format: uuid */
                    crm_identity_id: string;
                    /** @constant */
                    mapping_revision: "1";
                };
                created: boolean;
            };
            meta: {
                correlation_id: string;
            };
        };
        "contact-delivery-request": {
            /** Format: uuid */
            crm_contact_id: string;
            /** Format: uuid */
            crm_identity_id: string;
            intake: {
                provider_event_id: string;
                provider_message_id: string;
                external_subject_id: string;
                /** Format: date-time */
                occurred_at: string;
                display_label?: string;
                message: {
                    /** @constant */
                    type: "text";
                    text: string;
                } | {
                    /** @constant */
                    type: "rich";
                    content: {
                        /** @constant */
                        version: 1;
                        /** @constant */
                        message_type: "text";
                        text: string;
                        reply_to: {
                            external_msg_id: string;
                        } | null;
                        attachment: null;
                    } | {
                        /** @constant */
                        version: 1;
                        /** @constant */
                        message_type: "media";
                        text: string | null;
                        reply_to: {
                            external_msg_id: string;
                        } | null;
                        attachment: {
                            /** @constant */
                            version: 1;
                            /** @constant */
                            kind: "media";
                            items: {
                                /** @enum {unknown} */
                                media_type: "image" | "audio" | "video" | "file";
                                external_media_id: string;
                                name: string | null;
                            }[];
                        };
                        /** @enum {unknown} */
                        text_source?: "extracted" | "preview";
                    } | {
                        /** @constant */
                        version: 1;
                        /** @constant */
                        message_type: "template";
                        text: string | null;
                        reply_to: {
                            external_msg_id: string;
                        } | null;
                        attachment: {
                            /** @constant */
                            version: 1;
                            /** @constant */
                            kind: "gallery";
                            cards: {
                                title: string;
                                subtitle: string | null;
                                buttons: {
                                    label: string;
                                }[];
                            }[];
                        } | {
                            /** @constant */
                            version: 1;
                            /** @constant */
                            kind: "csat";
                            title: string;
                            prompt: string;
                        };
                        /** @enum {unknown} */
                        text_source?: "extracted" | "preview";
                    } | {
                        /** @constant */
                        version: 1;
                        /** @constant */
                        message_type: "unsupported";
                        text: string | null;
                        reply_to: {
                            external_msg_id: string;
                        } | null;
                        attachment: {
                            /** @constant */
                            version: 1;
                            /** @constant */
                            kind: "unsupported";
                            label: string;
                        };
                        /** @enum {unknown} */
                        text_source?: "extracted" | "preview";
                    };
                };
                referral?: {
                    /** @constant */
                    source: "ctm";
                    ad_id?: string | null;
                    campaign_id?: string | null;
                };
            };
        };
        "contact-send-request": {
            /** Format: uuid */
            crm_contact_id: string;
            owner_revision: string;
            text: string;
        };
        "facebook-connect-request": {
            /** Format: uuid */
            team_id: string;
        };
        "facebook-connect-response": {
            data: {
                /** Format: uri */
                authorization_url: string;
            };
            meta: {
                correlation_id: string;
            };
        };
        "facebook-page": {
            /** Format: uuid */
            id: string;
            /** @constant */
            channel: "messenger";
            /** Format: uuid */
            channel_id: string;
            page_id: string;
            app_id: string;
            name: string;
            /** Format: uuid */
            team_id: string;
            /** @enum {unknown} */
            credential_status: "stored" | "missing";
            version: string;
            /** Format: date-time */
            connected_at: string;
        };
        "facebook-page-list": {
            data: {
                /** Format: uuid */
                id: string;
                /** @constant */
                channel: "messenger";
                /** Format: uuid */
                channel_id: string;
                page_id: string;
                app_id: string;
                name: string;
                /** Format: uuid */
                team_id: string;
                /** @enum {unknown} */
                credential_status: "stored" | "missing";
                version: string;
                /** Format: date-time */
                connected_at: string;
            }[];
            next_cursor: string | null;
            oauth_configured: boolean;
            meta: {
                correlation_id: string;
            };
        };
        "conversation-channel-options": {
            data: {
                /** Format: uuid */
                id: string;
                /** @enum {unknown} */
                channel: "messenger" | "mock_messenger";
                /** Format: uuid */
                channel_id: string;
                page_id: string;
                channel_name: string;
            }[];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
            };
        };
        "workspace-capabilities": {
            data: {
                /** @constant */
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
                /** Format: date-time */
                as_of?: string;
            };
        };
        "workspace-read-state": {
            /** Format: uuid */
            conversation_id: string;
            last_read_inbound_seq: string;
            latest_inbound_seq: string;
            unread_message_count: string;
            read_state_revision: string;
        };
        "workspace-read-response": {
            data: components["schemas"]["workspace-read-state"];
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
            };
        };
        "workspace-mark-read": {
            through_inbound_seq: string;
        };
        "workspace-item": {
            conversation: components["schemas"]["conversation-entity"];
            latest_inbound_seq: string;
            read_state: {
                last_read_inbound_seq: string;
                unread_message_count: string;
            };
            snooze: null;
            tags?: {
                /** Format: uuid */
                id: string;
                name: string;
                color: string;
                archived?: boolean;
            }[];
            /** Format: date-time */
            last_message_at: string;
            waiting_since: string | null;
            waiting_seconds: number | null;
            /** @enum {unknown} */
            waiting_metric_state: "ready" | "unavailable";
            workspace_allowed_actions: ("mark_read" | "tags")[];
        };
        "workspace-list": {
            data: components["schemas"]["workspace-item"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of: string;
                conversation_count: string;
                unread_conversation_count: string;
                waiting_conversation_count: string | null;
                /** @enum {unknown} */
                waiting_metric_coverage: "partial" | "complete";
                /** @constant */
                metrics_state: "ready";
            };
        };
        "workspace-sidebar": {
            data: {
                scopes: {
                    key: string;
                    /** Format: uuid */
                    team_id?: string;
                    /** Format: date-time */
                    as_of: string;
                    conversation_count: string;
                    unread_conversation_count: string;
                    waiting_conversation_count: string | null;
                    /** @enum {unknown} */
                    waiting_metric_coverage: "partial" | "complete";
                    /** @constant */
                    metrics_state: "ready";
                }[];
                inboxes: {
                    /** Format: uuid */
                    id: string;
                    name: string;
                    /** Format: uuid */
                    creator_principal_id: string;
                    shared: boolean;
                    version: string;
                    conversation_count: string;
                    unread_conversation_count: string;
                }[];
                /** @constant */
                metrics_state: "ready";
            };
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
            };
        };
        "workspace-read-event": {
            /** Format: uuid */
            conversation_id: string;
            /** Format: uuid */
            principal_id: string;
            through_inbound_seq: string;
            read_state_revision: string;
        };
        "catalog-predicate": {
            /** @enum {unknown} */
            scope: "all" | "mine" | "unassigned" | "team";
            /** Format: uuid */
            team_id?: string;
            status: ("open" | "pending" | "closed")[];
            /** @enum {unknown} */
            snooze: "exclude" | "include" | "only";
            /** @enum {unknown} */
            unread: "any" | "only";
            /** @enum {unknown} */
            channel?: "messenger" | "mock_messenger";
            /** Format: uuid */
            channel_id?: string;
            tag_ids?: string[];
        };
        "catalog-predicate-input": {
            /** @enum {unknown} */
            scope?: "all" | "mine" | "unassigned" | "team";
            /** Format: uuid */
            team_id?: string;
            status?: ("open" | "pending" | "closed")[];
            /** @enum {unknown} */
            snooze?: "exclude" | "include" | "only";
            /** @enum {unknown} */
            unread?: "any" | "only";
            /** @enum {unknown} */
            channel?: "messenger" | "mock_messenger";
            /** Format: uuid */
            channel_id?: string;
            tag_ids?: string[];
        };
        "catalog-tag-create": {
            name: string;
            /** @enum {unknown} */
            color: "gray" | "blue" | "green" | "amber" | "red" | "purple";
        };
        "catalog-tag-patch": {
            name?: string;
            /** @enum {unknown} */
            color?: "gray" | "blue" | "green" | "amber" | "red" | "purple";
        };
        "catalog-tag": {
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {unknown} */
            color: "gray" | "blue" | "green" | "amber" | "red" | "purple";
            version: string;
            archived: boolean;
            allowed_actions: string[];
        };
        "catalog-snippet-create": {
            title: string;
            shortcut: string;
            text: string;
        };
        "catalog-snippet-patch": {
            title?: string;
            shortcut?: string;
            text?: string;
        };
        "catalog-snippet": {
            /** Format: uuid */
            id: string;
            title: string;
            shortcut: string;
            text: string;
            version: string;
            archived: boolean;
            allowed_actions: string[];
        };
        "catalog-inbox-create": {
            name: string;
            /** @constant */
            predicate_schema_version: 1;
            predicate: components["schemas"]["catalog-predicate-input"];
            /** @enum {unknown} */
            sort: "latest_message_desc" | "latest_message_asc" | "waiting_longest";
            shares: {
                /** @enum {unknown} */
                kind: "principal" | "team";
                /** Format: uuid */
                id: string;
            }[];
        };
        "catalog-inbox-patch": {
            name?: string;
            /** @constant */
            predicate_schema_version?: 1;
            predicate?: components["schemas"]["catalog-predicate-input"];
            /** @enum {unknown} */
            sort?: "latest_message_desc" | "latest_message_asc" | "waiting_longest";
            /** Format: uuid */
            creator_principal_id?: string;
        };
        "catalog-inbox-shares": {
            shares: {
                /** @enum {unknown} */
                kind: "principal" | "team";
                /** Format: uuid */
                id: string;
            }[];
        };
        "catalog-inbox": {
            /** Format: uuid */
            id: string;
            name: string;
            /** Format: uuid */
            creator_principal_id: string;
            /** @constant */
            predicate_schema_version: 1;
            predicate: components["schemas"]["catalog-predicate"];
            /** @enum {unknown} */
            sort: "latest_message_desc" | "latest_message_asc" | "waiting_longest";
            version: string;
            archived: boolean;
            shared: boolean;
            shares?: {
                /** @enum {unknown} */
                kind: "principal" | "team";
                /** Format: uuid */
                id: string;
            }[];
            allowed_actions: string[];
        };
        "catalog-archive": {
            data: {
                /** Format: uuid */
                id: string;
                /** @constant */
                archived: true;
            };
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
                allowed_actions?: string[];
            };
        };
        "catalog-tag-links": {
            data: {
                /** Format: uuid */
                conversation_id: string;
                tag_ids: string[];
                tag_set_revision: string;
                version: string;
            };
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
                allowed_actions?: string[];
            };
        };
        "catalog-empty": Record<string, never>;
        "catalog-tag-response": {
            data: components["schemas"]["catalog-tag"];
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
                allowed_actions?: string[];
            };
        };
        "catalog-tag-list": {
            data: components["schemas"]["catalog-tag"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
                allowed_actions?: string[];
            };
        };
        "catalog-snippet-response": {
            data: components["schemas"]["catalog-snippet"];
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
                allowed_actions?: string[];
            };
        };
        "catalog-snippet-list": {
            data: components["schemas"]["catalog-snippet"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
                allowed_actions?: string[];
            };
        };
        "catalog-inbox-response": {
            data: components["schemas"]["catalog-inbox"];
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
                allowed_actions?: string[];
            };
        };
        "catalog-inbox-list": {
            data: components["schemas"]["catalog-inbox"][];
            next_cursor: string | null;
            meta: {
                correlation_id: string;
                /** Format: date-time */
                as_of?: string;
                allowed_actions?: string[];
            };
        };
        "catalog-inbox-event": {
            /** Format: uuid */
            inbox_id: string;
            /** @enum {unknown} */
            operation: "created" | "updated" | "shared" | "archived" | "transferred";
        };
        "catalog-snippet-event": {
            /** Format: uuid */
            snippet_id: string;
            /** @enum {unknown} */
            operation: "created" | "updated" | "archived";
        };
        "catalog-tag-event": {
            /** Format: uuid */
            tag_id: string;
            /** @enum {unknown} */
            operation: "created" | "updated" | "archived";
        };
        "catalog-tag-link-event": {
            /** Format: uuid */
            conversation_id: string;
            /** Format: uuid */
            tag_id: string;
            /** @enum {unknown} */
            operation: "attached" | "detached";
            tag_set_revision: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getLiveness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Process alive */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        status: "ok";
                        /** @enum {unknown} */
                        service: "api" | "worker";
                    };
                };
            };
        };
    };
    getReadiness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Infrastructure connected; business schema not yet implemented */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
            /** @description Infrastructure unavailable or not configured */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    getAuthSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Current session */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthSessionResponse"];
                };
            };
            /** @description Sanitized auth failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    getAuthCsrf: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Current session */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthCsrfResponse"];
                };
            };
            /** @description Sanitized auth failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    login: {
        parameters: {
            query?: {
                /** @description Safe same-origin path only */
                return_to?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OIDC authorization redirect; HttpOnly login cookie */
            302: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sanitized auth failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    callback: {
        parameters: {
            query?: {
                code?: string;
                state?: string;
                error?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Session rotated; redirect to validated return_to */
            303: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sanitized auth failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    logout: {
        parameters: {
            query?: never;
            header: {
                Origin: string;
                "X-CSRF-Token": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Local session revoked; cookie cleared */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Sanitized auth failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized auth failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "list-memberships": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                status?: "invited" | "active" | "suspended";
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized collection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["memberships-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "create-memberships": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["memberships-create"];
            };
        };
        responses: {
            /** @description Created atomically */
            201: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["memberships-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "patch-memberships": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["memberships-patch"];
            };
        };
        responses: {
            /** @description Updated atomically */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["memberships-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "list-teams": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized collection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["teams-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "create-teams": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["teams-create"];
            };
        };
        responses: {
            /** @description Created atomically */
            201: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["teams-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "patch-teams": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["teams-patch"];
            };
        };
        responses: {
            /** @description Updated atomically */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["teams-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "list-roles": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized collection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["roles-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "create-roles": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["roles-create"];
            };
        };
        responses: {
            /** @description Created atomically */
            201: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["roles-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "patch-roles": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["roles-patch"];
            };
        };
        responses: {
            /** @description Updated atomically */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["roles-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "list-ai-agents": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized collection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ai-agents-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "create-ai-agents": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ai-agents-create"];
            };
        };
        responses: {
            /** @description Created atomically */
            201: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ai-agents-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "patch-ai-agents": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ai-agents-patch"];
            };
        };
        responses: {
            /** @description Updated atomically */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ai-agents-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "patch-principals": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["principals-patch"];
            };
        };
        responses: {
            /** @description Updated atomically */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["principals-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    listMyMemberships: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Active memberships of session account */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["my-membership-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "registry-list-object": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized collection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["registry-object-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "registry-create-object": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["registry-object-create"];
            };
        };
        responses: {
            /** @description Created atomically */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["registry-object-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "registry-list-type": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized collection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["registry-type-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "registry-create-type": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["registry-type-create"];
            };
        };
        responses: {
            /** @description Created atomically */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["registry-type-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "registry-create-association": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                /** @description Source record version */
                "If-Match": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["registry-association-create"];
            };
        };
        responses: {
            /** @description Created atomically */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["registry-association-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "registry-list-association": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized collection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["registry-association-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-crm-context": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-context-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-objects-key-descriptor": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-descriptor-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-leads": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                /** @description JSON encoded typed query */
                filter?: string;
                /** @description JSON encoded typed query */
                sort?: string;
                /** @description JSON encoded typed query */
                owner?: string;
                /** @description JSON encoded typed query */
                team?: string;
                /** @description JSON encoded typed query */
                status?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-post-leads": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-lead-create"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-leads-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-post-leads-id-qualification": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-lead-qualify"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-post-leads-id-disqualify": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-lead-disqualify"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-object-types-key-properties": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-property-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-post-object-types-key-properties": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-property-create"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-property-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-patch-object-types-key-properties-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                key: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-property-patch"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-property-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-object-types-key-forms-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                key: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-form-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-put-object-types-key-forms-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match"?: string;
            };
            path: {
                key: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-form-put"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-form-response"];
                };
            };
            /** @description Authorized CRM result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-form-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-object-types-key-views-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                key: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-view-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-put-object-types-key-views-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match"?: string;
            };
            path: {
                key: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-view-put"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-view-response"];
                };
            };
            /** @description Authorized CRM result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-view-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-objects-key-records": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                /** @description JSON encoded typed query */
                filter?: string;
                /** @description JSON encoded typed query */
                sort?: string;
                /** @description JSON encoded typed query */
                owner?: string;
                /** @description JSON encoded typed query */
                team?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-post-objects-key-records": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-record-create"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-get-objects-key-records-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                key: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-patch-objects-key-records-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                key: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-record-patch"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "crm-post-objects-key-records-id-archive": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                key: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["crm-archive"];
            };
        };
        responses: {
            /** @description Authorized CRM result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["crm-record-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-get-conversations": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                state?: string;
                owner?: string;
                team?: string;
                channel?: "messenger" | "mock_messenger";
                channel_id?: string;
                page_id?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Conversation result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-get-conversations-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Conversation result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-get-conversations-id-messages": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Conversation result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-timeline"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-post-conversations-id-messages": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["conversation-send"];
            };
        };
        responses: {
            /** @description Authorized Conversation result */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-send-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-get-conversations-id-message-envelopes": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Conversation result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-envelope-timeline"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-get-conversations-id-message-envelopes-v3": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Conversation result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-rich-timeline"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-get-conversations-id-outbound-intents-intentId": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
                intentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Conversation result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-intent-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-get-conversations-id-notes": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Conversation result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-notes"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-post-conversations-id-notes": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["conversation-note"];
            };
        };
        responses: {
            /** @description Authorized Conversation result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-note-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-post-conversations-id-transition": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["conversation-transition"];
            };
        };
        responses: {
            /** @description Authorized Conversation result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "intake-request": {
        parameters: {
            query?: never;
            header: {
                "X-Connection-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["intake-request"];
            };
        };
        responses: {
            /** @description Durable mock intake result; no raw payload */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["intake-ack"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "intake-status": {
        parameters: {
            query?: never;
            header?: {
                "X-Connection-Id"?: string;
                "X-Tenant-Id"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Durable mock intake result; no raw payload */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["intake-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "intake-retry": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["intake-retry"];
            };
        };
        responses: {
            /** @description Durable mock intake result; no raw payload */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["intake-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "intake-binding": {
        parameters: {
            query?: never;
            header: {
                "X-Connection-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authenticated immutable tenant binding */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["intake-binding"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "connector-ack": {
        parameters: {
            query?: never;
            header: {
                "X-Connection-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["intake-request"];
            };
        };
        responses: {
            /** @description Independent durable Connector ingress; sanitized errors follow connector-bridge contract */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-ack"];
                };
            };
            /** @description Sanitized Connector failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
        };
    };
    "connector-response": {
        parameters: {
            query?: never;
            header: {
                "X-Connection-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Independent durable Connector ingress; sanitized errors follow connector-bridge contract */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-response"];
                };
            };
            /** @description Sanitized Connector failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
            /** @description Sanitized Connector failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["connector-error"];
                };
            };
        };
    };
    "routing-assignment": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["routing-assignment"];
            };
        };
        responses: {
            /** @description Authorized ownership result */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["routing-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "routing-takeover": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["routing-takeover"];
            };
        };
        responses: {
            /** @description Authorized ownership result */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["routing-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "routing-targets": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized ownership result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["routing-targets"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "routing-history": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized ownership result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["routing-history"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "messenger-challenge": {
        parameters: {
            query: {
                "hub.mode": string;
                "hub.verify_token": string;
                "hub.challenge": string;
            };
            header?: never;
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Exact verification challenge */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Sanitized webhook error; parser failures may use the standard JSON error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Sanitized webhook error; parser failures may use the standard JSON error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Sanitized webhook error; parser failures may use the standard JSON error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Sanitized webhook error; parser failures may use the standard JSON error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
        };
    };
    "messenger-capture": {
        parameters: {
            query?: never;
            header: {
                "X-Hub-Signature-256": string;
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["messenger-webhook"];
            };
        };
        responses: {
            /** @description Atomic durable capture committed */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": "EVENT_RECEIVED";
                };
            };
            /** @description Sanitized webhook error; parser failures may use the standard JSON error envelope */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Sanitized webhook error; parser failures may use the standard JSON error envelope */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Sanitized webhook error; parser failures may use the standard JSON error envelope */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Sanitized webhook error; parser failures may use the standard JSON error envelope */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
        };
    };
    "workflow-get-workflows": {
        parameters: {
            query?: {
                limit?: number;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workflow-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workflow-post-workflows": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["workflow-create"];
            };
        };
        responses: {
            /** @description Authorized workflow result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workflow-patch-workflows-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["workflow-enable"];
            };
        };
        responses: {
            /** @description Authorized workflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workflow-get-workflows-id-versions": {
        parameters: {
            query?: {
                limit?: number;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workflow-versions"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workflow-post-workflows-id-versions": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["workflow-version-create"];
            };
        };
        responses: {
            /** @description Authorized workflow result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workflow-post-workflows-id-versions-version-publish": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
                version: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["workflow-publish"];
            };
        };
        responses: {
            /** @description Authorized workflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workflow-get-workflow-runs-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workflow-run"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workflow-post-workflow-runs-id-cancel": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["workflow-cancel"];
            };
        };
        responses: {
            /** @description Authorized workflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "chatflow-get-chatflows": {
        parameters: {
            query?: {
                limit?: number;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Chatflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["chatflow-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "chatflow-post-chatflows": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["chatflow-create"];
            };
        };
        responses: {
            /** @description Authorized Chatflow result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["chatflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "chatflow-get-chatflows-id-versions": {
        parameters: {
            query?: {
                limit?: number;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Chatflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["chatflow-versions"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "chatflow-post-chatflows-id-versions": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["chatflow-version-create"];
            };
        };
        responses: {
            /** @description Authorized Chatflow result */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["chatflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "chatflow-post-chatflows-id-versions-version-publish": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
                version: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["chatflow-publish"];
            };
        };
        responses: {
            /** @description Authorized Chatflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["chatflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "chatflow-get-chatflow-sessions-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Chatflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["chatflow-session"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "chatflow-get-conversations-id-chatflow-session": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Chatflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["chatflow-session"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "chatflow-post-chatflow-sessions-id-complete-qualification": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["chatflow-complete"];
            };
        };
        responses: {
            /** @description Authorized Chatflow result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["chatflow-mutation"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "sales-handoff-list": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized Sales result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["sales-handoff-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "sales-handoff-request": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["sales-handoff-request"];
            };
        };
        responses: {
            /** @description Authorized Sales result */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["sales-handoff-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "sales-handoff-accept": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
                handoffId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["sales-handoff-accept"];
            };
        };
        responses: {
            /** @description Authorized Sales result */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["sales-handoff-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "m2-sales-leads": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                status?: string;
                owner?: string;
                team?: string;
                source?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace projection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["m2-sales-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "m2-sales-leads-id": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace projection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["m2-sales-detail"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "m2-operations-failed-deliveries": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace projection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["m2-deliveries-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "m2-operations-workflow-runs": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace projection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["m2-runs-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "m2-operations-agent-executions": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace projection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["m2-agents-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "m2-delivery-retry": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["m2-retry"];
            };
        };
        responses: {
            /** @description Scheduled same delivery */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["intake-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "contact-lookup-request": {
        parameters: {
            query?: never;
            header: {
                "X-Connection-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["contact-lookup-request"];
            };
        };
        responses: {
            /** @description Authorized contact-bound result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["contact-lookup-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "contact-resolve-request": {
        parameters: {
            query?: never;
            header: {
                "X-Connection-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["contact-resolve-request"];
            };
        };
        responses: {
            /** @description Authorized contact-bound result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["contact-resolve-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "contact-delivery-request": {
        parameters: {
            query?: never;
            header: {
                "X-Connection-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["contact-delivery-request"];
            };
        };
        responses: {
            /** @description Authorized contact-bound result */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["intake-ack"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "contact-bound-send": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["contact-send-request"];
            };
        };
        responses: {
            /** @description Authorized Conversation result */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-send-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "admin-channels-facebook-pages": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized channel projection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["facebook-page-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "conversation-channels": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized channel projection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["conversation-channel-options"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "facebook-connect": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["facebook-connect-request"];
            };
        };
        responses: {
            /** @description One-use Facebook authorization URL */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["facebook-connect-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "facebook-callback": {
        parameters: {
            query: {
                state: string;
                code?: string;
                error?: string;
                error_reason?: string;
                error_description?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Fixed UI redirect with sanitized result; never tokens or provider error */
            303: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    "workspace-capabilities": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workspace-capabilities"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workspace-sidebar": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workspace-sidebar"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workspace-conversations": {
        parameters: {
            query?: {
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
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workspace-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workspace-conversations-id-read-state": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized workspace result */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workspace-read-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "workspace-mark-read": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["workspace-mark-read"];
            };
        };
        responses: {
            /** @description Monotonic read marker */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["workspace-read-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-list-inboxes": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                group?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized catalog */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-inbox-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-create-inbox": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-inbox-create"];
            };
        };
        responses: {
            /** @description Created catalog resource */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-inbox-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-get-inbox": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized catalog resource */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-inbox-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-delete-inbox": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-empty"];
            };
        };
        responses: {
            /** @description Versioned catalog mutation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-archive"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-patch-inbox": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-inbox-patch"];
            };
        };
        responses: {
            /** @description Versioned catalog mutation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-inbox-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-list-tags": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                q?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized catalog */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-tag-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-create-tag": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-tag-create"];
            };
        };
        responses: {
            /** @description Created catalog resource */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-tag-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-get-tag": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized catalog resource */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-tag-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-delete-tag": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-empty"];
            };
        };
        responses: {
            /** @description Versioned catalog mutation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-archive"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-patch-tag": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-tag-patch"];
            };
        };
        responses: {
            /** @description Versioned catalog mutation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-tag-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-list-snippets": {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
                q?: string;
            };
            header: {
                "X-Tenant-Id": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized catalog */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-snippet-list"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-create-snippet": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-snippet-create"];
            };
        };
        responses: {
            /** @description Created catalog resource */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-snippet-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-get-snippet": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Authorized catalog resource */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-snippet-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-delete-snippet": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-empty"];
            };
        };
        responses: {
            /** @description Versioned catalog mutation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-archive"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-patch-snippet": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-snippet-patch"];
            };
        };
        responses: {
            /** @description Versioned catalog mutation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-snippet-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-inbox-shares": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-inbox-shares"];
            };
        };
        responses: {
            /** @description Share set replaced */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-inbox-response"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-put-conversation-tag": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
                tagId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-empty"];
            };
        };
        responses: {
            /** @description Conversation tag set */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-tag-links"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
    "catalog-delete-conversation-tag": {
        parameters: {
            query?: never;
            header: {
                "X-Tenant-Id": string;
                Origin: string;
                "X-CSRF-Token": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
                tagId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["catalog-empty"];
            };
        };
        responses: {
            /** @description Conversation tag set */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["catalog-tag-links"];
                };
            };
            /** @description Sanitized identity failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
            /** @description Sanitized identity failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthErrorResponse"];
                };
            };
        };
    };
}
