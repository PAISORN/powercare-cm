type DocumentPerson = {
  fullName: string;
  signatureUrl?: string | null;
  signedAt: string;
};

export type SparePartIssueDocumentProps = {
  branding: {
    companyName: string;
    organizationName: string;
    siteName: string;
    address?: string | null;
    logoUrl?: string | null;
  };
  issue: {
    number: string;
    issueType: string;
    requestedAt: string;
    issuedAt: string;
    requesterName: string;
    requesterDepartment: string;
    requesterContact?: string | null;
    note?: string | null;
    cmNumber?: string | null;
    machineName?: string | null;
    problemTitle?: string | null;
    requester: DocumentPerson;
    engineer: DocumentPerson;
    storeOfficer: DocumentPerson;
  };
  items: Array<{
    lineCode: string;
    itemCode: string;
    name: string;
    description?: string | null;
    storeName: string;
    zoneCode: string;
    zoneName?: string | null;
    unit: string;
    requestedQty: number;
    approvedQty: number;
    issuedQty: number;
    unitPrice: number;
    issuedValue: number;
    note?: string | null;
  }>;
  printedAt: string;
  printedBy: string;
};

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const moneyFormatter = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[34mm_minmax(0,1fr)] border-b border-slate-300 py-1.5 text-[10px]">
      <dt className="font-bold text-slate-800">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-slate-700">{value || "-"}</dd>
    </div>
  );
}

function SignatureBlock({ label, person }: { label: string; person: DocumentPerson }) {
  return (
    <div className="break-inside-avoid text-center text-[10px]">
      <p className="font-bold text-slate-900">{label}</p>
      <div className="mx-auto mt-1 flex h-[19mm] max-w-[58mm] items-end justify-center border-b border-dashed border-slate-500">
        {person.signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`ลายเซ็น ${person.fullName}`} className="max-h-[17mm] max-w-full object-contain" src={person.signatureUrl} />
        ) : null}
      </div>
      <p className="mt-1 font-semibold">({person.fullName || "................................................"})</p>
      <p className="text-slate-600">วันที่ {person.signedAt || "................................"}</p>
    </div>
  );
}

export function SparePartIssueDocument({ branding, issue, items, printedAt, printedBy }: SparePartIssueDocumentProps) {
  const totalIssuedQty = items.reduce((sum, item) => sum + item.issuedQty, 0);
  const totalValue = items.reduce((sum, item) => sum + item.issuedValue, 0);

  return (
    <main className="issue-print-document mx-auto min-h-[210mm] w-full max-w-[297mm] bg-white px-[8mm] py-[7mm] text-slate-950 shadow-xl print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        .issue-print-document { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .issue-print-table thead { display: table-header-group; }
        .issue-print-table tr { break-inside: avoid; page-break-inside: avoid; }
        .issue-page-number::after { content: "หน้า " counter(page) " / " counter(pages); }
        @media print {
          html, body { background: white !important; }
          .issue-print-document { width: 100%; }
        }
      `}</style>

      <header className="grid grid-cols-[55mm_minmax(0,1fr)_66mm] items-center gap-5 border-b-2 border-cyan-900 pb-3">
        <div className="flex min-h-[22mm] items-center gap-3">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="โลโก้บริษัท" className="max-h-[21mm] max-w-[31mm] object-contain" src={branding.logoUrl} />
          ) : null}
          <div className="min-w-0">
            <p className="break-words text-sm font-extrabold text-cyan-950">{branding.companyName}</p>
            <p className="mt-0.5 text-[9px] text-slate-600">{branding.address || "PowerCare.CM"}</p>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-[23px] font-extrabold leading-tight text-cyan-950">ใบเบิกและจ่ายอะไหล่</h1>
          <p className="mt-1 text-[11px] font-bold tracking-wide text-slate-600">SPARE PART ISSUE DOCUMENT</p>
        </div>
        <dl className="rounded-md border border-cyan-950/35 px-3 py-2">
          <Detail label="เลขที่ใบเบิก" value={issue.number} />
          <Detail label="วันที่ขอเบิก" value={issue.requestedAt} />
          <Detail label="วันที่จ่ายครบ" value={issue.issuedAt} />
        </dl>
      </header>

      <section className="mt-3 grid grid-cols-2 gap-x-8 rounded-md border border-slate-300 px-4 py-1">
        <dl>
          <Detail label="ผู้ขอเบิก" value={issue.requesterName} />
          <Detail label="หน่วยงาน" value={issue.requesterDepartment} />
          <Detail label="ช่องทางติดต่อ" value={issue.requesterContact} />
          <Detail label="ประเภทการเบิก" value={issue.issueType} />
        </dl>
        <dl>
          <Detail label="Organization" value={branding.organizationName} />
          <Detail label="Site" value={branding.siteName} />
          <Detail label="เลขที่ CM" value={issue.cmNumber} />
          <Detail label="เครื่องจักร / ปัญหา" value={[issue.machineName, issue.problemTitle].filter(Boolean).join(" - ")} />
        </dl>
        <dl className="col-span-2">
          <Detail label="วัตถุประสงค์ / หมายเหตุ" value={issue.note} />
        </dl>
      </section>

      <section className="mt-3">
        <table className="issue-print-table w-full table-fixed border-collapse text-[8.5px]">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[15%]" />
            <col className="w-[19%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[5%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead>
            <tr className="bg-cyan-950 text-white">
              <th className="border border-cyan-900 px-1 py-2">ลำดับ</th>
              <th className="border border-cyan-900 px-1 py-2">รหัสอะไหล่ / Item Code</th>
              <th className="border border-cyan-900 px-1 py-2">รายการอะไหล่ / รายละเอียด</th>
              <th className="border border-cyan-900 px-1 py-2">คลังอะไหล่</th>
              <th className="border border-cyan-900 px-1 py-2">Zone ที่ใช้งาน</th>
              <th className="border border-cyan-900 px-1 py-2">หน่วย</th>
              <th className="border border-cyan-900 px-1 py-2">จำนวนขอ</th>
              <th className="border border-cyan-900 px-1 py-2">จำนวนอนุมัติ</th>
              <th className="border border-cyan-900 px-1 py-2">จำนวนจ่ายจริง</th>
              <th className="border border-cyan-900 px-1 py-2">ราคาต่อหน่วย</th>
              <th className="border border-cyan-900 px-1 py-2">มูลค่าจ่าย</th>
              <th className="border border-cyan-900 px-1 py-2">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.lineCode}-${index}`}>
                <td className="border border-slate-300 px-1 py-2 text-center">{index + 1}</td>
                <td className="border border-slate-300 px-1 py-2">
                  <p className="font-bold">{item.itemCode}</p>
                  <p className="mt-1 break-all font-mono text-[7px] text-cyan-800">{item.lineCode}</p>
                </td>
                <td className="border border-slate-300 px-1 py-2"><strong>{item.name}</strong>{item.description ? <p className="mt-0.5 text-slate-600">{item.description}</p> : null}</td>
                <td className="border border-slate-300 px-1 py-2">{item.storeName}</td>
                <td className="border border-slate-300 px-1 py-2 text-center">{item.zoneCode}{item.zoneName ? ` - ${item.zoneName}` : ""}</td>
                <td className="border border-slate-300 px-1 py-2 text-center">{item.unit}</td>
                <td className="border border-slate-300 px-1 py-2 text-right">{numberFormatter.format(item.requestedQty)}</td>
                <td className="border border-slate-300 px-1 py-2 text-right">{numberFormatter.format(item.approvedQty)}</td>
                <td className="border border-slate-300 px-1 py-2 text-right font-bold">{numberFormatter.format(item.issuedQty)}</td>
                <td className="border border-slate-300 px-1 py-2 text-right">{moneyFormatter.format(item.unitPrice)}</td>
                <td className="border border-slate-300 px-1 py-2 text-right font-bold">{moneyFormatter.format(item.issuedValue)}</td>
                <td className="border border-slate-300 px-1 py-2">{item.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-3 break-inside-avoid">
        <div className="ml-auto grid max-w-[126mm] grid-cols-3 overflow-hidden rounded-md border border-slate-300 text-[10px]">
          <div className="px-3 py-2"><span className="text-slate-600">จำนวนรายการ</span><strong className="ml-2">{items.length}</strong></div>
          <div className="border-x border-slate-300 px-3 py-2"><span className="text-slate-600">รวมจำนวนจ่าย</span><strong className="ml-2">{numberFormatter.format(totalIssuedQty)}</strong></div>
          <div className="bg-cyan-950 px-3 py-2 text-white"><span>รวมมูลค่า</span><strong className="ml-2">{moneyFormatter.format(totalValue)} บาท</strong></div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-8 border-t border-slate-300 pt-3">
          <SignatureBlock label="ผู้ขอเบิก (Requester)" person={issue.requester} />
          <SignatureBlock label="วิศวกรผู้อนุมัติ (Engineer)" person={issue.engineer} />
          <SignatureBlock label="ผู้จ่ายอะไหล่ (Store Officer)" person={issue.storeOfficer} />
        </div>

        <footer className="mt-3 flex items-end justify-between border-t border-cyan-950 pt-2 text-[8px] text-slate-600">
          <div>
            <p>PC-INV-ISS-001 | Rev.00</p>
            <p>พิมพ์เมื่อ {printedAt} โดย {printedBy}</p>
          </div>
          <p className="issue-page-number font-semibold text-slate-800" />
        </footer>
      </section>
    </main>
  );
}
