# PowerCare Asset R8 — Context

## เป้าหมาย
ใช้ `prisma/data/assets-rungtiva-sol-r8.xlsx` เป็น Asset master ชุดใหม่แทนข้อมูลเดิมทั้งหมด โดยเก็บประวัติ CM และ PM ผ่าน controlled migration เท่านั้น

## โครงสร้าง Tree

```text
Site
└── System
    ├── Main Asset
    │   ├── Sub-Asset
    │   │   └── Part
    │   └── Part
    └── Part
```

Area / Zone เป็นข้อมูลตำแหน่ง ไม่ใช่ระดับใน Tree

## การตัดสินใจที่ล็อกแล้วสำหรับ R8

1. R8 เป็นแหล่งข้อมูลหลัก โดยเฉพาะ Instrument และ Control Valve
2. Instrument และ Control Valve เป็น System ตามที่ระบุในไฟล์
3. Instrument/Control Valve ใช้ tag เดิม เช่น `DPT2001`, `PT-110`, `CV-3009` เป็น CODE ASSET ได้
4. Sub-Asset ต้องอยู่ใต้ Main Asset
5. Part อาจอยู่ใต้ Main Asset, Sub-Asset หรืออยู่ใต้ System โดยตรง
6. Parent หาโดยเทียบส่วนรหัสหลัง prefix แบบ longest match; ห้ามเดาจากลำดับแถว
7. ตัวอย่างที่ยืนยัน: `SA-GVC-001-01` และ `PA-GVC-001-02` อยู่ใต้ `MA-GVC-001`
8. ถ้ารหัสซ้ำ ให้เปลี่ยนอักษรย่อสามตัวโดยเก็บเลขรันเดิม
9. ข้อความ `@...` และ `Z08a` ที่อยู่ในชื่อเครื่องจักรต้องเก็บไว้
10. Criticality: A = HIGH, B = MEDIUM, C = LOW
11. สถานะ Active ในไฟล์ = `operatingStatus=IN_SERVICE` และ `registrationStatus=ACTIVE`
12. แก้ชื่อ `ASH handing` เป็น `ASH Handling`
13. เปลี่ยน Zone เดิม `Water Treatment Plant` เป็น `Water Treatment` ตาม R8
14. CM ที่อ้าง Assets เดิมต้องใช้ mapping ที่ผู้ใช้ยืนยันก่อนย้าย
15. Migration ต้องหยุดทันทีถ้าพบ PM dependency ใหม่ที่ยังไม่ได้อนุมัติ mapping

## ผลลัพธ์ R8 ที่ตรวจแล้ว

- Source rows: 590
- Assets หลังรวม Instrument tags ที่ซ้ำ: 583
- Main Assets: 188
- Sub-Assets: 367
- Parts: 28
- Systems: 13
- Asset Types: 21
- Parts ใต้ Main/Sub: 21
- Parts ใต้ System โดยตรง: 7

Workbook SHA-256: `711ed08fba13865200e2b8c4c112c1f091d50f428e1f936cac670623d30f2978`
