import type {Migration} from './migrations.js';
import {PLATFORM_TENANT_ID} from './system-scope.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const digest='CHAR(64) CHARACTER SET ascii COLLATE ascii_bin';
const system=`tenant_id ${id} NOT NULL CHECK(tenant_id='${PLATFORM_TENANT_ID}')`;
const service="service VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL CHECK(service IN ('identity','chat','connector'))";
const enabled='enabled BOOLEAN NOT NULL CHECK(enabled IN (0,1))';
const version='version BIGINT UNSIGNED NOT NULL CHECK(version>=1)';
const engine='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
export const workloadMigration:Migration={version:41,name:'identity_current_workload_registry',statements:[
 `CREATE TABLE identity_workload_service(${system},${service},${enabled},${version},created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,service)) ${engine}`,
 `CREATE TABLE identity_workload_certificate(${system},${service},fingerprint ${digest} NOT NULL,not_before_ms BIGINT UNSIGNED NOT NULL,not_after_ms BIGINT UNSIGNED NOT NULL,accept_until_ms BIGINT UNSIGNED NOT NULL,revoked BOOLEAN NOT NULL CHECK(revoked IN (0,1)),created_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,service,fingerprint),FOREIGN KEY(tenant_id,service) REFERENCES identity_workload_service(tenant_id,service),CHECK(not_after_ms>not_before_ms AND not_after_ms-not_before_ms<=86400000),CHECK(accept_until_ms<=not_after_ms)) ${engine}`,
 `CREATE TABLE identity_workload_admission(tenant_id ${id} NOT NULL CHECK(tenant_id<>'${PLATFORM_TENANT_ID}'),${service},${enabled},updated_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,service)) ${engine}`,
 `CREATE TABLE identity_workload_event(${system},${service},${version},operation VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL CHECK(operation IN ('initialize','enable','disable','admit','deny','rotate','revoke')),target_tenant_id ${id} NULL,fingerprint ${digest} NULL,created_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,service,version),FOREIGN KEY(tenant_id,service) REFERENCES identity_workload_service(tenant_id,service)) ${engine}`,
]};
