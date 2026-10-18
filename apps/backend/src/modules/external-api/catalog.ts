import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {externalCatalog} from '../crm/external-port.js';
import {conversationExternalCatalog} from '../conversation/external-port.js';
export async function appCatalog(scope:TransactionScope){return [...await externalCatalog(scope),...conversationExternalCatalog];}
