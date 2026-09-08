# PowerCare Asset Hierarchy Refactor — Context

## เป้าหมาย
ปรับโมดูล Asset ให้ค้นหาประวัติ, PM, CM และข้อมูลเครื่องจักรง่าย โดยแยกความหมายของ System, Area/Zone, Asset Type และ Asset Level ให้ชัดเจน

## โครงสร้างหลัก
Site
└── System
    └── Main Asset
        └── Sub-Asset
            └── Part

Area / Zone ไม่ใช่ระดับใน Tree แต่เป็นข้อมูลตำแหน่ง

## คำจำกัดความ
- System = ระบบกระบวนการ เช่น Boiler & Combustion, Steam Turbine, Fuel Handling
- Main Asset = เครื่องจักรหลักที่ควรมีประวัติแยก
- Sub-Asset = อุปกรณ์สำคัญใต้ Main Asset เช่น Motor, Gearbox
- Part = ชิ้นส่วน/อุปกรณ์ย่อย เช่น Bearing, Coupling, Valve, Instrument
- Asset Type = ชนิดอุปกรณ์จริง เช่น Pump, Fan, Motor, Gearbox
- Discipline = Mechanical / Electrical / Instrument / Control ฯลฯ

## การตัดสินใจที่ล็อกแล้ว
1. System ห้ามใช้เป็น Asset Type
2. Zone ห้ามต่อท้าย Asset Name
3. Instrument ไม่ใช่ System แยก
4. Instrument เป็น Part และต้องเกาะกับ Main Asset/Sub-Asset ที่เกี่ยวข้อง
5. Manual Valve / Control Valve / Safety Valve / Pressure Regulating Valve เป็น Part
6. Control Valve ยืนยันแล้ว 19 ตัว
7. Pressure Regulating Valve ยืนยันแล้ว 3 ตัว:
   - Pressure Control Valve For ACOP
   - Pressure Control Valve For AOP
   - Pressure Control Valve Lube Oil

## Control Valve 19 ตัว
CV-3001, CV-3002, CV-3003, CV-3004, CV-3005, CV-3006, CV-3007, CV-3008, CV-3009,
CV-3101, CV-3102, CV-3103, CV-3104, CV-3105,
CV-3201, CV-3202, CV-3203, CV-3204, CV-3205

## Asset Name Cleanup
ตัวอย่าง:
`Pressure Transmitter PT-3001 Z08b`
ต้องเป็น
`Pressure Transmitter PT-3001`

Zone ให้เก็บใน Area/Zone field เท่านั้น

## Asset Code Standard
Asset Code ใหม่ใช้รูปแบบ:

`MC-[3 LETTER TYPE CODE]-[RUNNING NUMBER]`

ตัวอย่าง:
- MC-BOL-001
- MC-BFP-001
- MC-BFP-002
- MC-TUB-001
- MC-IDF-001

Asset Code และ Tag/KKS เป็นคนละ field

ตัวอย่าง:
- Asset Code = MC-BFP-001
- Tag/KKS = RTB-BFP-3201

Existing approved codes ต้อง preserve ระหว่าง migration
รายละเอียดดู `ASSET_CODE_STANDARD.md`
