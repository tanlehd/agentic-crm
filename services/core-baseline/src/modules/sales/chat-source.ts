import type { Access } from '../identity/domain/authorization.js';
import { CommandError } from '../../kernel/reliability/commands.js';

export interface ChatSalesSource {
  source_conversation_session_id: string | null;
  source_touchpoint_id: string | null;
  source_origin: string;
  source_classification: string;
  source_channel: string | null;
  source_page_id: string | null;
  source_ad_id: string | null;
  source_campaign_id: string | null;
  source_connection_id: string | null;
}
/** Sales owns the remote integration. Never validate lineage against retained Chat SQL. */
export interface SalesChatSource {
  source(access: Access, conversation: string, contact: string, session?: string | null): Promise<ChatSalesSource>;
  session(access: Access, conversation: string, session: string, contact?: string, active?: boolean, write?: boolean): Promise<{contactId: string; sessionId: string}>;
}
const unavailable = async (): Promise<never> => { throw new CommandError(503, 'SALES_CHAT_UNAVAILABLE'); };
export const salesChatSource: SalesChatSource = { source: unavailable, session: unavailable };
