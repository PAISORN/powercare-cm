# มาตรฐานการตั้งชื่อ Branch สำหรับโปรเจกต์ PowerCare.CM

เอกสารนี้ใช้กำหนดรูปแบบการตั้งชื่อ branch ให้ทีมทำงานตรงกัน อ่านง่าย และลดความสับสนเวลาพัฒนา แก้บั๊ก และเตรียมขึ้น production

## 1. เป้าหมาย

การตั้งชื่อ branch ให้เป็นมาตรฐานช่วยให้:

- รู้ทันทีว่า branch นี้ทำเรื่องอะไร
- แยกงานใหม่กับงานแก้บั๊กได้ชัดเจน
- ค้นหา branch ใน GitHub ง่ายขึ้น
- ลดความเสี่ยงในการ push ผิด branch

## 2. หลักการตั้งชื่อ

ให้ใช้รูปแบบนี้:

`ประเภทงาน/ชื่อสั้นของงาน`

ตัวอย่าง:

- `feature/dashboard-v3`
- `feature/cm-history-import`
- `fix/tracking-date-bug`
- `fix/work-permission`
- `docs/user-manual-update`

## 3. ประเภท branch ที่แนะนำ

### 3.1 `feature/`

ใช้สำหรับ:

- ฟีเจอร์ใหม่
- การปรับปรุงหน้าจอ
- การเพิ่ม workflow ใหม่

ตัวอย่าง:

- `feature/dashboard-improvement`
- `feature/public-tracking-redesign`
- `feature/request-form-validation`

### 3.2 `fix/`

ใช้สำหรับ:

- แก้บั๊ก
- แก้ปัญหาการแสดงผล
- แก้ปัญหาสิทธิ์ใช้งาน

ตัวอย่าง:

- `fix/night-mode-flicker`
- `fix/profile-photo-upload`
- `fix/print-signature-layout`

### 3.3 `docs/`

ใช้สำหรับ:

- เพิ่มคู่มือ
- แก้เอกสาร
- ปรับ checklist

ตัวอย่าง:

- `docs/requester-manual`
- `docs/release-checklist`
- `docs/deployment-guide-update`

### 3.4 `refactor/`

ใช้สำหรับ:

- ปรับโครงสร้างโค้ด
- ลดความซ้ำซ้อน
- แยก component หรือ service ใหม่

ตัวอย่าง:

- `refactor/dashboard-query`
- `refactor/cm-work-service`

### 3.5 `hotfix/`

ใช้เฉพาะกรณี:

- บั๊กสำคัญบน production
- ต้องแก้ด่วนและขึ้นจริงเร็ว

ตัวอย่าง:

- `hotfix/login-failure`
- `hotfix/vercel-runtime-error`

## 4. กฎการตั้งชื่อ

### ควรทำ

- ใช้ตัวพิมพ์เล็กทั้งหมด
- ใช้ `-` คั่นคำ
- ตั้งชื่อสั้นแต่สื่อความหมาย
- เริ่มด้วยประเภท branch เสมอ

### ไม่ควรทำ

- ไม่ใช้เว้นวรรค
- ไม่ใช้ชื่อกว้างเกินไป เช่น `feature/update`
- ไม่ใช้ชื่อที่อ่านแล้วไม่รู้ว่าทำอะไร เช่น `fix/test1`
- ไม่ทำงานใหม่บน `master`

## 5. ตัวอย่างชื่อที่ควรใช้

### งานเกี่ยวกับ Dashboard

- `feature/dashboard-kpi-refresh`
- `feature/dashboard-filter-panel`
- `fix/dashboard-mobile-layout`

### งานเกี่ยวกับ Request / Tracking

- `feature/request-form-improvement`
- `feature/tracking-timeline-update`
- `fix/request-success-page`

### งานเกี่ยวกับ Admin

- `feature/admin-user-permissions`
- `feature/admin-audit-enhancement`
- `fix/admin-delete-user-flow`

### งานเกี่ยวกับเอกสาร

- `docs/requester-quick-guide`
- `docs/admin-manual`
- `docs/production-workflow`

## 6. แนวทางเลือกชื่อให้เหมาะ

ถ้างานนั้นเป็น:

- “เพิ่มของใหม่” -> ใช้ `feature/`
- “แก้ของเดิมที่ผิด” -> ใช้ `fix/`
- “แก้เอกสาร” -> ใช้ `docs/`
- “จัดโครงสร้างใหม่” -> ใช้ `refactor/`
- “แก้ production ด่วน” -> ใช้ `hotfix/`

## 7. รูปแบบที่แนะนำสำหรับโปรเจกต์นี้

สำหรับ `PowerCare.CM` แนะนำให้ใช้ชุดนี้เป็นหลัก:

- `feature/...`
- `fix/...`
- `docs/...`
- `hotfix/...`

และให้ถือว่า:

- `master` = production
- ห้ามพัฒนางานใหม่บน `master`

## 8. ตัวอย่าง workflow จริง

ถ้าจะทำงานใหม่เรื่อง dashboard:

1. สร้าง branch: `feature/dashboard-improvement`
2. ทำงานทั้งหมดบน branch นี้
3. ทดสอบให้เรียบร้อย
4. push branch นี้ขึ้น GitHub
5. เมื่อพร้อมค่อย merge เข้า `master`

ถ้าจะแก้บั๊กเรื่อง tracking:

1. สร้าง branch: `fix/tracking-status-layout`
2. แก้และทดสอบ
3. push ขึ้น GitHub
4. ตรวจ preview
5. เมื่อพร้อมค่อย merge เข้า `master`

## 9. สรุปแบบสั้น

ให้จำง่าย ๆ แบบนี้:

- ฟีเจอร์ใหม่ = `feature/...`
- แก้บั๊ก = `fix/...`
- เอกสาร = `docs/...`
- งานด่วน production = `hotfix/...`

---

ถ้าทำตามมาตรฐานนี้ต่อเนื่อง จะช่วยให้โปรเจกต์จัดการง่ายขึ้นมากทั้งตอนพัฒนา ทดสอบ และปล่อยขึ้นใช้งานจริง
