import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const engine='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
const fk=(column:string,target:string,targetColumn='id')=>`FOREIGN KEY(tenant_id,${column}) REFERENCES ${target}(tenant_id,${targetColumn})`;
const key="`key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL CHECK(REGEXP_LIKE(`key`,'^[a-z][a-z0-9_]{0,63}$'))";
function metadata(name:string,extra:string){return `CREATE TABLE ${name}(id ${id} PRIMARY KEY,tenant_id ${id} NOT NULL,object_type_id ${id} NOT NULL,${key},${extra},version BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK(version>=1),created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,UNIQUE(tenant_id,id),UNIQUE(tenant_id,object_type_id,\`key\`),${fk('object_type_id','object_type')}) ${engine}`;}
const columns={string:'VARCHAR(255) COLLATE utf8mb4_bin',integer:'BIGINT',decimal:'DECIMAL(20,6)',boolean:'TINYINT',date:'DATE',datetime:'DATETIME(6)'};
export const propertiesMigration:Migration={version:7,name:'crm_properties',statements:[
  metadata('property_definition',"label VARCHAR(255) NOT NULL,type VARCHAR(32) NOT NULL CHECK(type IN ('string','text','integer','decimal','boolean','date','datetime','enum')),required BOOLEAN NOT NULL CHECK(required IN (0,1)),default_value JSON NULL,options JSON NULL,indexed BOOLEAN NOT NULL CHECK(indexed IN (0,1)),`sensitive` BOOLEAN NOT NULL CHECK(`sensitive` IN (0,1)),archived_at DATETIME(6) NULL,CHECK(type<>'text' OR indexed=0),CHECK((type='enum' AND options IS NOT NULL AND JSON_TYPE(options)='ARRAY') OR (type<>'enum' AND options IS NULL))"),
  `CREATE TABLE custom_record(tenant_id ${id} NOT NULL,record_id ${id} NOT NULL,PRIMARY KEY(tenant_id,record_id),${fk('record_id','crm_record')}) ${engine}`,
  `CREATE TABLE property_index_value(tenant_id ${id} NOT NULL,record_id ${id} NOT NULL,property_id ${id} NOT NULL,value_kind VARCHAR(32) NOT NULL,${Object.entries(columns).map(([k,v])=>`${k}_value ${v} NULL`).join(',')},PRIMARY KEY(tenant_id,record_id,property_id),${fk('record_id','crm_record')},${fk('property_id','property_definition')},CHECK(${Object.keys(columns).map(k=>`(${k}_value IS NOT NULL)`).join('+')}=1),CHECK(${Object.keys(columns).map(k=>`(value_kind='${k}' AND ${k}_value IS NOT NULL)`).join(' OR ')}),CHECK(boolean_value IS NULL OR boolean_value IN (0,1)),${Object.keys(columns).map(k=>`INDEX ix_property_${k}(tenant_id,property_id,${k}_value,record_id)`).join(',')}) ${engine}`,
  metadata('form_definition',"fields JSON NOT NULL CHECK(JSON_TYPE(fields)='ARRAY')"),
  metadata('view_definition',"columns JSON NOT NULL CHECK(JSON_TYPE(columns)='ARRAY'),filter JSON NOT NULL CHECK(JSON_TYPE(filter)='ARRAY'),sort JSON NULL"),
]};
