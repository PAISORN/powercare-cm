# Asset Code Standard

## Objective
กำหนดมาตรฐาน Asset Code ใหม่ของ PowerCare ให้ Codex ใช้เป็นกติกาหลักในการสร้าง ตรวจสอบ และ migrate Asset

## Standard Format

```text
MC-[3 LETTER TYPE CODE]-[3 DIGIT RUNNING NUMBER]
```

ตัวอย่าง:

```text
MC-BOL-001
MC-IDF-001
MC-BFP-001
MC-BFP-002
MC-TUB-001
MC-GEB-001
MC-CTW-001
MC-CTW-002
```

## Format Rules

1. Prefix ของ Machine/Asset ใช้ `MC`
2. ส่วนกลางเป็นรหัสอุปกรณ์ 3 ตัวอักษรภาษาอังกฤษตัวพิมพ์ใหญ่
3. Running Number ใช้เลข 3 หลัก เริ่มจาก 001
4. ใช้เครื่องหมาย `-` คั่นทุกส่วน
5. Asset Code ต้องไม่ซ้ำกันทั้ง Site
6. ห้ามนำ Zone, System Code หรือปีมาใส่ใน Asset Code
7. ห้ามใช้ prefix `RTB-` สำหรับ Asset Code ใหม่
8. Existing tag/KKS เช่น RTB-BFP-3201 ให้เก็บใน `Tag / KKS` ไม่ใช่ `Asset Code`

## Regex

```regex
^MC-[A-Z]{3}-\d{3}$
```

## Examples Used in Current Asset Master

### Steam Turbine
- MC-TUB-001 — Steam Turbine
- MC-GEB-001 — Gear Box
- MC-OTS-001 — Oil Tank Storage
- MC-MOP-001 — Main Oil Pump
- MC-AOP-001 — Auxiliary Oil Pump
- MC-EOP-001 — Emergency Oil Pump
- MC-COP-001 / MC-COP-002 — Auxiliary Control Oil Pump
- MC-OCL-001 / MC-OCL-002 — Oil Cooler
- MC-GVC-001 — Gland Vent Condenser
- MC-SUC-001 — Surface Condenser
- MC-HOG-001 — Hogger
- MC-EJT-001 / MC-EJT-002 — Ejector

### Boiler & Combustion
- MC-BOL-001 — Boiler
- MC-STD-001 — Steam Drum
- MC-VBG-001 — Vibrating Grate
- MC-GDU-001 — Grate Drive Unit
- MC-SPD-001 — Spreader Damper
- MC-IDF-001 — Induced Draft Fan
- MC-PAF-001 — Primary Air Fan
- MC-FRF-001 — Flue Gas Recir Fan
- MC-SAF-001 — Secondary Air Fan
- MC-SPA-001 — Spreader Air Fan
- MC-BFP-001 / MC-BFP-002 — Boiler Feed Pump
- MC-VCP-001 / MC-VCP-002 — Vibrating Cooling Grate Pump

### Condensate & Feedwater
- MC-DET-001 — Deaerator Storage Tank
- MC-CDP-001 / MC-CDP-002 — Condensate Pump

### Fuel Handling
- MC-MVF-001..004 — Moving Floor
- MC-FBC-001..002 — Fuel Belt Conveyor
- MC-BCY-001..007 — Belt Conveyor
- MC-FSD-001 — Fuel Shredder
- MC-FSN-001 — Fuel Screener
- MC-FDC-001 — Fuel Drum Chipper
- MC-FPC-001 — Fuel Picking Crane

### Ash Handling
- MC-ASC-001..014 — Ash Screw Conveyor
- MC-WAC-001 — Wet Ash Chain Conveyor
- MC-ARC-5001..5007 — Rotary Air Lock (legacy operational numbering retained)

### Cooling Water
- MC-CTW-001 / MC-CTW-002 — Cooling Tower
- MC-MCP-001..003 — Main Cooling Pump
- MC-AUP-001 / MC-AUP-002 — Auxiliary Pump
- MC-MUP-001 / MC-MUP-002 — Makeup Cooling Pump

### Water Treatment
- MC-UFU-001 — UF Unit
- MC-ROP-001 / MC-ROP-002 — RO Unit
- MC-EDI-001 / MC-EDI-002 — EDI Unit
- MC-EFP-001 / MC-EFP-002 — EDI Feed Pump
- MC-CIP-001 — CIP Pump
- MC-CAS-001 — Caustic Dosing Pump
- MC-ANT-001 — Anti-Scale Dosing Pump
- MC-SMB-001 — SMBS Dosing Pump

## Important Exception

บาง Asset เดิมมี running number ที่มีความหมายทางหน้างาน เช่น:

```text
MC-ARC-5001
MC-ARC-5002
...
MC-ARC-5007
```

ห้าม Codex renumber Asset เดิมเหล่านี้อัตโนมัติ

หลักการ:
- Existing approved Asset Code = preserve
- New Asset = generate ตาม standard `MC-XXX-001`
- Migration ห้ามเปลี่ยน Asset Code ที่ approved แล้วโดยไม่มี explicit mapping

## Asset Code vs Tag/KKS

ตัวอย่าง:

```text
Asset Code : MC-BFP-001
Asset Name : Boiler Feed Pump No.1
Tag / KKS  : RTB-BFP-3201
```

Asset Code เป็น Primary Business Identifier ของ PowerCare

Tag/KKS เป็นรหัสจากแบบ/ระบบเดิม/ผู้ผลิต/หน้างาน และอาจมีรูปแบบต่างจาก Asset Code

ห้ามนำสอง field นี้มารวมกัน

## Code Generation Logic

เมื่อสร้าง Asset ใหม่:

1. ผู้ใช้เลือก Asset Type
2. ระบบหา `type_code` 3 ตัวอักษรจาก Asset Type Master
3. Query running number สูงสุดของ type_code ภายใน Site
4. +1
5. Format เป็น 3 หลัก
6. ตรวจ UNIQUE ก่อน save

ตัวอย่าง pseudo code:

```ts
const typeCode = assetType.code; // BFP
const next = await getNextRunningNumber(siteId, typeCode);
const assetCode = `MC-${typeCode}-${String(next).padStart(3, "0")}`;
```

ต้องทำ generation ที่ server/database transaction เพื่อป้องกันเลขซ้ำจาก concurrent requests

## Validation

- Asset Code ต้อง UNIQUE
- New Asset Code ต้อง match regex
- Existing approved exceptions ต้อง allowlist/preserve
- Asset Code เปลี่ยนไม่ได้หลังมี PM/CM history โดยไม่มี controlled migration
- UI ไม่ควรให้ผู้ใช้พิมพ์ Asset Code แบบ free text โดย default
