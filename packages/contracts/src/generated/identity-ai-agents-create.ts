/* Generated. Do not edit. */

export interface AiAgentsCreate {
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
}
