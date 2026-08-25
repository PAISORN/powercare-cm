# คู่มือใช้งานระบบ Preventive Maintenance (PM)

คู่มือนี้ครอบคลุม PM แบบวางแผนด้วยตนเองหนึ่งแผนต่อ Site/วัน ตั้งแต่จัดกลุ่ม Asset จนถึงประวัติและการส่งต่องาน CM

## 1. สิทธิ์และขอบเขต

- Owner Admin จัดการ PM ได้ทุก Site, Organization Admin เฉพาะ Organization และ Site Admin เฉพาะ Site ของตน
- Engineer/Technician ลงมือ PM ได้โดยค่าเริ่มต้น ผู้ดูแลต้องได้รับ `Execute PM Work` เพิ่มต่างหาก
- Role/User อื่นทำได้ตาม Permission override แต่ไม่สามารถออกนอก Organization/Site scope
- เมนู PM มี Calendar, PM Groups และ PM Work; หากไม่มีสิทธิ์ หน้าเว็บจะปฏิเสธแม้เปิด URL โดยตรง

## 2. สร้าง PM Group

1. เปิด **PM > PM Groups** และเลือก Site ที่ต้องการ (สำหรับผู้ดูแลหลาย Site)
2. กรอก Code และ Name แล้วเลือก Asset ได้หลายรายการ
3. ค้นหา Asset จาก Code/ชื่อ/ประเภท/Zone/สถานะ แล้วกด **Create group**
4. Asset ทุกชิ้นเป็นสมาชิกที่เลือกโดยตรง ระบบไม่ขยาย Parent หรือ Child อัตโนมัติ และ Asset เดียวอยู่ได้หลาย Group
5. Group ว่างสร้างได้แต่จะแสดงคำเตือน เมื่อ Group ถูกใช้ยืนยันแผนแล้ว Code จะถูกล็อกและต้อง Deactivate แทนการลบ

> Zone เป็นข้อมูลประกอบสำหรับค้นหา/อ่าน Asset ไม่ใช่ PM Group

## 3. สร้าง Draft ในปฏิทิน

1. เปิด **PM > Calendar** เลือกเดือนและวันที่
2. กด **สร้าง Draft สำหรับวันนี้**
3. เลือก PM Group จาก **+ เพิ่ม PM Group** แล้วกดเพิ่ม ทำซ้ำได้หลาย Group ในวันเดียวกัน
4. ตรวจ Asset Preview: Asset ซ้ำข้าม Group จะรวมเป็นงานเดียว แต่ระบบจำแหล่งที่มาทุก Group
5. Group ว่างหรือ Asset ที่ไม่พร้อมจะมีคำเตือนและไม่สร้างงาน
6. Draft ย้ายวันหรือลบได้ และยังไม่ใช้เลขแผน/เลขงาน

Desktop แสดงปฏิทินรายเดือน 42 ช่อง ส่วนมือถือแสดง Agenda เพื่ออ่านและแตะได้สะดวก วันที่ยึดเขตเวลา Asia/Bangkok

## 4. ยืนยันแผน

1. ตรวจจำนวน Asset แล้วกด **ยืนยันแผน PM**
2. อ่านข้อความยืนยันแล้วกด **ยืนยันและสร้างงาน**
3. ระบบสร้างเลข `PMP-...` และ PM Work `PM-...` หนึ่งงานต่อ Asset พร้อม Snapshot

ยืนยันซ้ำจากคำขอเดิมจะไม่สร้างงานซ้ำ หลังยืนยันแก้ Group เดิมไม่ได้ แต่ผู้จัดการเพิ่ม Asset รายตัวพร้อมเหตุผลได้ หากทุกงานยัง Planned จึงย้ายวันหรือยกเลิกทั้งแผนได้

## 5. มอบหมายและปฏิบัติงาน

1. เปิด **PM > PM Work** และเลือกงาน
2. ผู้จัดการเลือก Lead หนึ่งคนและ Collaborators ได้หลายคน แล้วกด **Save assignment**
3. งานที่ยังไม่มีทีม ผู้มีสิทธิ์ execution กด **Claim work** ได้
4. Lead/Collaborator กด **Start PM** เพื่อเปลี่ยนเป็น In Progress
5. เลือกผล Normal หรือ Abnormal กรอกหมายเหตุ (Abnormal บังคับ) แล้วกด **Complete PM**
6. ผู้จัดการแก้ผล Completed ได้ด้วย **Save correction** พร้อม Correction reason; ค่าเดิมและใหม่ถูก Audit

Overdue เป็นสถานะคำนวณจากวันที่และ lifecycle ปัจจุบัน ไม่ใช่สถานะที่บันทึกในฐานข้อมูล

## 6. สร้าง CM จากผลผิดปกติ

งานต้อง Completed + Abnormal ก่อนจึงเห็นฟอร์ม **สร้างงาน CM จากผล PM** เลือก Category และ Zone ของ Site แล้วกดสร้าง ระบบป้องกัน CM ซ้ำและแสดงลิงก์ PM ↔ CM ทั้งสองฝั่ง

## 7. ค้นหา รายงาน และ CSV

หน้า PM Work กรองช่วงวันที่, Group, Asset, ผู้รับผิดชอบ, lifecycle, Overdue และผลได้ Summary และ CSV ใช้ filter/scope เดียวกัน CSV เป็น UTF-8 BOM รองรับภาษาไทยและป้องกัน spreadsheet formula injection จำกัด 10,000 รายการต่อครั้ง

## 8. Asset History และ Notification

หน้า Asset แสดง PM ที่กำลังจะถึง, In Progress/Overdue และประวัติ Completed/Canceled ของ Asset รายการนั้นโดยไม่รวม Parent/Child อัตโนมัติ Notification แจ้งการมอบหมาย, ครบกำหนดวันนี้, Overdue ครั้งแรก และ CM ที่เชื่อมโยง ทั้งหมดอยู่ใน Organization/Site scope

## 9. ข้อผิดพลาดที่พบบ่อย

- **เลือก Asset ไม่ได้:** ตรวจว่า Asset Active และอยู่ Site เดียวกับ Group/Plan
- **ยืนยันไม่ได้:** Draft ต้องมี Asset ที่เข้าเกณฑ์อย่างน้อยหนึ่งรายการ
- **ย้าย/ยกเลิกแผนไม่ได้:** มีงานเริ่มแล้ว ให้ยกเลิกเฉพาะงานที่ยังไม่ดำเนินการและวางแผนใหม่
- **กด Start/Complete ไม่ได้:** ตรวจ assignment และ `Execute PM Work`
- **สร้าง CM ไม่ได้:** ต้อง Completed + Abnormal และ Category/Zone ต้อง Active ใน Site เดียวกัน
- **CSV ถูกปฏิเสธ:** ผลลัพธ์เกิน 10,000 รายการ ให้ลดช่วงวันที่หรือตัวกรอง

ทุกปัญหาที่เกี่ยวกับ scope/permission ควรให้ Owner Admin ตรวจ Permission Control Center; ห้ามแก้ด้วยการเปลี่ยน Organization/Site ID ใน URL
