# Production Readiness Plan

เอกสารนี้เป็นจุดเริ่มต้นสำหรับทำให้เว็บ **PowerCare.CM** พร้อมใช้งานจริงในโรงไฟฟ้า โดยตรวจจากโค้ดและ architecture ปัจจุบัน ณ วันที่ 15 มิถุนายน 2026

## สถานะปัจจุบันโดยสรุป

ระบบตอนนี้อยู่ในระดับ **MVP ที่ใช้งาน demo/pilot ได้** แต่ยังไม่ควรเปิดใช้งานจริงกับข้อมูลสำคัญทันที จนกว่าจะจัดการ 5 เรื่องหลักก่อน:

1. ย้ายฐานข้อมูลจาก SQLite ไปฐานข้อมูล production
2. ทำ session/auth ให้ปลอดภัยขึ้น
3. ทำ service layer และ validation ให้ครอบคลุม admin/master data
4. ทำ file storage สำหรับรูปโปรไฟล์และลายเซ็นให้ทนต่อการ deploy/backup
5. ทำ workflow, audit, backup, และ pilot test ให้ครบก่อนส่งให้หน้างานใช้จริง

## Current Architecture Audit

### 1. Database

สถานะปัจจุบัน:

- Prisma ใช้ `sqlite` ผ่าน `DATABASE_URL`
- schema หลักครอบคลุม `User`, `Category`, `Zone`, `CmWork`, `StatusHistory`, `AuditEvent`, `SlaSetting`, `Signature`, `ProfilePhoto`
- มี migration และ seed สำหรับข้อมูลตั้งต้น

ข้อดี:

- โครงสร้าง relation หลักเหมาะกับ CM Work
- มี unique CM work number
- มี status history และ audit event แยกจากข้อมูลงานหลัก

ความเสี่ยงก่อนใช้งานจริง:

- SQLite ไม่เหมาะกับผู้ใช้หลายคนพร้อมกันใน production
- การออกเลข CM ใช้วิธีนับจำนวนของเดือนนั้นก่อนสร้างงาน ถ้ามีหลายคนแจ้งซ่อมพร้อมกันอาจชนเลขได้
- ยังไม่มีแผน backup/restore และ retention ชัดเจน

งานที่ต้องทำ:

- เปลี่ยน production database เป็น PostgreSQL หรือ MySQL
- เพิ่ม transaction หรือ retry logic สำหรับการสร้าง CM work number
- กำหนด backup รายวัน และทดสอบ restore จริง
- เพิ่ม index สำหรับ query ที่ใช้บ่อย เช่น `status`, `createdAt`, `categoryId`, `zoneId`, `claimantId`

### 2. Workflow

สถานะปัจจุบัน:

- มี state machine สำหรับสถานะหลัก
- CM Work action หลักใช้ service กลาง ได้แก่ create, claim, start, submit review, release, return, close, cancel
- permission สำหรับ claim/cancel/close แยกไว้ใน module

ข้อดี:

- แกน workflow ถูกต้องและต่อยอดได้
- role + category permission เริ่มถูกวางไว้ตามแนวคิดที่ตกลงกัน
- action สำคัญบันทึก audit แล้ว

ความเสี่ยงก่อนใช้งานจริง:

- ต้องทดสอบ flow จริงครบทุกสถานะกับข้อมูลหลาย category
- ต้องล็อก policy ให้ชัดว่า `NEW` กับ `WAITING_TO_CLAIM` ต่างกันอย่างไรในงานจริง
- ต้องตรวจทุกปุ่มในหน้า UI ว่าไม่สามารถข้าม service layer ได้

งานที่ต้องทำ:

- ทำ workflow acceptance test สำหรับ Electrical และ Mechanical
- ทดสอบกรณี claim พร้อมกันสองคน
- เพิ่ม test สำหรับการ cancel, return, release, close ทุก role
- เพิ่มข้อความ error ที่อ่านง่ายในหน้า UI แทนการ throw error เปล่า

### 3. Role And Permission

สถานะปัจจุบัน:

- Role หลักคือ Admin, Engineer, Technician
- Engineer/Technician ผูก category
- Admin เข้า back office ได้
- Public requester ไม่ต้อง login

ข้อดี:

- โครงสิทธิ์ตรงกับ requirement
- Technician เห็นงานข้าม category ได้ แต่ claim ได้เฉพาะ category ตัวเอง
- Engineer ปิด/ยกเลิกได้ตาม category

ความเสี่ยงก่อนใช้งานจริง:

- session cookie ปัจจุบันเก็บ `userId` ตรง ๆ ยังไม่มีการ sign/encrypt ด้วย `SESSION_SECRET`
- ยังไม่มี session expiry
- ยังไม่มี rate limit สำหรับ login
- การลบ user เป็น hard delete ซึ่งเสี่ยงต่อ audit ระยะยาว แม้จะ null reference แล้วก็ตาม

งานที่ต้องทำ:

- ใช้ signed session หรือ server-side session table
- เพิ่ม session expiry และ logout ทุก session เมื่อ reset password
- เพิ่ม login rate limit
- เปลี่ยน default policy ของการลบ user เป็น deactivate ก่อน ส่วน hard delete ต้องจำกัดเฉพาะกรณีพิเศษ
- เพิ่ม audit สำหรับ login, logout, failed login, password reset

### 4. Admin And Master Data

สถานะปัจจุบัน:

- Admin สร้าง/แก้ไข/ลบ user ได้
- Admin สร้าง/deactivate category และ zone ได้
- Admin แก้ SLA ได้
- มี audit บาง action แล้ว

ข้อดี:

- ฟีเจอร์หลังบ้านหลักครบตาม requirement ปัจจุบัน
- การลบ user มีการยืนยันรหัสผ่าน admin
- มีหน้า history/audit ให้ดูย้อนหลัง

ความเสี่ยงก่อนใช้งานจริง:

- หลาย admin action เขียน `db.*` ตรงจากหน้า ยังไม่ได้ผ่าน service layer กลาง
- validation ของ admin form ยังไม่แน่นเท่า repair request
- username ซ้ำ, password policy, role/category mismatch ต้องถูกจัดการเป็นข้อความที่ user เข้าใจ
- Category/Zone ที่ถูกใช้แล้วควร deactivate เท่านั้น ไม่ควรลบจริง

งานที่ต้องทำ:

- แยก `modules/users/user-service.ts`
- แยก `modules/master-data/master-data-service.ts`
- เพิ่ม Zod schema สำหรับ create/update user, category, zone, SLA
- เพิ่ม audit event ให้ครบทุก admin action
- ทำหน้าแจ้ง error/success แบบไม่ redirect หายรายละเอียด

### 5. File Storage

สถานะปัจจุบัน:

- ลายเซ็นเก็บใน `storage/signatures`
- รูปโปรไฟล์เก็บใน `storage/profile-photos`
- database เก็บ metadata และ `storagePath`
- route ดึงไฟล์ผ่านระบบ ไม่ได้เปิด public folder ตรง

ข้อดี:

- แนวทางแยกไฟล์ออกจาก database ถูกต้อง
- database ไม่บวมจาก binary image
- เอกสารปิดงานดึงลายเซ็นจาก profile ได้

ความเสี่ยงก่อนใช้งานจริง:

- path ถูกผูกกับ `process.cwd()/storage` ถ้า deploy ใหม่หรือย้ายเครื่อง ไฟล์อาจหายถ้าไม่ได้ mount persistent storage
- `.env.example` มี `SIGNATURE_STORAGE_DIR` แต่ code ยังไม่ได้ใช้ env นี้จริง
- ตรวจ MIME จาก browser อย่างเดียว ยังไม่มี file signature sniffing
- ไม่มี backup policy สำหรับไฟล์

งานที่ต้องทำ:

- ทำ storage config ผ่าน env เช่น `FILE_STORAGE_ROOT`
- แยก storage adapter: local production storage ก่อน และรองรับ object storage ภายหลัง
- ตรวจชนิดไฟล์จาก bytes เพิ่ม
- backup database และ storage folder พร้อมกัน
- เพิ่ม health check ว่า storage เขียน/อ่านได้

### 6. Public Area

สถานะปัจจุบัน:

- หน้า public dashboard
- แจ้งซ่อมไม่ต้อง login
- ติดตามสถานะด้วย CM number
- public header แยกจาก app shell

ข้อดี:

- UX ผู้แจ้งซ่อมง่าย
- ข้อมูล public แยกจากข้อมูลหลัง login

ความเสี่ยงก่อนใช้งานจริง:

- ต้องจำกัดข้อมูลที่หน้า tracking แสดง ไม่ให้หลุด internal note, audit, ลายเซ็น หรือข้อมูล user ภายใน
- ต้องเพิ่ม spam/rate limit สำหรับหน้าแจ้งซ่อม
- ต้องมี success/failure handling ที่ชัดเจนหาก database เขียนไม่สำเร็จ

งานที่ต้องทำ:

- เพิ่ม rate limit สำหรับ repair request และ tracking
- ทบทวน public tracking fields
- เพิ่ม server-side error boundary หรือ friendly error page
- เพิ่ม optional CAPTCHA เฉพาะกรณีเปิดใช้งานผ่าน network สาธารณะ

### 7. Documents And Reports

สถานะปัจจุบัน:

- มี completion document/print view
- มี report export
- ทุก role ที่ login พิมพ์เอกสารปิดงานได้ ยกเว้น requester/public

ข้อดี:

- เอกสารดึงข้อมูลจาก CM Work และ profile
- โครง export แยกจาก workflow หลัก

ความเสี่ยงก่อนใช้งานจริง:

- ต้องล็อก template เอกสารให้ตรงแบบฟอร์มบริษัท
- ต้องทดสอบ print/PDF ใน browser ที่หน้างานใช้จริง
- ต้องบันทึก audit เมื่อพิมพ์หรือ export ถ้าเอกสารใช้เป็นหลักฐาน

งานที่ต้องทำ:

- สรุปแบบฟอร์มปิดงาน final
- ทดสอบ print บน Chrome/Edge
- เพิ่ม audit event สำหรับ export/print ถ้าบริษัทต้องการ trace
- เพิ่มเลข version ของ template เอกสาร

### 8. Deployment And Operations

สถานะปัจจุบัน:

- มี Next.js app
- มี npm scripts สำหรับ build, start, migrate, seed, test
- มี local dev server script

ความเสี่ยงก่อนใช้งานจริง:

- ยังไม่มี production deployment guide
- ยังไม่มี environment checklist
- ยังไม่มี monitoring/log rotation
- ยังไม่มี backup/restore runbook

งานที่ต้องทำ:

- กำหนดว่าจะ deploy ที่ไหน: เครื่อง server ภายในโรงไฟฟ้า, VM, Docker, หรือ cloud
- ทำ `.env.production.example`
- ทำ startup/service script สำหรับ production
- ทำ health check endpoint
- ทำ log และ error monitoring ขั้นต่ำ
- ทำคู่มือ backup/restore

## Go-Live Readiness Checklist

### Must Have ก่อนใช้งานจริง

- [ ] Production database เป็น PostgreSQL หรือ MySQL
- [ ] มี migration สำหรับ production database
- [ ] มี backup database รายวัน
- [ ] มี backup storage รายวัน
- [ ] ทดสอบ restore database + storage แล้วอย่างน้อย 1 รอบ
- [ ] Session มีการ sign/encrypt หรือใช้ server-side session
- [ ] Session มี expiry
- [ ] Login มี rate limit
- [ ] Create repair request มี rate limit
- [ ] Admin user action ผ่าน service layer และ validation
- [ ] CM work number กันเลขซ้ำตอนมี request พร้อมกัน
- [ ] Workflow acceptance test ครบทุกสถานะ
- [ ] Public tracking ไม่แสดงข้อมูลภายใน
- [ ] File upload ตรวจชนิดไฟล์และขนาดจาก server
- [ ] Storage path ตั้งค่าผ่าน env และเป็น persistent storage
- [ ] Print document template ได้รับการยืนยันจากผู้ใช้งานจริง
- [ ] มี admin คู่มือเริ่มต้นและบัญชี admin production ที่เปลี่ยน password แล้ว

### Should Have หลัง Pilot

- [ ] Audit login/logout/failed login
- [ ] Audit report export/print
- [ ] Dashboard performance test เมื่อมีข้อมูลหลักพันรายการ
- [ ] SLA notification หรือ overdue alert
- [ ] Error monitoring
- [ ] User activity review report
- [ ] Data retention policy

## Recommended Implementation Order

### Phase 1: Stabilize Core Data

เป้าหมาย: ทำให้ข้อมูลไม่หาย ไม่ชน และ backup ได้

1. เปลี่ยน database provider สำหรับ production
2. เพิ่ม production env example
3. แก้ CM work number ให้สร้างแบบปลอดภัยเมื่อมีหลาย request พร้อมกัน
4. เพิ่ม index สำคัญใน schema
5. ทำ backup/restore runbook

### Phase 2: Harden Auth And Admin

เป้าหมาย: ลดความเสี่ยงจากการเข้าระบบและการแก้ข้อมูลหลังบ้าน

1. ปรับ session ให้ปลอดภัย
2. เพิ่ม session expiry
3. เพิ่ม login rate limit
4. แยก user service และ master-data service
5. เพิ่ม validation และ audit ให้ admin action ครบ

### Phase 3: Harden Workflow

เป้าหมาย: ให้ CM Work ทำงานตามกฎจริงทุก role

1. เพิ่ม workflow tests ครบทุกสถานะ
2. เพิ่ม claim concurrency test
3. เพิ่ม UI error handling เมื่อ action ไม่ผ่าน
4. ตรวจทุกหน้าให้เรียก service layer กลาง

### Phase 4: Production File Storage

เป้าหมาย: รูปโปรไฟล์และลายเซ็นไม่หายหลัง deploy/backup

1. ทำ file storage root ผ่าน env
2. เพิ่ม file signature validation
3. ทำ backup storage folder
4. เพิ่ม storage health check

### Phase 5: Pilot Go-Live

เป้าหมาย: ใช้จริงแบบจำกัดวงก่อนเปิดเต็มระบบ

1. Seed master data จริงของโรงไฟฟ้า
2. สร้าง user จริงเฉพาะทีม pilot
3. ทดสอบงานจริง 20-50 รายการ
4. เก็บ feedback จาก requester, technician, engineer, admin
5. แก้ blocking issue ก่อนเปิดใช้งานทั้งโรงไฟฟ้า

## First Work Package

งานแรกที่ควรเริ่มทันทีคือ **Phase 1: Stabilize Core Data**

รายการงานย่อย:

1. ตัดสินใจฐานข้อมูล production: PostgreSQL หรือ MySQL
2. เพิ่ม `.env.production.example`
3. ปรับ Prisma schema สำหรับ production database
4. เพิ่ม index ที่จำเป็น
5. แก้การสร้าง CM work number ให้รองรับการแจ้งซ่อมพร้อมกัน
6. เขียน backup/restore runbook
7. รัน test และทดสอบสร้าง repair request หลายรายการ

## Open Decisions

ต้องตัดสินใจก่อนลง Phase 1 เต็ม:

1. Production จะติดตั้งบนเครื่องแบบไหน: Windows server, Linux server, Docker, หรือ cloud
2. ฐานข้อมูลที่ต้องการใช้จริง: PostgreSQL หรือ MySQL
3. ผู้ใช้จะเข้าเว็บจาก network ภายในอย่างเดียว หรือเปิดจากภายนอกด้วย
4. Storage รูป/ลายเซ็นจะเก็บใน server folder หรือ object storage
5. ต้องมี audit การ print/export หรือไม่

