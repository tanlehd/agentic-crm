import type { Migration } from './migrations.js';
export const sourceColumns=`source_origin VARCHAR(16) NOT NULL DEFAULT 'legacy' CHECK(source_origin IN ('manual','conversation','legacy')),
source_classification VARCHAR(16) NOT NULL DEFAULT 'unknown' CHECK(source_classification IN ('manual','organic','paid','unknown')),
source_channel VARCHAR(32) NULL,
source_page_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
source_ad_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
source_campaign_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
source_connection_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
source_captured_at DATETIME(6) NULL`;
export const leadSourceMigration:Migration={version:24,name:'lead_source_snapshot',statements:[
  `ALTER TABLE \`lead\` ${sourceColumns.split(',\n').map(c=>'ADD COLUMN '+c).join(', ')}, ADD COLUMN declared_source VARCHAR(32) NULL CHECK(declared_source IS NULL OR declared_source IN ('referral','website','facebook','phone','other'))`,
]};
