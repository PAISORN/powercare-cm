import * as XLSX from "xlsx";
export async function GET() {
  const headers = ["Asset Code","Asset Name","System","Asset Level","Asset Type","Parent Code","Area / Zone","Discipline","Tag / KKS","Registration Code","Manufacturer","Model","Serial Number","Installation Location","Operating Status","Criticality","Key Specification","Metadata JSON"];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([headers]),"Assets Import");
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([["คำแนะนำ"],["ระบุรหัสจริงที่ไม่ซ้ำ System / Asset Type ใช้ Code หรือชื่อที่ตรงกับ Master Data"],["Asset Level: MAIN_ASSET, SUB_ASSET, PART"],["MAIN_ASSET ไม่ต้องมี Parent Code; SUB_ASSET ต้องอ้างอิง MAIN_ASSET; PART อ้างอิง MAIN_ASSET หรือ SUB_ASSET"],["Parent ต้องอยู่ Site และ System เดียวกัน อ้างอิงแถวในไฟล์เดียวกันได้"],["Area / Zone ใช้ชื่อตาม Master Data; ห้าม Zone code ต่อท้ายชื่อ Asset"],["สถานะ: IN_SERVICE, UNDER_REPAIR, STANDBY, TEMPORARILY_OUT, RETIRED; Criticality: CRITICAL, HIGH, MEDIUM, LOW"]]),"Instructions");
  return new Response(XLSX.write(book,{type:"buffer",bookType:"xlsx"}),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":"attachment; filename=powercare-assets-import-template.xlsx"}});
}
