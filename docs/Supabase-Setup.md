# Supabase Production Database Setup

เอกสารนี้ใช้สำหรับเตรียม **Supabase PostgreSQL** ให้กับ PowerCare.CM ในช่วง pilot/production

## 1. Create Supabase Project

1. เข้า Supabase แล้วสร้าง project ใหม่
2. เลือก region ใกล้ผู้ใช้มากที่สุด
3. ตั้ง database password ที่ยาวและเก็บไว้ใน password manager
4. รอ project พร้อมใช้งาน

## 2. Create Prisma Database User

ใน Supabase SQL Editor ให้สร้าง user สำหรับ Prisma แยกจาก admin user:

```sql
create user "prisma" with password 'REPLACE_WITH_STRONG_PASSWORD' bypassrls createdb;

grant "prisma" to "postgres";
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;

alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

## 3. Copy Connection Strings

ไปที่ Supabase Dashboard:

```text
Project > Connect > ORMs > Prisma
```

ตั้งค่าใน `.env.production` โดยดูตัวอย่างจาก `.env.production.example`

ค่าที่ต้องมี:

```text
DATABASE_URL
DIRECT_URL
SESSION_SECRET
FILE_STORAGE_ROOT
```

ห้าม commit `.env.production` ขึ้น GitHub

## 4. Generate Prisma Client For Supabase

ใช้ schema สำหรับ Supabase:

```powershell
npm.cmd run db:generate:supabase
```

## 5. Create Tables In Supabase

สำหรับ pilot database ใหม่ ให้เริ่มด้วย:

```powershell
npm.cmd run db:push:supabase
```

หลังจาก schema ถูกสร้างแล้ว ให้ seed master data:

```powershell
npm.cmd run db:seed
```

หมายเหตุ: ใน production ระยะยาวควรเปลี่ยนจาก `db push` เป็น migration flow ที่ควบคุม version ชัดเจน

## 6. Backup Plan

สำหรับ pilot:

- เปิดใช้ backup ที่ Supabase plan รองรับ
- Export database ก่อนเปลี่ยน schema ทุกครั้ง
- Backup `storage/` หรือ storage path ที่เก็บรูปโปรไฟล์และลายเซ็นพร้อม database

สำหรับ production:

- Backup database รายวัน
- เก็บย้อนหลังอย่างน้อย 7 วัน
- เก็บ weekly backup อย่างน้อย 4 ชุด
- เก็บ monthly backup อย่างน้อย 3 ชุด
- ทดสอบ restore อย่างน้อยเดือนละครั้ง

## 7. Restore Test

ก่อนใช้งานจริง ต้องลอง restore อย่างน้อย 1 รอบ:

1. สร้าง Supabase project test แยก
2. Restore database backup เข้า project test
3. Restore file storage เข้า path test
4. ตั้ง `.env.production` ชี้ไป database test
5. เปิดเว็บและเช็ก:
   - Login admin
   - Dashboard
   - CM Work List
   - Work detail
   - Print completion document
   - Profile photo/signature preview

## 8. Go-Live Notes

- ใช้ Supabase PostgreSQL เป็น database หลัก
- รูปโปรไฟล์และลายเซ็นยังใช้ managed file storage ของแอป ไม่ควรเก็บ binary ใน database
- ยังต้องทำงานต่อเรื่องเลข CM ไม่ซ้ำเมื่อมีผู้แจ้งพร้อมกันหลายคน
- ยังต้องเพิ่ม user audit สำหรับ login/logout/failed login
