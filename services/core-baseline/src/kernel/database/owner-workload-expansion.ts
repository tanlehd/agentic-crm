/** Additive part of planned baseline043; migration041 remains immutable. */
export const ownerWorkloadExpansion = ['service', 'certificate', 'admission', 'event'].map(part => {
  const table = 'identity_workload_' + part;
  return {
    table, previous: table + '_chk_2', constraint: 'ck_' + table + '_owner_services',
    statement: `ALTER TABLE ${table} DROP CHECK ${table}_chk_2, ADD CONSTRAINT ck_${table}_owner_services CHECK(service IN ('identity','chat','connector','routing','bff'))`,
  };
});

/** Later additive component: the first expansion above is already pinned and immutable. */
export const ownerWorkloadServices = ['identity', 'chat', 'connector', 'routing', 'bff', 'crm', 'sales', 'ai-runtime', 'chatflow', 'workflow', 'reporting'] as const;
export const ownerWorkloadFullExpansion = ['service', 'certificate', 'admission', 'event'].map(part => {
  const table = 'identity_workload_' + part;
  return {
    table, previous: 'ck_' + table + '_owner_services', constraint: 'ck_' + table + '_owner_v1_services',
    statement: `ALTER TABLE ${table} DROP CHECK ck_${table}_owner_services, ADD CONSTRAINT ck_${table}_owner_v1_services CHECK(service IN (${ownerWorkloadServices.map(name => "'" + name + "'").join(',')}))`,
  };
});
