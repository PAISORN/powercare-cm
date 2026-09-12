# Asset Hierarchy Specification — R8

## Allowed Parent-Child

| Parent | Child |
|---|---|
| Site | System |
| System | Main Asset |
| System | Part |
| Main Asset | Sub-Asset |
| Main Asset | Part |
| Sub-Asset | Part |

Part ห้ามมีลูก และทุก Asset ต้องสังกัด System

## Parent Resolution

- Main Asset ไม่มี parent
- Sub-Asset ต้องหา Main Asset จากส่วนรหัสหลัง `MA-` / `SA-`
- Part ใช้ parent ที่มีส่วนรหัสตรงกันยาวที่สุด โดยเลือก Sub-Asset ก่อน Main Assetเมื่อรหัสรองรับ
- Part ที่ไม่พบรหัส Main/Sub ที่ตรงกันให้อยู่ใต้ System โดยตรง
- ห้ามใช้ตำแหน่งแถวใน Excel เป็นหลักฐาน parent

ตัวอย่าง:

```text
System: Steam Turbine
└── MA-GVC-001  Gland Vent Condenser
    ├── SA-GVC-001-01  Motor Gland Vent Condenser
    └── PA-GVC-001-02  Sealing Gland Vent Exhaust
```

Instrument และ Control Valve เป็น System ที่ตั้งใจใช้ tag code สำหรับ Sub-Asset ตาม R8
