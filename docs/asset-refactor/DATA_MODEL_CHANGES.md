# Data Model Changes

## Recommended Tables
### sites
id, code, name

### systems
id, site_id, code, name, status, sort_order

### areas
id, site_id, code, name

### asset_types
id, code, name, default_level, discipline, status

### assets
id
asset_code
asset_name
site_id
system_id
area_id
parent_asset_id
asset_type_id
asset_level
discipline
tag_kks
registration_code
manufacturer
model
serial_no
criticality
status
key_specification
metadata_json
created_at
updated_at

## Indexes
- UNIQUE asset_code
- parent_asset_id
- system_id
- asset_type_id
- area_id
- tag_kks
- serial_no

## Constraints
- asset_level IN MAIN_ASSET, SUB_ASSET, PART
- no circular parent
- parent_asset_id != id
- valid system FK
- valid asset_type FK

## Instrument
Instrument ใช้ row ปกติใน assets:
- discipline = Instrument
- asset_level = PART
- asset_type = ประเภท Instrument จริง
- system_id = Process System
- parent_asset_id = เครื่องจักรที่เกี่ยวข้อง
