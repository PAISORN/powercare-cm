import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Plant CM Control Center",
  description: "ระบบแจ้งซ่อมและติดตามงาน Corrective Maintenance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
