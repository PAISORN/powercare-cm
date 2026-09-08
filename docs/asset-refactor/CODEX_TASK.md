# Codex Task — PowerCare Asset Refactor

อ่านไฟล์ต่อไปนี้ก่อนแก้โค้ด:
1. CONTEXT.md
2. ASSET_HIERARCHY_SPEC.md
3. ASSET_TYPE_MASTER.md
4. DATA_MODEL_CHANGES.md
5. INSTRUMENT_PARENTING_RULES.md
6. MIGRATION_PLAN.md
7. UI_REQUIREMENTS.md
8. ACCEPTANCE_TESTS.md
9. ASSET_CODE_STANDARD.md

## Objective
ปรับ Asset module เป็น:
Site -> System -> Main Asset -> Sub-Asset -> Part

Area/Zone = metadata
Asset Type = equipment classification
Instrument = Part ไม่ใช่ System

## Work Order

### 1 Inspect Existing Code
ก่อนแก้:
- หา DB schema
- Asset API/service/routes
- Asset Tree component
- Create/Edit Asset form
- PM/CM/Store foreign keys
- migration framework
- tests

ห้ามเดาชื่อไฟล์

### 2 Impact Report
สร้าง `docs/asset-refactor-impact.md`
ระบุ:
- tables
- APIs
- pages/components
- migration risks
- PM/CM/Store dependencies

### 3 Schema
Reuse ของเดิมถ้ามี concept เดียวกัน
ต้องรองรับ:
- systems
- areas/zones
- asset_types
- assets.parent_asset_id
- assets.asset_level
- assets.asset_type_id
- assets.system_id
- assets.area_id

### 4 Data Safety
ห้าม delete/recreate Asset ถ้าทำให้ PM/CM/Store/history links ขาด
prefer update-in-place

### 5 Validation
- valid level-parent relationship
- no circular parent
- valid Asset Type
- valid System
- no trailing Z-code in Asset Name
- no System name as Asset Type

### 6 Instrument
ห้ามสร้าง Instrument root system
- discipline = Instrument
- asset_level = PART
- system = process system
- parent = related Main/Sub Asset
ถ้าไม่รู้ parent -> NEED_PARENT_REVIEW

### 7 Valve
- Control Valve confirmed = 19
- Pressure Regulating Valve confirmed = 3
- both = PART

### 8 UI
Tree:
Site -> System -> Main Asset -> Sub-Asset -> Part
Zone และ Asset Type เป็น metadata/filter เท่านั้น

### 9 Migration
ต้องมี:
- dry-run
- before/after counts
- unresolved records
- rollback path

### 10 Tests
ทุกข้อใน ACCEPTANCE_TESTS.md ต้องผ่าน

## Scope Guard
ห้าม refactor module อื่นโดยไม่จำเป็น
PM/CM/Store เปลี่ยนเท่าที่จำเป็นเพื่อรักษา Asset references

## Final Deliverables
Codex ต้องสรุป:
1. changed files
2. migration files
3. DB changes
4. UI changes
5. unresolved records
6. test results
7. rollback instructions

## Asset Code Requirements
Implement Asset Code rules from `ASSET_CODE_STANDARD.md`.

Critical:
- preserve existing approved Asset Codes
- new code default format `MC-XXX-001`
- keep Tag/KKS separate
- validate uniqueness
- generate on server in a concurrency-safe transaction
- do not automatically renumber legacy approved exceptions such as MC-ARC-5001..5007
