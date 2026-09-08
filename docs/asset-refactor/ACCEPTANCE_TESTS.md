# Acceptance Tests

## Hierarchy
- [ ] System -> Main Asset
- [ ] Main Asset -> Sub-Asset
- [ ] Main Asset -> Part
- [ ] Sub-Asset -> Part
- [ ] Part มีลูกไม่ได้
- [ ] circular parent ถูก block

## Asset Type
- [ ] ไม่มี Boiler & Combustion เป็น Asset Type
- [ ] ไม่มี Water Treatment เป็น Asset Type
- [ ] ไม่มี Fire Protection เป็น Asset Type
- [ ] AC Motor ถูก normalize เป็น Motor
- [ ] PUMP ถูก normalize เป็น Pump
- [ ] GEAR ถูก normalize เป็น Gearbox

## Instrument
- [ ] ไม่มี Instrument root System
- [ ] ค้นด้วย Discipline=Instrument ได้
- [ ] Instrument เป็น Part ใต้ Main/Sub Asset ได้
- [ ] Asset Name ไม่มี Zone code ต่อท้าย

## Valve
- [ ] Control Valve = 19
- [ ] Pressure Regulating Valve = 3
- [ ] Manual Valve = Part
- [ ] Control Valve = Part
- [ ] Safety Valve = Part
- [ ] Pressure Regulating Valve = Part

## Integrity
- [ ] Asset IDs เดิมคงอยู่เท่าที่ทำได้
- [ ] PM history ไม่หลุด
- [ ] CM history ไม่หลุด
- [ ] ไม่มี duplicate Asset Code
- [ ] ไม่มี orphan Parent Asset
- [ ] System/Asset Type references ถูกต้อง

## Asset Code
- [ ] New Asset Code ใช้ prefix MC-
- [ ] New standard code match `^MC-[A-Z]{3}-\d{3}$`
- [ ] Asset Code UNIQUE
- [ ] Existing approved Asset Code ถูก preserve
- [ ] Tag/KKS ไม่ถูกใช้แทน Asset Code
- [ ] concurrent asset creation ไม่ทำให้เกิด running number ซ้ำ
- [ ] Asset Code ที่มี PM/CM history ไม่ถูกเปลี่ยนแบบ uncontrolled
- [ ] legacy approved exception เช่น MC-ARC-5001..5007 ถูก preserve
