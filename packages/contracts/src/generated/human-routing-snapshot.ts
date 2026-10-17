/* Generated. Do not edit. */

export interface HumanRoutingSnapshot {
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
