# Instrument Parenting Rules

## หลักการ
Instrument ต้องไปอยู่ใต้ Asset ที่มันตรวจวัดหรือควบคุมจริง ไม่สร้าง Instrument System เพื่อรวมของ

## ตัวอย่าง
Boiler
└── Steam Drum
    ├── Level Transmitter
    ├── Pressure Transmitter
    └── Control Valve

Steam Turbine
└── Lube Oil System
    ├── Pressure Transmitter
    ├── Pressure Switch
    └── Pressure Regulating Valve

## ลำดับการหา Parent
1. Tag/KKS association
2. Asset Name / Service
3. System
4. Area/Zone
5. Process knowledge
6. Manual review

ถ้าไม่มั่นใจ:
- ห้ามเดา
- parent_asset_id = null
- migration_status = NEED_PARENT_REVIEW

## Zone Cleanup
ลบ Zone เฉพาะที่อยู่ท้ายชื่อด้วย regex:
`\s+Z[0-9A-Za-z._-]+$`
