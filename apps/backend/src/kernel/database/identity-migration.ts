import type { Migration } from './migrations.js';
const id = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const text = (size: number) => `VARCHAR(${size}) CHARACTER SET ascii COLLATE ascii_bin`;
const times = 'created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL';
const version = 'version BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (version >= 1)';
const revision = 'auth_revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (auth_revision >= 1)';
const fk = (table: string, column: string, target: string) => `CONSTRAINT fk_${table}_${column} FOREIGN KEY (tenant_id,${column}) REFERENCES ${target}(tenant_id,id)`;
function table(name: string, fields: string, constraints = '') {
  return `CREATE TABLE \`${name}\` (id ${id} PRIMARY KEY, tenant_id ${id} NOT NULL, ${fields}, ${times}, UNIQUE (tenant_id,id), FOREIGN KEY (tenant_id) REFERENCES tenant(id)${constraints ? `, ${constraints}` : ''}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs`;
}
export const identityMigration: Migration = {
  version: 2, name: 'identity_authorization', statements: [
    table('membership', `account_id ${id} NOT NULL, status ${text(32)} NOT NULL CHECK (status IN ('invited','active','suspended')), seat_code ${text(32)} NOT NULL CHECK (seat_code IN ('viewer','chat','sales','service','admin')), ${revision}, ${version}`, 'UNIQUE (tenant_id,account_id), FOREIGN KEY (account_id) REFERENCES account(id)'),
    table('role', `\`key\` ${text(64)} NOT NULL, name VARCHAR(255) NOT NULL, permissions JSON NOT NULL, ${version}`, "UNIQUE (tenant_id,`key`), CHECK (JSON_TYPE(permissions)='ARRAY')"),
    table('team', `name VARCHAR(255) NOT NULL, purpose ${text(32)} NOT NULL CHECK (purpose IN ('chat','sales','service','general')), active TINYINT UNSIGNED NOT NULL DEFAULT 1 CHECK (active IN (0,1)), ${version}`),
    table('agent_policy', `\`key\` ${text(64)} NOT NULL, ${version}, allowed_tools JSON NOT NULL, allowed_actions JSON NOT NULL, timeout_ms INT UNSIGNED NOT NULL CHECK (timeout_ms BETWEEN 1 AND 30000), max_tool_calls INT UNSIGNED NOT NULL CHECK (max_tool_calls BETWEEN 1 AND 5)`, "UNIQUE (tenant_id,`key`,version), CHECK (JSON_TYPE(allowed_tools)='ARRAY'), CHECK (JSON_TYPE(allowed_actions)='ARRAY')"),
    table('ai_agent', `name VARCHAR(255) NOT NULL, runtime_adapter ${text(64)} NOT NULL, policy_id ${id} NOT NULL, max_concurrency INT UNSIGNED NOT NULL CHECK (max_concurrency > 0), ${version}`, fk('ai_agent','policy_id','agent_policy')),
    table('principal', `kind ${text(32)} NOT NULL, membership_id ${id} NULL, ai_agent_id ${id} NULL, status ${text(32)} NOT NULL CHECK (status IN ('active','suspended')), availability ${text(32)} NOT NULL DEFAULT 'available' CHECK (availability IN ('available','unavailable')), ${revision}, ${version}`, [
      "CHECK ((kind='human' AND membership_id IS NOT NULL AND ai_agent_id IS NULL) OR (kind='ai' AND membership_id IS NULL AND ai_agent_id IS NOT NULL))",
      'UNIQUE (tenant_id,membership_id)', 'UNIQUE (tenant_id,ai_agent_id)', fk('principal','membership_id','membership'), fk('principal','ai_agent_id','ai_agent'),
    ].join(', ')),
    `CREATE TABLE principal_role (tenant_id ${id} NOT NULL, principal_id ${id} NOT NULL, role_id ${id} NOT NULL, PRIMARY KEY (tenant_id,principal_id,role_id), ${fk('principal_role','principal_id','principal')}, ${fk('principal_role','role_id','role')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs`,
    `CREATE TABLE team_member (tenant_id ${id} NOT NULL, team_id ${id} NOT NULL, principal_id ${id} NOT NULL, active TINYINT UNSIGNED NOT NULL DEFAULT 1 CHECK (active IN (0,1)), PRIMARY KEY (tenant_id,team_id,principal_id), ${fk('team_member','team_id','team')}, ${fk('team_member','principal_id','principal')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs`,
    table('service_actor', `\`key\` ${text(64)} NOT NULL, active TINYINT UNSIGNED NOT NULL DEFAULT 1 CHECK (active IN (0,1)), role_id ${id} NOT NULL, ${revision}`, `UNIQUE (tenant_id,\`key\`), ${fk('service_actor','role_id','role')}`),
  ],
};
