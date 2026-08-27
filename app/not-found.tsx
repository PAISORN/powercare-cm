"use client";

import { useRouter } from "next/navigation";
import { SystemErrorPopup } from "../components/system-error-popup";

export default function NotFoundPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SystemErrorPopup
        message="ไม่พบหน้าหรือข้อมูลที่ต้องการ กรุณาปิดข้อความนี้เพื่อกลับไปใช้งานหน้าก่อนหน้า"
        onClose={() => router.back()}
        title="ไม่พบข้อมูลที่ต้องการ"
      />
    </div>
  );
}
