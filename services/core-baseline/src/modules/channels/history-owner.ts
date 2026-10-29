import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ownerFail, ownerRoute, OwnerDomainError, type WorkloadRoute } from '@agentic-crm/workload-transport';

/** Channels still owns baseline connection storage; this pool is never given to Chat. */
export function channelHistoryOwnerRoutes(pool: Pool): Record<string, WorkloadRoute> {
  return { '/internal/v1/owners/connector/history-platform-read': ownerRoute('connector', 'history-platform-read', ['chat'], async request => {
    const id = request.payload.connection_id as string;
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT provider FROM channel_connection WHERE tenant_id=? AND id=?', [request.tenant_id, id]);
    if (!rows[0]) ownerFail('NOT_FOUND');
    if (rows[0].provider !== 'mock_messenger') throw new OwnerDomainError('UNSUPPORTED_MESSAGE_PLATFORM', request.correlation_id);
    return { connection_id: id, platform: 'mock_messenger' };
  }) };
}
