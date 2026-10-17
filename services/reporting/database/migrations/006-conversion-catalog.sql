-- Expand connected metadata capability; all existing data/pins remain unchanged.
ALTER TABLE report_connected_catalog
 DROP CHECK report_connected_catalog_chk_2,
 ADD CONSTRAINT report_connected_catalog_adapter CHECK(catalog_hash REGEXP '^[a-f0-9]{64}$' AND adapter_id IN ('native_operations_v1','native_conversion_v1'));
