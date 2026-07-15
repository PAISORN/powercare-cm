"use client";

import { Printer } from "lucide-react";

export function IssueDocumentPrintButton({ missingSignatures = [] }: { missingSignatures?: string[] }) {
  function printDocument() {
    if (missingSignatures.length > 0) {
      const names = missingSignatures.join(" และ ");
      const confirmed = window.confirm(`ยังไม่มีลายเซ็นของ ${names}\nเอกสารจะแสดงช่องลงชื่อว่าง ต้องการพิมพ์ต่อหรือไม่?`);
      if (!confirmed) return;
    }
    window.print();
  }

  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-700 print:hidden"
      onClick={printDocument}
      type="button"
    >
      <Printer size={18} />
      พิมพ์ / บันทึก PDF
    </button>
  );
}
