# Architecture

เอกสารนี้สรุป Architecture ที่แนะนำสำหรับ **Power Plant CM Control Center** จากสเปก MVP ปัจจุบัน เป้าหมายคือให้เริ่มสร้างได้จริงเร็ว แต่ยังวางโครงให้ขยายระบบ CM ในอนาคตได้โดยไม่ต้องรื้อใหญ่

## Architecture หลักที่ใช้

### 1. Modular Monolith Architecture

ใช้ **Modular Monolith** เป็นฐานสำหรับรอบแรก

เหตุผล:

- ระบบยังเป็น product เดียว ไม่จำเป็นต้องแยก microservices ตั้งแต่ต้น
- ลดความซับซ้อนเรื่อง deployment, network, auth ข้าม service และ data sync
- ยังแยกขอบเขตงานเป็น module ชัดเจน ทำให้ขยายภายหลังได้ง่าย
- เหมาะกับ MVP ที่ต้องมี workflow ใช้งานจริงครบวงจร

Module หลัก:

- Public Portal
- Authentication & User Profile
- Role & Permission
- CM Work Management
- Workflow & Status
- Dashboard & Reporting
- Completion Document
- Admin Back Office
- Audit Trail
- Master Data

## Logical Modules

### Public Portal Module

ดูแลส่วนที่ผู้ใช้ไม่ต้องล็อกอิน:

- Landing Page
- Public Dashboard
- Repair Request Form
- Submit Success
- Public Tracking

ข้อมูลที่เปิดเผยต้องเป็นข้อมูลพื้นฐานเท่านั้น เช่น เลขที่แจ้งซ่อม, วันที่แจ้ง, Category, Zone, ชื่อเครื่องจักร และสถานะ

### Authentication & User Profile Module

ดูแลการเข้าสู่ระบบและข้อมูลผู้ใช้:

- Login ด้วย username/password
- Password hashing
- Profile ผู้ใช้
- Role
- Category assignment สำหรับ Engineer/Technician
- Signature upload และ preview
- Active/inactive user

ลายเซ็นเป็นข้อมูลของ profile ไม่ใช่ข้อมูลที่อัปโหลดตอนปิดงาน

### Role & Permission Module

ใช้ **Role-Based Access Control (RBAC)** ร่วมกับ category permission

Role หลัก:

- Admin
- Engineer
- Technician

หลักการสิทธิ์:

- Admin ไม่ผูก Category และจัดการได้ทุกอย่าง
- Engineer เห็นทุกงาน แต่ action ได้เฉพาะ Category ตัวเอง
- Technician เห็นทุกงาน แต่รับงานและอัปเดตได้เฉพาะ Category ตัวเอง
- Requester ไม่มี role และใช้ได้เฉพาะ public flow

Engineer/Technician ใช้รูปแบบ `role + category` ไม่สร้าง role แยกเป็นวิศวกรไฟฟ้า/วิศวกรเครื่องกล/ช่างไฟฟ้า/ช่างเครื่องกล

### CM Work Management Module

ดูแลข้อมูลหลักของงาน CM:

- Repair Request
- CM Work Number
- Category
- Zone
- Machine
- Urgency
- Claimant
- Technician note
- Engineer note
- Closure data

เลขที่แจ้งซ่อมและเลขที่งาน CM ใช้เลขเดียวกัน เช่น `CM-2026-06-0001`

### Workflow & Status Module

ใช้แนวคิด **Workflow State Machine** เพื่อควบคุมสถานะและ action ที่ทำได้

สถานะหลัก:

- แจ้งใหม่
- รอรับงาน
- รับเรื่องแล้ว
- กำลังดำเนินการ
- รอปิดงาน
- ส่งกลับให้แก้ไข
- ปิดงานแล้ว
- ยกเลิก

ทุกการเปลี่ยนสถานะต้องผ่านกฎ permission และต้องบันทึก Audit Trail

ตัวอย่าง rule:

- งานที่มีคนรับแล้ว ห้ามคนอื่นรับซ้ำ
- Technician รับงานได้เฉพาะ Category ตัวเอง
- Technician ยกเลิกงานไม่ได้
- Engineer ปิดงานได้เฉพาะ Category ตัวเอง
- งานที่ยกเลิกแล้วพิมพ์ใบปิดงานไม่ได้
- งานที่ยังไม่ปิด พิมพ์ใบปิดงานไม่ได้

### Dashboard & Reporting Module

ใช้แนวคิด **Read Model / Query Layer** สำหรับสรุปข้อมูล Dashboard

Dashboard ต้องรองรับ:

- จำนวนงานทั้งหมด
- จำนวนตามสถานะ
- จำนวนตาม Category
- จำนวนตาม Zone
- จำนวนตามความเร่งด่วน
- งานค้างตาม SLA
- งานแจ้งใหม่รายวันในเดือนที่เลือก
- งานปิดแล้วรายเดือน
- รายการล่าสุด

ตัวกรอง:

- เดือน/ปี
- สถานะ
- Category
- Zone
- ความเร่งด่วน
- ผู้รับงาน
- หน่วยงานผู้แจ้ง
- คำค้นหา

Export Excel ใช้ filter ชุดเดียวกับ Dashboard และ All CM Work List

### Completion Document Module

ดูแลใบสรุปปิดงาน CM:

- สร้าง print view จาก CM Work ที่ปิดแล้ว
- ใช้เลข CM Work Number เป็นเลขเอกสาร
- ดึงลายเซ็นจาก profile ของ Technician/Engineer
- ถ้าไม่มีลายเซ็น ให้เว้นช่องลายเซ็นว่างและแจ้งเตือนในระบบ
- Public user และ Requester พิมพ์ไม่ได้
- ทุก role ที่ล็อกอินพิมพ์งานที่ปิดแล้วได้ทุก Category

เอกสารเป็น view สำหรับพิมพ์/PDF ไม่ควรแก้ข้อมูลโดยตรงจากหน้าเอกสาร

### Admin Back Office Module

ดูแลข้อมูลตั้งต้นและการตั้งค่าระบบ:

- User management
- Role/category assignment
- Signature management
- Zone management
- Category management
- SLA settings
- Audit view
- Report export

Zone และ Category ที่เคยถูกใช้กับงานแล้วไม่ควรถูกลบ ให้ใช้ deactivate แทน

### Audit Trail Module

ใช้ **Audit Trail Architecture** เพื่อเก็บประวัติการเปลี่ยนแปลงที่สำคัญ

เหตุการณ์ที่ต้องบันทึก:

- สร้าง Repair Request
- รับงาน
- ปล่อยงานคืนคิว
- เปลี่ยนสถานะ
- ส่งกลับให้แก้ไข
- ปิดงาน
- ยกเลิกงานพร้อมเหตุผล
- เปลี่ยนความเร่งด่วน
- Admin แก้ไขงานที่ปิดแล้ว
- แก้ master data ที่มีผลกับระบบ

ข้อมูล audit อย่างน้อย:

- Entity ที่ถูกแก้
- Action
- ผู้ทำรายการ
- วันเวลา
- ค่าเดิมและค่าใหม่เมื่อเหมาะสม
- เหตุผลเมื่อเป็น action ที่ต้องใส่เหตุผล

## Data Architecture

ใช้ **Relational Data Model** เป็นฐาน เพราะข้อมูลมีความสัมพันธ์ชัดเจนและต้อง query/filter/report บ่อย

กลุ่มตารางหลักที่ควรมี:

- users
- roles
- categories
- zones
- repair_requests หรือ cm_works
- cm_work_status_history
- cm_work_audit_events
- sla_settings
- signatures หรือ signature file metadata

หมายเหตุ: จะใช้ตาราง `repair_requests` แยกจาก `cm_works` หรือรวมเป็นตารางเดียวสามารถตัดสินใจตอน implementation plan ได้ แต่ในเชิงโดเมนต้องยังแยกความหมายว่า Repair Request คือเรื่องที่แจ้งเข้ามา และ CM Work คือรายการงานที่ถูกจัดการต่อ

## File Storage Architecture

ไฟล์ลายเซ็นใช้แนวคิด **Managed File Storage**

เก็บ metadata ในฐานข้อมูล:

- owner user id
- file name
- mime type
- file size
- storage path
- uploaded at

ข้อกำหนด:

- รองรับ PNG/JPG
- จำกัดขนาดไม่เกิน 2 MB
- ไม่ใช้ไฟล์ลายเซ็นจาก public path โดยตรงถ้าไม่มีการควบคุมสิทธิ์
- หน้าเอกสารปิดงานดึงลายเซ็นผ่านระบบ ไม่อัปโหลดใหม่ตอนปิดงาน

## UI Architecture

ใช้ **Public Area + Authenticated App Shell**

Public Area:

- Landing Page
- Public Dashboard
- Repair Request
- Public Tracking

Authenticated App Shell:

- Role Dashboard
- All CM Work List
- CM Work Detail
- Admin Back Office
- Profile
- Print View

Theme:

- Day/Night theme เป็น global UI state
- ค่าเริ่มต้นเลือกจากเวลาประเทศไทย
- 06:00-17:59 เริ่ม Day
- 18:00-05:59 เริ่ม Night
- ผู้ใช้สลับเองได้ระหว่างใช้งาน

## Security Architecture

หลักความปลอดภัยรอบแรก:

- Password ต้องเก็บแบบ hash
- Public endpoint ต้องจำกัดข้อมูลที่ส่งออก
- ทุก action หลังล็อกอินต้องตรวจ role และ category
- Upload ลายเซ็นต้องตรวจชนิดไฟล์และขนาดไฟล์
- Print document ต้องตรวจว่าเป็นงานปิดแล้ว
- Admin edit หลังปิดงานต้องสร้าง audit event เสมอ
- Public tracking ต้องค้นด้วยเลขงานและแสดงข้อมูลพื้นฐานเท่านั้น

## Integration Architecture

รอบแรกยังไม่มี external integration

ยังไม่รวม:

- LINE notification
- Email notification
- Active Directory/LDAP
- ERP
- Inventory/spare parts system

Architecture นี้ยังเปิดทางให้เพิ่ม integration ในอนาคตผ่าน module แยก เช่น Notification Module หรือ ERP Sync Module

## Recommended Implementation Shape

ถ้าเริ่ม implement จริง โครงสร้างควรแยกตาม domain module มากกว่าแยกตามชนิดไฟล์อย่างเดียว

ตัวอย่าง logical structure:

```text
app/
  public-portal/
  auth/
  dashboard/
  cm-work/
  admin/
  reports/
  documents/
  profile/

domain/
  cm-work/
  users/
  master-data/
  audit/
  sla/

infrastructure/
  database/
  file-storage/
  export/
  print/
```

โครงนี้เป็นแนวทางระดับ Architecture ยังไม่ล็อก framework หรือภาษาโปรแกรมจนกว่าจะเริ่ม implementation plan

## Architecture Decision Summary

- ใช้ Modular Monolith ไม่ใช้ Microservices ในรอบแรก
- ใช้ Layered/Clean Architecture เพื่อแยก UI, business rules, data access
- ใช้ RBAC + Category Permission สำหรับสิทธิ์
- ใช้ Workflow State Machine สำหรับสถานะ CM Work
- ใช้ Relational Data Model สำหรับข้อมูลหลักและรายงาน
- ใช้ Audit Trail สำหรับ action สำคัญและการแก้ไขหลังปิดงาน
- ใช้ Managed File Storage สำหรับลายเซ็น
- ใช้ Public Area แยกจาก Authenticated App Shell
- ใช้ Read Model / Query Layer สำหรับ Dashboard และ Export

## Why These Architectures

### Modular Monolith

ใช้เพราะระบบ CM รอบแรกยังเป็นระบบเดียวที่มี workflow ต่อเนื่องกัน ตั้งแต่แจ้งซ่อม รับงาน ปิดงาน พิมพ์เอกสาร จนถึงรายงาน ถ้าแยกเป็น Microservices ตั้งแต่แรกจะเพิ่มความยากเรื่องการ deploy, การเชื่อมข้อมูล, auth ข้าม service และการตาม bug โดยยังไม่ได้ประโยชน์มากพอ

Modular Monolith ทำให้เริ่มสร้างได้เร็วเหมือนระบบเดียว แต่ยังแบ่ง module ชัด เช่น CM Work, Dashboard, Document, Admin และ Audit ถ้าอนาคตมีส่วนที่โตมาก เช่น Notification หรือ ERP Integration ค่อยแยกออกเป็น service ได้ง่ายกว่าเริ่มจากโครงที่ปนกันทั้งหมด

### Layered/Clean Architecture

ใช้เพื่อแยกหน้าจอ กฎธุรกิจ และฐานข้อมูลออกจากกัน ระบบนี้มีกฎเยอะ เช่น ใครรับงานได้, ใครปิดงานได้, งานสถานะไหนพิมพ์ได้, งานข้าม Category ทำอะไรได้บ้าง ถ้าเขียนกฎเหล่านี้ปนอยู่ในหน้า UI จะดูแลยากและเสี่ยง bug

แนวนี้ช่วยให้ business rules ของ CM อยู่ตรงกลาง เช่น workflow, permission, SLA และ audit ส่วน UI หรือฐานข้อมูลเป็นเพียงชั้นที่เรียกใช้งาน ทำให้เปลี่ยนหน้าตาเว็บหรือเปลี่ยนวิธีเก็บข้อมูลได้ง่ายขึ้นโดยไม่กระทบ logic หลักมากเกินไป

### RBAC + Category Permission

ใช้เพราะสิทธิ์ของระบบไม่ได้ดูแค่ role อย่างเดียว แต่ต้องดู Category ด้วย เช่น Engineer เห็นทุกงานได้ แต่ปิดงานได้เฉพาะงานไฟฟ้าหรือเครื่องกลของตัวเอง Technician ก็เช่นกัน รับงานได้เฉพาะ Category ตัวเอง

ถ้าใช้ RBAC อย่างเดียวจะต้องสร้าง role แยกเยอะ เช่น Engineer Electrical, Engineer Mechanical, Technician Electrical, Technician Mechanical และถ้าอนาคตมี Category เพิ่ม role จะบวมทันที การใช้ role + category จึงยืดหยุ่นกว่าและตรงกับวิธีทำงานจริง

### Workflow State Machine

ใช้เพราะงาน CM มีสถานะและทางเดินชัดเจน เช่น แจ้งใหม่, รับเรื่องแล้ว, กำลังดำเนินการ, รอปิดงาน, ปิดงานแล้ว, ยกเลิก แต่ละสถานะมี action ที่อนุญาตไม่เหมือนกัน

State Machine ช่วยกันสถานะผิดลำดับ เช่น งานที่ยกเลิกแล้วกลับไปปิดงาน, งานที่ยังไม่รอปิดแต่วิศวกรกดปิด, หรือช่างข้าม Category มากดรับงาน วิธีนี้ทำให้ workflow ตรวจสอบง่ายและ Dashboard เชื่อถือได้

### Relational Data Model

ใช้เพราะข้อมูลระบบนี้มีความสัมพันธ์ชัดเจน เช่น งาน CM ผูกกับ Category, Zone, ผู้แจ้ง, ผู้รับงาน, สถานะ, audit, SLA และต้อง filter/report บ่อย การใช้ฐานข้อมูลเชิงสัมพันธ์เหมาะกับ query แบบนี้มาก

Dashboard และ Export ต้องกรองตามเดือน สถานะ Category Zone ความเร่งด่วน ผู้รับงาน และหน่วยงานผู้แจ้ง ฐานข้อมูล relational ช่วยให้จัดการเงื่อนไขเหล่านี้ได้เป็นระบบและรักษาความถูกต้องของข้อมูลย้อนหลังได้ดี

### Audit Trail Architecture

ใช้เพราะงาน CM และเอกสารปิดงานเป็นหลักฐานการทำงาน โดยเฉพาะเมื่อปิดงานแล้ว ถ้ามีการแก้ไขย้อนหลังต้องรู้ว่าใครแก้ แก้เมื่อไร และแก้อะไร

Audit Trail ยังช่วยกับเหตุการณ์สำคัญ เช่น รับงาน ปล่อยคืนคิว ส่งกลับให้แก้ ยกเลิก ปิดงาน และเปลี่ยนความเร่งด่วน ทำให้ตรวจสอบย้อนหลังได้และลดปัญหา “ข้อมูลเปลี่ยนแต่ไม่รู้ว่าเกิดอะไรขึ้น”

### Managed File Storage

ใช้เพราะลายเซ็นเป็นไฟล์ที่ผูกกับโปรไฟล์ผู้ใช้ ไม่ใช่ข้อมูลข้อความธรรมดา ระบบต้องควบคุมชนิดไฟล์ ขนาดไฟล์ path และสิทธิ์การเข้าถึง

การเก็บแบบ Managed File Storage ทำให้เอกสารปิดงานดึงลายเซ็นจาก profile ได้อัตโนมัติ และยังเปลี่ยนที่เก็บไฟล์ในอนาคตได้ เช่น จาก local storage ไปเป็น cloud/object storage โดยไม่ต้องเปลี่ยน logic ของเอกสารมาก

### Public Area + Authenticated App Shell

ใช้เพราะระบบมีผู้ใช้สองกลุ่มที่ต่างกันมาก กลุ่มแรกคือผู้แจ้งซ่อมที่ไม่ต้อง login ใช้แค่แจ้งซ่อมและติดตามสถานะพื้นฐาน อีกกลุ่มคือผู้ใช้ภายในที่ต้อง login และทำงานตาม role

การแยก Public Area กับ Authenticated App Shell ช่วยลดความเสี่ยงข้อมูลภายในรั่ว เช่น note ช่าง, note วิศวกร, audit trail และลายเซ็น อีกทั้งยังทำให้ UX ของผู้แจ้งซ่อมง่าย ไม่ต้องเจอเมนูหลังบ้านที่ไม่เกี่ยวข้อง

### Read Model / Query Layer

ใช้เพราะ Dashboard และ Export ต้องอ่านข้อมูลสรุปจำนวนมากจากหลายมุม เช่น จำนวนตามสถานะ, Category, Zone, ความเร่งด่วน, SLA, งานรายวัน และงานปิดรายเดือน ถ้าดึง logic พวกนี้ปนกับหน้าจอหรือ workflow หลัก จะทำให้ระบบยุ่งเร็ว

Read Model / Query Layer แยกการอ่านเพื่อรายงานออกจากการเขียน workflow ทำให้ปรับกราฟ filter หรือ export ได้ง่าย โดยไม่กระทบ logic สำคัญอย่างการรับงาน ปิดงาน หรือ audit
