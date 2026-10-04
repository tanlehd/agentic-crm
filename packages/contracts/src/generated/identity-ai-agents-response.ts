/* Generated. Do not edit. */

export interface AiAgentsResponse {
  data: AiAgentsEntity;
  meta: {
    correlation_id: string;
  };
}
export interface AiAgentsEntity {
  id: string;
  tenant_id: string;
  version: string;
  name: string;
  policy_id: string;
  runtime_adapter: string;
  max_concurrency: number;
  /**
   * @maxItems 100
   */
  role_ids: string[];
  /**
   * @maxItems 100
   */
  team_ids: string[];
  principal_id: string;
  principal_version: string;
  auth_revision: string;
}
