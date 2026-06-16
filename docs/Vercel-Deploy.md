# Vercel Deploy Guide

คู่มือนี้ใช้สำหรับ deploy PowerCare.CM ขึ้น Vercel โดยใช้ Supabase เป็นฐานข้อมูลและ Storage

## 1. เชื่อม GitHub กับ Vercel

1. เข้า Vercel Dashboard
2. เลือก Add New Project
3. Import repo `PAISORN/powercare-cm`
4. Framework Preset ให้เป็น Next.js
5. Build Command จะถูกอ่านจาก `vercel.json` เป็น:

```text
npm run build:vercel
```

เหตุผล: Vercel ต้อง generate Prisma Client จาก `prisma/schema.supabase.prisma` ก่อน build เพื่อให้ runtime ใช้ PostgreSQL ของ Supabase

## 2. ตั้งค่า Environment Variables

เพิ่มค่าต่อไปนี้ใน Vercel Project Settings > Environment Variables

```text
DATABASE_URL
DIRECT_URL
SESSION_SECRET
FILE_STORAGE_DRIVER
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROFILE_PHOTOS_BUCKET
SUPABASE_SIGNATURES_BUCKET
```

ค่าที่แนะนำ:

```text
FILE_STORAGE_DRIVER=supabase
SUPABASE_PROFILE_PHOTOS_BUCKET=powercare-profile-photos
SUPABASE_SIGNATURES_BUCKET=powercare-signatures
```

ข้อควรระวัง:

- ห้ามตั้ง `SUPABASE_SERVICE_ROLE_KEY` เป็น `NEXT_PUBLIC_*`
- `DATABASE_URL` ใช้ Supabase pooler สำหรับ runtime
- `DIRECT_URL` ใช้ connection ที่เหมาะกับ migration/admin command
- `SESSION_SECRET` ต้องเป็นข้อความสุ่มยาวและห้ามใช้ค่าตัวอย่าง

## 3. Database Migration

อย่ารัน migration ใน Vercel build เพราะ build อาจเกิดซ้ำหลายครั้งและไม่ควรแก้ schema ทุกครั้งที่ deploy

ให้ migrate จากเครื่อง local หรือ pipeline แยกต่างหาก:

```powershell
npm run db:push:supabase
```

หลัง migrate แล้วค่อย deploy ไป Vercel

## 4. Supabase Storage

ต้องมี bucket ต่อไปนี้ใน Supabase Storage:

```text
powercare-profile-photos
powercare-signatures
```

ทั้งสอง bucket ควรเป็น private bucket เพราะระบบอ่านไฟล์ผ่าน server route ของแอป ไม่เปิด public URL โดยตรง

## 5. Deploy

หลังตั้ง environment variables ครบแล้ว กด Deploy ใน Vercel

หลัง deploy เสร็จให้ทดสอบ:

1. เปิดหน้าแรก
2. Login เป็น admin
3. เปิด Dashboard
4. เปิด CM Work List
5. Upload รูปโปรไฟล์
6. Upload ลายเซ็น
7. แจ้งซ่อมใหม่
8. ติดตามสถานะด้วยเลข CM
9. พิมพ์เอกสารปิดงาน

## 6. หลัง Deploy สำเร็จ

งานที่ควรทำต่อ:

1. ตั้ง custom domain
2. เปิด Vercel deployment protection สำหรับ preview ถ้าต้องการ
3. ตั้ง backup schedule สำหรับ Supabase database และ Storage
4. ทดสอบ restore อย่างน้อย 1 รอบ
5. สร้างบัญชี admin production และเปลี่ยนรหัสผ่านเริ่มต้น
