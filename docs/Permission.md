# PowerCare.CM Permission Context

เอกสารนี้เป็น context กลางของระบบสิทธิ์สำหรับ PowerCare.CM ใช้เป็นแนวทางเดียวกันสำหรับเมนู, server action, API, dashboard, report, organization chart และฟีเจอร์อนาคต เช่น Store / Inventory / Asset

## Role หลัก

| Role | ความหมาย | Scope |
| --- | --- | --- |
| `ADMIN` / Owner Admin | เจ้าของระบบสูงสุด | ทุก Organization / ทุก Site |
| `ORGANIZATION_ADMIN` / Organization Admin | ผู้ดูแลระดับบริษัทหรือองค์กร | เฉพาะ Organization ของตัวเอง |
| `SITE_ADMIN` / Site Admin | ผู้ดูแลระดับโรงงานหรือ Site | เฉพาะ Site ของตัวเอง และสิทธิ์เสริมตาม checkbox |
| `ENGINEER` | วิศวกรตรวจรับ/ควบคุมงาน | เฉพาะ Site และ Category ที่ได้รับสิทธิ์ |
| `TECHNICIAN` | ช่างซ่อมบำรุง | เฉพาะ Site และ Category ที่ได้รับสิทธิ์ |
| `STORE_OFFICER` / Store Officer | ผู้ดูแลคลังอะไหล่ | เฉพาะ Site และ Store ที่ได้รับสิทธิ์ |
| `VISITOR` | ผู้เข้าชม read-only | ดูข้อมูลได้อย่างเดียว |
| Public Requester | ผู้แจ้งซ่อมทั่วไป ไม่ต้อง login | ใช้ได้เฉพาะ public request/tracking ผ่านลิงก์หรือ QR ของ Site |

หมายเหตุ: ในโค้ดใช้ `RoleName.ADMIN` แทน Owner Admin เพื่อเลี่ยงการเปลี่ยน role ครั้งใหญ่ในฐานข้อมูลเดิม

## ลำดับโครงสร้างข้อมูล

1. Owner Admin สร้าง Organization ก่อน
2. Owner Admin สร้าง Organization Admin และผูกกับ Organization นั้น
3. Owner Admin หรือ Organization Admin สร้าง Site ภายใต้ Organization
4. Owner Admin หรือ Organization Admin สร้าง Site Admin และผูกกับ Site นั้น
5. Site Admin สร้าง Engineer, Technician และ Visitor ภายใน Site ของตัวเองได้เมื่อ Owner Admin เปิด permission ให้
6. Public Requester ใช้ลิงก์หรือ QR ของแต่ละ Site เพื่อแจ้งซ่อมโดยไม่ต้องมี user

## หลักการสิทธิ์

1. Owner Admin เห็นและจัดการได้ทุก Organization, Site และ User
2. Organization Admin เห็นเฉพาะ Organization ของตัวเอง และไม่เห็น Organization Admin ขององค์กรอื่น
3. Site Admin ถูกล็อกด้วย `plantId` ของตัวเองเสมอ
4. Site Admin ต้องได้รับ checkbox permission ก่อนจึงจะสร้าง/แก้ไข/ลบ user หรือจัดการ configuration บางอย่างได้
5. Engineer และ Technician ถูกจำกัดด้วย Site และ Category ที่ได้รับสิทธิ์ โดยรองรับหลาย Category ผ่าน `UserCategory`
6. Visitor เป็น read-only ทั้งหน้าเว็บและฝั่ง server action/API
7. การซ่อนเมนูไม่เพียงพอ ทุก action ที่กระทบข้อมูลต้องตรวจ permission ฝั่ง server เสมอ
8. ข้อมูลใหม่ที่รองรับหลายองค์กรควรมี `organizationId` และเมื่อเกี่ยวกับโรงงานควรมี `plantId` เสมอ

## Site Admin Configurable Permissions

สิทธิ์ต่อไปนี้เป็น checkbox permission สำหรับ Site Admin โดยค่าเริ่มต้นควรเป็น `OFF`

| Permission key | ความหมาย | กลุ่ม |
| --- | --- | --- |
| `assign_work` | มอบหมายงาน | Assignment / Control |
| `reassign_work` | เปลี่ยนผู้รับผิดชอบงาน | Assignment / Control |
| `cancel_work` | ยกเลิกงาน | Assignment / Control |
| `record_cancel_reason` | ใส่เหตุผลการยกเลิกงาน | Assignment / Control |
| `close_work` | ปิดงาน | Assignment / Control |
| `export_reports` | Export Reports | Reports / Analytics |
| `manage_users_plant` | จัดการ Users เฉพาะ Site | User Management |
| `create_user` | สร้าง User ใหม่ | User Management |
| `update_user` | แก้ไข User | User Management |
| `deactivate_user` | ปิดใช้งาน User | User Management |
| `delete_user` | ลบ User | User Management |
| `reset_user_password` | Reset Password | User Management |
| `assign_user_role` | กำหนด Role ให้ User | User Management |
| `assign_user_plant` | กำหนด Site ให้ User | User Management |
| `assign_user_categories` | กำหนด Category ให้ User | User Management |
| `manage_plant_profile` | จัดการ Site Profile | Configuration |
| `manage_category` | จัดการ Category | Configuration |
| `manage_zone` | จัดการ Zone | Configuration |
| `manage_qr_code` | จัดการ QR Code | Configuration |
| `manage_line_settings` | จัดการ LINE Settings | Configuration |
| `manage_engineer_assignment` | เปิด/ปิด Engineer Assignment | Configuration |
| `manage_sla_due_date` | ตั้งค่า SLA / Due Date | Configuration |
| `manage_priority` | ตั้งค่า Priority | Configuration |
| `test_line_messaging` | ทดสอบ LINE Messaging | Communication |
| `view_feedback_plant` | ดู Feedback เฉพาะ Site | Feedback |
| `reply_feedback` | ตอบกลับ Feedback | Feedback |
| `export_feedback` | Export Feedback | Feedback |
| `view_audit_log_plant` | ดู Audit Log เฉพาะ Site | Security / Audit |
| `manage_store` | จัดการ Store ภายใน Site | Store / Inventory |
| `manage_spare_parts` | จัดการข้อมูลอะไหล่ | Store / Inventory |
| `view_store_stock` | ดูยอดคงเหลือ Stock | Store / Inventory |
| `receive_stock` | รับของเข้า Stock | Store / Inventory |
| `adjust_stock` | ปรับยอด Stock พร้อมเหตุผล | Store / Inventory |
| `view_store_reports` | ดูรายงาน Store | Store / Inventory |
| `enable_public_store_issue` | เปิด/ปิด Public Store Issue ของ Site | Store / Inventory |
| `require_public_issue_contact` | บังคับ/ซ่อนช่องทางติดต่อใน Public Store Issue | Store / Inventory |

## สิทธิ์ที่ควรล็อกไว้เฉพาะ Owner Admin

- สร้าง Organization
- ลบหรือปิดใช้งาน Organization
- สร้าง Organization Admin
- จัดการ Organization Admin ข้ามองค์กร
- จัดการประกาศระดับ platform ถ้าต้องการประกาศถึงทุกองค์กร
- ดู Feedback รวมทุก Organization
- กำหนด quota ระดับ Site เช่นจำนวน user และจำนวนใบแจ้งซ่อม

## สิทธิ์ของ Organization Admin

- ดูและจัดการเฉพาะ Organization ของตัวเอง
- สร้าง Site ภายใต้ Organization ของตัวเอง
- สร้าง Site Admin, Engineer, Technician และ Visitor ภายใน Organization ของตัวเอง
- ดู Dashboard, All Work, Members, Reports และ Audit ตาม scope ของ Organization
- ไม่สามารถสร้าง Owner Admin หรือ Organization Admin คนอื่นได้
- ไม่สามารถจัดการ Organization อื่นได้

## สิทธิ์ของ Site Admin

- ดูเฉพาะ Site ของตัวเอง
- จัดการ user ใน Site ตัวเองได้เฉพาะเมื่อ Owner Admin เปิด permission ให้
- กำหนด Category ให้ Engineer/Technician ได้เมื่อมี `assign_user_categories`
- จัดการ Category, Zone, QR Code, LINE Settings หรือ SLA ได้เมื่อมี permission เฉพาะเรื่องนั้น
- ไม่สามารถสร้าง Site Admin คนอื่นได้ เว้นแต่ในอนาคตจะมี permission เฉพาะและต้องผ่าน Owner Admin

## Store / Inventory ในอนาคต

เมื่อเพิ่มระบบ Store ควรยึด scope เดิม:

- Organization มีหลาย Site
- Site มี Store ได้หนึ่งหรือหลายคลัง
- Spare Part, Stock, Receive, Issue และ Stock Movement ต้องมี `organizationId` และ `plantId`
- การเบิกอะไหล่จากงาน CM ต้องผูกกับ `CmWork`, ผู้เบิก, Site และ Store
- การปรับยอด Stock ต้องทำผ่าน Stock Adjustment พร้อมเหตุผล ไม่แก้ยอดย้อนหลังแบบเงียบ
- Owner Admin เห็นทุก Store
- Organization Admin เห็น Store ทุก Site ใน Organization ตัวเอง
- Site Admin, Engineer และ Technician เห็น Store ตาม Site/permission ของตัวเอง
- Visitor ดูได้อย่างเดียวถ้าเปิดเมนูให้ดู
- Store Officer รับของเข้าและจ่ายของได้ภายใน Site ของตัวเอง
- Store Officer ทำ Stock Adjustment ได้ภายใน Site ของตัวเอง
- Site Admin ทำ Stock Adjustment ได้เฉพาะเมื่อ Owner Admin เปิด permission ให้
- Engineer และ Technician ไม่สามารถทำ Stock Adjustment
- Public Spare Part Issue Request ผ่านลิงก์หรือ QR ของ Site ต้องเปิดใช้งานโดย Owner Admin เท่านั้น
- Public Spare Part Issue Request ยังต้องผ่าน Engineer และ Store Officer ก่อนตัด Stock
- Owner Admin เป็นผู้กำหนดว่า Public Spare Part Issue Request ของแต่ละ Site ต้องแสดงหรือบังคับกรอกช่องทางติดต่อหรือไม่

รายงาน Store รอบแรกควรรองรับ:

- Stock คงเหลือ
- Low Stock
- รับเข้าในช่วงวันที่
- เบิกออกในช่วงวันที่
- เบิกตาม CM Work / Direct Issue

LINE Settings เดิมควรรองรับ Store events เพิ่มเติมแทนการสร้าง LINE Settings แยก:

- มีใบเบิกใหม่
- Engineer อนุมัติใบเบิกแล้ว
- Store Officer จ่ายของแล้ว
- ของไม่พอ
- Low Stock

## สิทธิ์ของ Store Officer

- เห็น Store เฉพาะ Site ของตัวเอง
- เห็นเมนู Spare Parts, Stock, Receive, Issue, Store Tracking, My Activities และ Store Reports
- รับของเข้าได้โดยไม่ต้องรออนุมัติ
- จ่ายของได้หลัง Engineer อนุมัติ
- กด Not Enough Stock หรือ Partial Issue ได้
- ทำ Stock Adjustment ได้พร้อมเหตุผล
- ไม่สามารถปิดงาน CM, จัดการ Users, จัดการ Organization, System Settings หรือ Site Admin Permissions

## Guardrail ที่ต้องรักษา

1. ทุก query ที่แสดงข้อมูลต้องผ่าน scope ของ user
2. ทุก server action/API ต้องตรวจ permission ก่อนแก้ข้อมูล
3. ทุกข้อมูลข้าม Organization ต้องถูกบล็อกสำหรับ Organization Admin ลงมา
4. ทุกข้อมูลข้าม Site ต้องถูกบล็อกสำหรับ Site Admin, Engineer, Technician และ Visitor
5. เอกสารปิดงาน, logo, signature และ profile photo ต้องดึงตาม Organization/Site ที่ถูกต้อง
6. Notification และ LINE destination ต้องผูกกับ Organization/Site ไม่ใช้ค่ากลางร่วมกัน

## ตาราง Permission ที่ใช้

```text
SiteAdminPermission
- id
- userId
- plantId
- permissionKey
- enabled
- grantedById
- createdAt
- updatedAt
```

Unique key:

```text
userId + plantId + permissionKey
```

## ลำดับการพัฒนาที่แนะนำ

1. ทำ permission helper กลางให้เป็น source of truth
2. เพิ่ม guardrail tests สำหรับทุก role/scope สำคัญ
3. ตรวจทุกหน้าให้ใช้ scope เดียวกัน
4. ทำ Organization Site Map ให้เป็นศูนย์จัดการ Organization/Site/User
5. ค่อยเพิ่ม Store / Inventory โดยใช้ scope เดิม ไม่สร้างระบบสิทธิ์ซ้ำ
