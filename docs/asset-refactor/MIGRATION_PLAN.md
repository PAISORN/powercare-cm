# Migration Plan

## 1 Backup
Backup:
- Assets
- Systems
- Areas/Zones
- PM references
- CM references
- Store references
- audit/history

## 2 Master Data
สร้าง/ปรับ:
- System Master
- Area/Zone Master
- Asset Type Master

## 3 Normalize
- AC Motor -> Motor
- PUMP -> Pump
- GEAR -> Gearbox
- System names ออกจาก Asset Type
- Zone code ออกจากท้าย Asset Name

## 4 Valve
- Control Valve = 19
- Pressure Regulating Valve = 3
- Manual/Safety/Control/Pressure Regulating Valve = Part

## 5 Instrument
ย้าย Instrument ไปอยู่ Process System และ assign parent ที่เกี่ยวข้อง
ถ้าไม่ทราบ parent ให้ NEED_PARENT_REVIEW

## 6 Build Tree
System -> Main Asset -> Sub-Asset -> Part
ห้ามสร้าง fake parent เพื่อให้ Tree ดูเต็ม

## 7 Preserve References
พยายามรักษา Asset ID เดิม เพื่อไม่ให้ PM/CM/Store history หลุด
prefer update-in-place มากกว่า delete/recreate

## 8 UI
แก้ Asset Tree, Create/Edit, Search, Filter, PM selector, CM selector

## 9 QA
รันตาม ACCEPTANCE_TESTS.md

## Rollback
Migration ต้อง rollback ได้จาก backup
