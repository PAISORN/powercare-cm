# PM Release Test Checklist (TH)

ใช้ checklist นี้กับฐานข้อมูลทดสอบเท่านั้น บันทึกวัน, build, ผู้ทดสอบ, Organization และ Site ที่ใช้ทุกครั้ง

## A. Schema และ Migration

- [ ] Validate `prisma/schema.prisma` และ `prisma/schema.supabase.prisma`
- [ ] Generate Prisma client ทั้ง SQLite/PostgreSQL
- [ ] Schema parity และ SQLite migration integration ผ่าน
- [ ] PostgreSQL migrations ทดลองกับฐานข้อมูล disposable ตามลำดับ พร้อม RLS/grants (ห้ามใช้ Production โดยไม่ได้รับอนุญาต)
- [ ] Partial unique: หนึ่ง current plan ต่อ Site/วัน และหนึ่ง Lead ต่อ PM Work

## B. Permission และ Scope

- [ ] ทุก Role อ่าน PM ได้เฉพาะ scope
- [ ] Owner/Organization/Site Admin จัดการตามขอบเขต
- [ ] Admin Claim/Start/Complete ไม่ได้จนมี explicit `execute_pm_work`
- [ ] Engineer/Technician execute ได้ แต่จัดการ Group/Plan ไม่ได้โดย default
- [ ] Organization Role และ User ALLOW/DENY มีลำดับถูกต้อง
- [ ] เปลี่ยน ID ใน URL/form/API ข้าม Organization/Site แล้ว server ปฏิเสธทุก command

## C. PM Group และ Calendar

- [ ] สร้าง Group ว่าง/มีสมาชิก, ค้นหา Asset และใช้คีย์บอร์ด/มือถือได้
- [ ] Parent/Child ไม่ถูกเลือกเพิ่มอัตโนมัติ; Zone ไม่ถูกใช้เป็น Group
- [ ] Asset ซ้ำใน Group ถูกปฏิเสธ; Asset เดียวอยู่หลาย Group ได้
- [ ] Desktop เป็น 42-cell month grid และ Mobile เป็น Agenda ไม่มี horizontal overflow
- [ ] หนึ่งวันเพิ่มหลาย Group และ Preview รวม Asset ซ้ำพร้อม source ครบ
- [ ] Draft ไม่สร้างเลขหรืองาน; ย้าย/ลบ Draft ได้

## D. Confirmation และ Lifecycle

- [ ] Confirm สร้าง Snapshot และงานหนึ่งรายการต่อ Asset ที่ไม่ซ้ำ
- [ ] Confirm ซ้ำ/concurrent ไม่สร้างเลข งาน source หรือ audit ซ้ำ
- [ ] เพิ่ม Asset หลัง Confirm ใช้ suffix ใหม่และไม่เปลี่ยนเลขเดิม
- [ ] มอบหมาย Lead/Collaborator, Claim งานว่าง, Start และ Complete Normal/Abnormal
- [ ] Abnormal ไม่มี note ถูกปฏิเสธ
- [ ] แก้ Completed ต้องมี management permission + reason และเก็บ before/after
- [ ] ย้าย/ยกเลิก Confirmed Plan ได้เฉพาะเมื่อทุกงาน Planned

## E. Integration

- [ ] Completed + Abnormal เลือก Category/Zone แล้วสร้าง CM ครั้งเดียว
- [ ] PM↔CM links เปิดได้ทั้งสองทางและข้าม Site ไม่ได้
- [ ] Asset history แสดงเฉพาะ Asset นั้น รวมทีม ผล เวลา note และ linked CM
- [ ] Assignment/due/overdue/linked-CM notification ไม่ซ้ำและ read ได้
- [ ] Daily cron ใช้ `CRON_SECRET`, รายงาน partial failure และ retry ปลอดภัย

## F. Query และ CSV

- [ ] Filter วันที่/Group/Asset/assignee/status/Overdue/result ทำงานร่วมกัน
- [ ] Summary, list และ export ให้ชุดข้อมูล/scope เดียวกัน
- [ ] CSV มี UTF-8 BOM, CRLF, quote comma/newline/quote และป้องกัน `= + - @` หลัง whitespace/control chars
- [ ] เกิน 10,000 แถวตอบ 413 ก่อนสร้างไฟล์และไม่มี success audit

## G. Complete Release Gate

- [ ] `npm.cmd run test` ผ่านทั้งหมด (ห้ามยอมรับ baseline failure โดยไม่สืบสวน)
- [ ] `npm.cmd run build` ผ่าน
- [ ] `npm.cmd run test:e2e` ผ่าน พร้อมตรวจ console/network/server logs
- [x] Playwright ครอบคลุม Group → Draft → Confirm → Assign → Execute/Correct, responsive calendar, Asset history/PM-CM และ CSV
- [ ] ค้นหาไม่พบ Zone grouping, stored `OVERDUE`, UI-only authorization หรือ schema drift
- [ ] เก็บ screenshots/traces/logs เป็นหลักฐานและระบุ caveat ที่ยังไม่ได้ทดสอบ
- [ ] ไม่มี Production migration, deploy, stage หรือ commit โดยไม่ได้รับอนุญาต

## บันทึกผล

| Gate | ผล | หลักฐาน/ไฟล์ | หมายเหตุ |
| --- | --- | --- | --- |
| Schema/Migration |  |  |  |
| Unit/Integration |  |  |  |
| Build |  |  |  |
| Desktop E2E |  |  |  |
| Mobile E2E |  |  |  |
| Security/CSV |  |  |  |
