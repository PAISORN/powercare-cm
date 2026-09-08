# Asset Hierarchy Specification

## Tree
Site -> System -> Main Asset -> Sub-Asset -> Part

## Allowed Parent-Child
| Parent | Child |
|---|---|
| Site | System |
| System | Main Asset |
| Main Asset | Sub-Asset |
| Main Asset | Part |
| Sub-Asset | Part |

ห้าม Part มีลูก และห้ามสร้างวงจร parent

## Asset Level
- MAIN_ASSET
- SUB_ASSET
- PART

## Validation
- Main Asset ต้องสังกัด System
- Sub-Asset ต้องมี Main Asset เป็น parent
- Part ต้องมี Main Asset หรือ Sub-Asset เป็น parent
- Asset Type ห้ามเป็นชื่อ System
- Asset Name ห้ามลงท้าย Zone pattern: `\s+Z[0-9A-Za-z._-]+$`
- Motor / Gearbox โดยทั่วไปเป็น Sub-Asset
- Bearing / Coupling / Filter / Seal / Impeller / Valve / Instrument โดยทั่วไปเป็น Part
