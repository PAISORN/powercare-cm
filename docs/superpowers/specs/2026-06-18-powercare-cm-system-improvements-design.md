# PowerCare.CM System Improvements Design

วันที่: 18 มิถุนายน 2569
สถานะ: อนุมัติแนวทางแล้ว รอผู้ใช้ตรวจ Design Spec ก่อนจัดทำ Implementation Plan

## 1. เป้าหมาย

ปรับปรุง PowerCare.CM ให้รองรับการวิเคราะห์งานตามช่วงเวลาไทย ใช้งานบนมือถือได้สมบูรณ์ และเพิ่มระบบสมาชิก ประกาศ การแจ้งเตือน และ LINE Bot โดยไม่เปลี่ยน Production จนกว่าจะผ่านการทดสอบและได้รับคำสั่ง Deploy

ผลลัพธ์หลัก:

- กรองข้อมูลตามวัน ช่วงวันที่ เดือน ปี และทั้งหมดได้ด้วยกติกาเดียวกันทุกหน้า
- เวลาและขอบเขตวันตรงกับประเทศไทย
- Dashboard, Profile, Navigation และกราฟใช้งานบนมือถือได้ดี
- ทุก Role ดูรายชื่อสมาชิกได้ โดยสถิติภาระงานจำกัดเฉพาะ Admin และ Engineer
- Admin จัดการประกาศบน Public ได้
- มีการแจ้งเตือนในเว็บแบบ Facebook/Instagram แยกตามผู้ใช้
- ส่งเหตุการณ์งานซ่อมเข้า LINE กลุ่มผ่าน LINE Messaging API และให้ Admin เลือกเหตุการณ์ได้
- Report กรองก่อนดาวน์โหลด Excel หรือ PDF ได้
- ทุกหน้ามีพื้นหลังเฟืองที่รักษาสัดส่วนและ Motion แบบสุภาพ

## 2. สิ่งที่ไม่รวมในรอบนี้

- ไม่ใช้ LINE Notify เนื่องจากบริการยุติแล้ว
- ไม่ทำระบบแชทระหว่างสมาชิก
- ไม่แนบไฟล์เอกสารหลายไฟล์ในประกาศ รอบแรกอนุญาตรูปประกอบหนึ่งรูปเท่านั้น
- ไม่เปลี่ยนกติกาการรับงานตาม Category เดิม
- ไม่ Deploy หรือแก้ Production Database ระหว่างออกแบบและพัฒนาโดยไม่ได้รับอนุมัติ

## 3. แนวทางส่งมอบ

ใช้การพัฒนาแบบแบ่งระยะบน branch แยก:

1. เวลาไทย ตัวกรองวัน/เดือน/ปี Responsive Sidebar และ Profile
2. Dashboard กราฟ Members และ Report
3. Announcements และ In-app Notifications
4. LINE Bot, Scroll Motion และพื้นหลังเฟือง

แต่ละระยะต้องผ่าน Unit Test, Integration Test และ Responsive Browser Verification ก่อนเริ่มระยะถัดไป

## 4. เวลาไทยและตัวกรองกลาง

### 4.1 มาตรฐานเวลา

- ฐานข้อมูลเก็บ timestamp เป็น UTC
- การแสดงผล การสร้างขอบเขต query และการรวมข้อมูลใช้ timezone `Asia/Bangkok`
- รูปแบบที่ผู้ใช้เห็นคือ `วัน/เดือน/ปี พ.ศ. เวลา 24 ชั่วโมง` เช่น `18/06/2569 14:30 น.`
- ห้ามบวกหรือลบ 7 ชั่วโมงด้วยตนเองในแต่ละหน้า ให้ผ่าน utility กลางเท่านั้น
- วันเริ่มต้นเริ่มที่ `00:00:00.000` เวลาไทย
- วันสิ้นสุดรวมถึง `23:59:59.999` เวลาไทย

### 4.2 รูปแบบตัวกรอง

ตัวกรองกลางรองรับ:

- รายวัน
- วันเริ่มต้นและวันสิ้นสุด
- เดือน
- ปี
- ดูทั้งหมด
- Category: Overview, Mechanical, Electrical
- ตัวเลือก `รวมงานปิด/ยกเลิก`

Dashboard, Public Dashboard, CM Work List, Members และ Report ต้องใช้ parser, validation และ query boundary ชุดเดียวกัน

### 4.3 ความหมายของผลลัพธ์ตามช่วงวันที่

เมื่อเลือกช่วงวันที่:

1. เลือกงานที่ถูกสร้างหรือมีการเปลี่ยนสถานะภายในช่วงเวลาไทยที่กำหนด
2. สำหรับงานแต่ละรายการ แสดงสถานะล่าสุดที่เกิดขึ้นภายในช่วงนั้น
3. หากไม่มี status event แต่ถูกสร้างในช่วงนั้น ให้ถือสถานะเริ่มต้นเป็น `แจ้งใหม่`
4. หากสถานะปัจจุบันของงานเป็น `ปิดงานแล้ว` หรือ `ยกเลิก` ให้ตัดออกตามค่าเริ่มต้น แม้เคยมี activity ในช่วงที่เลือก
5. เมื่อเปิด `รวมงานปิด/ยกเลิก` ให้แสดงงาน terminal เหล่านั้น และยังใช้สถานะล่าสุดภายในช่วงที่เลือกเพื่ออธิบายภาพของช่วงเวลา

ตัวอย่าง: งานอยู่สถานะ `รอปิดงาน` วันที่ 15 มกราคม และปิดวันที่ 2 กุมภาพันธ์ เมื่อดู 1-31 มกราคม งานจะไม่แสดงตามค่าเริ่มต้นเพราะปัจจุบันปิดแล้ว แต่จะแสดงเป็น `รอปิดงาน` หากเปิด `รวมงานปิด/ยกเลิก`

### 4.4 การรวมช่วงเวลาในกราฟ

- ช่วงไม่เกิน 31 วัน: รวมเป็นรายวันและใช้ชื่อ `Daily CM Trend`
- ช่วง 32-180 วัน: รวมเป็นรายเดือน
- ช่วงมากกว่า 180 วัน: รวมเป็นรายเดือนและรองรับ horizontal scroll
- ค่าเริ่มต้นของ Monthly CM Trend คือ 6 เดือน

## 5. Responsive App Shell และ Navigation

### 5.1 Desktop

- คง Sidebar ซ้ายแบบ fixed
- เมนูและข้อมูลผู้ใช้แสดงตาม Role
- เพิ่ม Members และ Notifications ในตำแหน่งที่เข้าถึงง่าย

### 5.2 Mobile

- แถบบนมีปุ่ม Home และปุ่ม Menu อยู่ติดกัน
- ปุ่ม Menu เปิด navigation drawer แบบ slide-in จากซ้าย
- Drawer แสดงรูป ชื่อ Role, Category, เมนูตามสิทธิ์ และ Logout
- แตะ overlay, กด Escape หรือเลือกเมนูแล้ว Drawer ปิด
- Focus ต้องอยู่ใน Drawer ขณะเปิดและกลับสู่ปุ่ม Menu หลังปิด
- เป้าหมายการแตะมีขนาดอย่างน้อย 44x44 px
- จำนวน notification ที่ยังไม่อ่านแสดงใน top bar และ drawer ด้วยค่าเดียวกัน

## 6. Profile

หน้า Profile ใช้ Mobile-first layout:

- Header แสดงรูป ชื่อ Role และ Category
- Identity section แสดงชื่อ Department, Role และ Category แบบ read-only
- ผู้ใช้แก้ไขรูปโปรไฟล์ ลายเซ็น และรหัสผ่านตนเองได้
- ชื่อ Department, Role และ Category แก้ได้โดย Admin เท่านั้น
- แสดง preview ของรูปและลายเซ็นก่อนบันทึก
- การอัปโหลดใหม่ใช้การแทนที่ไฟล์เดิมตามกติกาปัจจุบัน
- แสดง loading, success และ error state ที่อ่านได้ชัดบนมือถือ

## 7. Dashboard และ CM Trend

ตัวกรองกลางต้องควบคุมพร้อมกัน:

- Status KPI cards
- Status Overview
- Daily/Monthly CM Trend
- Plant Zone Workload
- Priority Work Queue
- Work Results

### 7.1 รูปแบบ Trend ที่อนุมัติ

- คงแนวทางกราฟเดิมและใช้รูปแบบ A: สองแท่งต่อช่วงเวลา
- แท่งแรกคือจำนวนงานแจ้งซ่อมใหม่
- แท่งที่สองเป็น stacked bar แยกสีของสถานะงานที่ยังไม่ปิด
- แท่งกว้างขึ้นและช่องว่างระหว่างเดือนลดลง
- กลุ่มของแต่ละเดือนอยู่ใกล้กัน แต่ label ต้องไม่ชนกัน
- Legend ใช้สีเดียวกับ Status Overview
- กราฟ animate จากฐานขึ้นสู่ค่าเป้าหมายเมื่อเข้าหน้าจอครั้งแรก
- เมื่อ `prefers-reduced-motion` ทำงาน ให้แสดงค่าปลายทางโดยไม่มี animation

## 8. Members

### 8.1 สิทธิ์

- ทุก Role ดูรายชื่อสมาชิก รูป ชื่อ Role, Department และ Category ได้
- Admin และ Engineer เห็นจำนวนงานที่กำลังรับผิดชอบและงานที่ปิดแล้ว
- Technician ไม่เห็นตัวเลขภาระงานของผู้อื่น
- Admin และ Engineer กดสมาชิกเพื่อดูรายการงานได้
- การเพิ่ม แก้ไข ลบ หรือ reset password ยังคงเป็นสิทธิ์ Admin

### 8.2 ตัวกรองและตัวเลข

รองรับรายวัน ช่วงวันที่ เดือน ปี Category และดูทั้งหมด ค่าเริ่มต้นเป็นเดือนปัจจุบัน

- `กำลังรับผิดชอบ`: งานที่ claimant เป็นสมาชิกคนนั้นและสถานะปัจจุบันไม่ใช่ Closed/Cancelled โดยต้องมี activity ในช่วงที่เลือก
- `ปิดแล้ว`: งานที่สมาชิกเป็นผู้ดำเนินการ/ผู้รับผิดชอบและมี Closed event ในช่วงที่เลือก
- Cancelled ไม่นับเป็น Closed

หน้า Members เป็นข้อยกเว้นจากการซ่อน terminal status เพราะ Closed metric เป็นข้อมูลที่ผู้ใช้ร้องขอโดยตรง

## 9. Reports

หน้า Report ต้องแก้ข้อความภาษาไทยที่เสีย encoding และรองรับตัวกรอง:

- วันหรือช่วงวันที่ เดือน ปี และทั้งหมด
- Status
- Category
- Zone
- Urgency
- Claimant
- Requester และ Requester Department
- Machine Name
- CM Number

ก่อน Export ต้องแสดง:

- จำนวนรายการ
- filter summary
- preview ของข้อมูลส่วนแรก
- ปุ่ม Export Excel และ Export PDF

Excel เหมาะสำหรับวิเคราะห์ข้อมูล ส่วน PDF ใช้เป็นรายงานสรุปที่อ่านและพิมพ์ได้ การ Export ต้องใช้ query/filter เดียวกับ preview เพื่อป้องกันข้อมูลไม่ตรงกัน

## 10. Public Announcements

Admin สามารถสร้าง แก้ไข ปิดใช้งาน และลบประกาศ โดยประกาศประกอบด้วย:

- หัวข้อ
- เนื้อหา
- รูปประกอบไม่เกินหนึ่งรูป
- วันเริ่มเผยแพร่
- วันสิ้นสุดเผยแพร่
- สถานะปักหมุด
- สถานะ active/inactive

กติกาแสดงผล:

- แสดงเฉพาะประกาศ active ที่เวลาไทยอยู่ในช่วงเผยแพร่
- ประกาศปักหมุดอยู่ด้านบน โดยเรียงประกาศใหม่ก่อนภายในกลุ่มเดียวกัน
- ป้าย `NEW` แสดงอัตโนมัติสามวันนับจากวันเริ่มเผยแพร่
- ประกาศหมดอายุหายจาก Public แต่คงอยู่ใน Admin history

## 11. In-app Notifications

การแจ้งเตือนทำงานแยกต่อ User แบบ Facebook/Instagram:

- ไอคอนกระดิ่งแสดง badge สีแดงเป็นจำนวน unread
- ค่าสูงกว่า 99 แสดง `99+`
- รายการ unread มี visual highlight
- กดรายการแล้วบันทึก `readAt` และเปิดปลายทางที่เกี่ยวข้อง
- มีคำสั่ง `อ่านทั้งหมดแล้ว`
- การเปิดหน้าเว็บเพียงอย่างเดียวไม่เปลี่ยน unread เป็น read

เหตุการณ์ที่สร้าง notification:

- งานแจ้งซ่อมใหม่ใน Category ที่เกี่ยวข้อง
- มีผู้รับงานหรือเปลี่ยนผู้รับผิดชอบ
- เปลี่ยนสถานะ
- ส่งกลับให้แก้ไข
- รอปิดงาน
- ปิดงานแล้ว
- ยกเลิกงาน
- มีประกาศใหม่

ผู้รับ notification ต้องผ่าน Role/Category permission และต้องมีสิทธิ์เปิด entity ปลายทาง การตรวจสิทธิ์ทำซ้ำอีกครั้งเมื่อเปิด notification เพื่อป้องกันการเข้าถึงข้อมูลจากสิทธิ์เก่า

## 12. LINE Messaging API

ใช้ LINE Official Account และ Messaging API แทน LINE Notify

Admin มีหน้า LINE Notification Settings สำหรับ:

- เพิ่มหรือปิดใช้งาน destination group
- ตั้งชื่อกลุ่มในระบบ
- เลือก Category: All, Mechanical หรือ Electrical
- เปิด/ปิด event type แยกต่อกลุ่ม
- ส่งข้อความทดสอบ
- ดูประวัติการส่งและข้อความผิดพลาด

Event ที่รองรับ: New Request, Claimed, Reassigned, Status Changed, Returned, Waiting Close, Closed และ Cancelled

การส่ง LINE เป็น side effect หลัง transaction หลักสำเร็จ หาก LINE ล้มเหลว:

- ห้าม rollback การสร้างหรือเปลี่ยนสถานะงาน
- บันทึก delivery log เป็น failed
- เก็บ error แบบไม่รวม secret
- ให้ Admin กด retry ได้
- จำกัดจำนวน retry และป้องกันข้อความซ้ำด้วย event/delivery id

Channel access token และ secret เก็บใน server environment เท่านั้น ห้ามส่งให้ client หรือบันทึกลง Git

## 13. พื้นหลังและ Motion

- ทุกหน้าใช้ลายเฟืองที่คง aspect ratio
- กำหนดขนาด ตำแหน่ง และจำนวนลายแยก Desktop/Tablet/Mobile
- ลดจำนวนลายบนจอแคบแทนการยืดหรือบีบภาพ
- Day/Night ใช้ opacity และ contrast คนละค่า
- ลายต้องไม่ลดความอ่านง่ายของข้อความ ตาราง ฟอร์ม และเอกสารพิมพ์
- Print stylesheet ไม่แสดงพื้นหลังเฟือง
- Section reveal ใช้แนว AOS `fade-up` ระยะ 250-350 ms และเล่นครั้งเดียว
- ไม่ใช้ animation กับ action ที่ต้องตอบสนองทันที และรองรับ `prefers-reduced-motion`

## 14. โครงสร้างข้อมูลเชิงแนวคิด

เพิ่มหรือขยายข้อมูลดังนี้:

- `CmStatusHistory`: work, fromStatus, toStatus, actor, occurredAt
- `Announcement`: title, content, image metadata, publishStart, publishEnd, pinned, active, author
- `UserNotification`: recipient, eventType, entityType, entityId, title, message, createdAt, readAt
- `LineDestination`: displayName, group identifier, category scope, active
- `LineEventSetting`: destination, eventType, enabled
- `LineDeliveryLog`: destination, event id, status, attempts, error summary, sentAt

ต้องมี index สำหรับ status history time/work, notification recipient/read/created, announcement publish window และ LINE delivery event/status

ไฟล์รูปประกาศใช้ Supabase Storage และฐานข้อมูลเก็บ metadata/path ตามรูปแบบเดียวกับรูปโปรไฟล์และลายเซ็น

## 15. Data Flow

### 15.1 การเปลี่ยนสถานะงาน

1. ตรวจ session, role, category และ state transition
2. บันทึกสถานะงานและ status history ใน transaction เดียวกัน
3. สร้าง in-app notification สำหรับผู้รับที่เกี่ยวข้อง
4. สร้าง LINE delivery jobs ตาม Admin settings
5. ส่ง LINE หลัง transaction สำเร็จและบันทึกผล

### 15.2 การเปิด Notification

1. โหลด notification ของ current user
2. ตรวจสิทธิ์ entity ปลายทาง
3. บันทึก readAt แบบ idempotent
4. เปิดหน้า entity หรือแสดงข้อความว่ารายการไม่สามารถเข้าถึงได้แล้ว

### 15.3 การ Export Report

1. Parse และ validate filter กลาง
2. แสดง preview และ count
3. ส่ง filter เดิมไป export endpoint
4. Query และสร้างไฟล์ฝั่ง server
5. บันทึก audit event ของการ export

## 16. Error Handling

- Filter ไม่ถูกต้อง: แสดงข้อความใกล้ input และไม่ query
- วันสิ้นสุดก่อนวันเริ่ม: ปฏิเสธพร้อมคำแนะนำ
- Upload รูปประกาศล้มเหลว: ไม่บันทึกประกาศครึ่งหนึ่งและลบไฟล์ orphan เมื่อทำได้
- Notification target ถูกลบ: mark read และแสดงว่าไม่มีรายการแล้ว
- LINE API ล้มเหลว: งานหลักสำเร็จตามปกติและ Admin เห็น failed delivery
- Export มีข้อมูลมาก: ใช้ streaming หรือแบ่ง batch โดยไม่โหลดทุก row เข้า memory พร้อมกัน

## 17. Security

- ทุก server action และ route ตรวจ session และ role ฝั่ง server
- ห้ามพึ่งการซ่อนปุ่มใน UI เป็น authorization
- Notification query จำกัด recipient เป็น current user
- Members workload details จำกัด Admin/Engineer
- Announcement mutation และ LINE settings จำกัด Admin
- Upload ตรวจ MIME type, extension และขนาดไฟล์
- Secrets อยู่ใน environment variables ที่ไม่ขึ้นต้นด้วย `NEXT_PUBLIC_`
- Audit การสร้าง/แก้/ลบประกาศ การแก้ LINE settings การ retry และการ export

## 18. Testing

### 18.1 Unit Tests

- Bangkok day boundary และ พ.ศ. formatting
- Filter parser และ invalid ranges
- Historical latest-status selection
- Terminal-status exclusion และ include toggle
- Daily/monthly bucket selection
- Announcement `NEW` และ publish window
- Notification recipient and unread count
- LINE event routing by category and settings

### 18.2 Integration Tests

- Status update สร้าง history และ notifications ถูกต้อง
- Member metrics แยก active/closed ถูกต้อง
- Report preview และ export ใช้ filter เดียวกัน
- Read one/read all แยกต่อ user
- LINE failure ไม่ rollback CM transaction
- Permission matrix ของ Members, Announcements, Notifications และ Reports

### 18.3 Browser and Responsive Tests

- Desktop, tablet และ mobile widths
- Drawer open/close, focus และ role-based links
- Profile upload preview และ success/error states
- Dashboard filter updates ทุก panel
- Trend chart labels ไม่ชนและ scroll ได้
- Day/Night background readability
- Reduced motion behavior

## 19. Release Safety

- พัฒนาบน `codex/cm-system-improvements` ไม่แก้ Production Branch โดยตรง
- ห้าม push/merge เข้า `master` จนกว่าผู้ใช้อนุมัติ
- งาน schema ต้องมี migration ที่ review ได้
- ก่อน migration Production ต้อง backup และทดสอบ restore
- เนื่องจาก local ปัจจุบันชี้ Production Supabase ห้ามใช้ mutation test กับข้อมูลจริง ให้แยก Development Supabase ก่อนขั้น implementation ที่แตะข้อมูล
- Vercel Preview ต้องใช้ Development environment/database ไม่ใช้ Production credentials

## 20. Acceptance Criteria

- ทุกหน้าที่กำหนดแสดงเวลาไทยและกรองขอบเขตวันถูกต้อง
- งานที่มี status activity ในช่วงถูกเลือกตามกติกา และ Closed/Cancelled ถูกซ่อนตามค่าเริ่มต้น
- Dashboard/Public/Work List/Report ให้ผลสอดคล้องกันจาก filter เดียวกัน
- Mobile drawer ใช้งานทุกเมนูตาม Role ได้
- Profile ใช้งานที่ความกว้าง 320 px ขึ้นไปโดยไม่มี overflow แนวนอน
- Members privacy ตรงตาม Role
- ประกาศใหม่ ปักหมุด และหมดอายุทำงานตามเวลาไทย
- Unread badge ลดเมื่ออ่าน และแยกต่อ user
- Admin เปิด/ปิด LINE event ต่อกลุ่มและทดสอบได้
- LINE failure ไม่ทำให้งาน CM ล้มเหลว
- Report preview, Excel และ PDF ให้ข้อมูลตรงกัน
- Trend chart ใช้สองแท่ง กว้างขึ้น ระยะเดือนกระชับ และ responsive
- พื้นหลังเฟืองไม่เพี้ยนและไม่ปรากฏในเอกสารพิมพ์
