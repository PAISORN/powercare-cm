import { InventoryPlaceholderPage } from "./inventory-placeholder-page";

export default function InventoryPage() {
  return (
    <InventoryPlaceholderPage
      title="Inventory"
      description="ศูนย์รวมงาน Store ของแต่ละ Site สำหรับดูอะไหล่ คลัง ยอดคงเหลือ การรับเข้า การเบิก และการติดตามสถานะใบเบิก"
      steps={["เตรียม Master Data ของ Store", "เปิดใช้งาน Receive / Issue", "ต่อยอดรายงานและ LINE แจ้งเตือน"]}
    />
  );
}
