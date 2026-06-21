type DocumentPerson = {
  fullName: string;
  signatureUrl?: string | null;
};

export type CompletionDocumentProps = {
  organization: {
    companyName: string;
    logoUrl?: string | null;
  };
  work: {
    number: string;
    status: string;
    createdAt: string;
    claimedAt: string;
    closedAt: string;
    requesterName: string;
    requesterDepartment: string;
    categoryName: string;
    zoneName: string;
    machineName: string;
    problemTitle: string;
    problemDetail: string;
    rootCause: string;
    correctiveAction: string;
    engineerNote: string;
    claimant?: DocumentPerson | null;
    reviewer?: DocumentPerson | null;
  };
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-dashed border-emerald-950/20 py-2.5 last:border-b-0 sm:grid-cols-[145px_minmax(0,1fr)]">
      <dt className="font-bold text-emerald-950">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-gray-800">{value || "-"}</dd>
    </div>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid overflow-hidden rounded-md border border-emerald-900/30">
      <h2
        aria-label={`${number}. ${title}`}
        className="flex items-center gap-3 border-b border-emerald-900/25 bg-emerald-50 px-5 py-3 text-lg font-extrabold text-emerald-950 print:bg-emerald-50"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-900 text-sm text-white">{number}</span>
        {title}
      </h2>
      <dl className="px-5 py-1 text-sm sm:text-[15px]">{children}</dl>
    </section>
  );
}

function SignatureBlock({ label, person }: { label: string; person?: DocumentPerson | null }) {
  return (
    <div className="break-inside-avoid text-center">
      <p className="font-extrabold text-emerald-950">{label}</p>
      <div className="mx-auto mt-2 flex h-24 max-w-64 items-end justify-center border-b border-dashed border-gray-500">
        {person?.signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`${label} signature`} className="max-h-20 max-w-full object-contain" src={person.signatureUrl} />
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-gray-900">{person?.fullName ?? "-"}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

export function CompletionDocument({ organization, work }: CompletionDocumentProps) {
  return (
    <main className="completion-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-5 py-7 text-gray-950 shadow-xl print:min-h-0 print:max-w-none print:px-[10mm] print:py-[8mm] print:shadow-none sm:px-9 sm:py-9">
      <style>{`@page { size: A4 portrait; margin: 0; } .completion-document { print-color-adjust: exact; -webkit-print-color-adjust: exact; }`}</style>

      <header className="grid items-center gap-5 border-b-2 border-emerald-900 pb-5 sm:grid-cols-[180px_minmax(0,1fr)] print:grid-cols-[180px_minmax(0,1fr)]">
        <div className="flex min-h-24 items-center justify-center sm:justify-start print:justify-start">
          {organization.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Company logo" className="max-h-24 max-w-[180px] object-contain" src={organization.logoUrl} />
          ) : null}
        </div>
        <div className="text-center sm:text-right print:text-right">
          <h1 className="text-2xl font-extrabold leading-tight text-emerald-950 sm:text-3xl">
            ใบสรุปปิดงาน Corrective Maintenance
          </h1>
          <p className="mt-2 text-base font-bold text-gray-800">{organization.companyName}</p>
          <p className="mt-1 text-sm text-gray-600">Power Plant CM Control Center</p>
        </div>
      </header>

      <div className="mt-6 grid gap-5">
        <Section number={1} title="ข้อมูลงานซ่อม">
          <div className="grid gap-x-8 md:grid-cols-2 print:grid-cols-2">
            <div>
              <Field label="เลขที่แจ้งซ่อม" value={work.number} />
              <Field label="วันที่แจ้ง" value={work.createdAt} />
              <Field label="วันที่ปิดงาน" value={work.closedAt} />
            </div>
            <div>
              <Field label="สถานะ" value={work.status} />
              <Field label="วันที่รับเรื่อง" value={work.claimedAt} />
            </div>
          </div>
        </Section>

        <Section number={2} title="รายละเอียดงานซ่อม">
          <Field label="ผู้แจ้ง" value={work.requesterName} />
          <Field label="หน่วยงาน" value={work.requesterDepartment} />
          <Field label="Category" value={work.categoryName} />
          <Field label="Zone" value={work.zoneName} />
          <Field label="ชื่อเครื่องจักร" value={work.machineName} />
          <Field label="หัวข้อปัญหา" value={work.problemTitle} />
          <Field label="รายละเอียด" value={work.problemDetail} />
        </Section>

        <Section number={3} title="การดำเนินการแก้ไข">
          <Field label="สาเหตุ" value={work.rootCause} />
          <Field label="วิธีการแก้ไข" value={work.correctiveAction} />
          <Field label="หมายเหตุวิศวกร" value={work.engineerNote} />
        </Section>
      </div>

      <section className="mt-8 grid gap-8 border-t border-emerald-900/25 pt-6 sm:grid-cols-2 print:grid-cols-2">
        <SignatureBlock label="ผู้ดำเนินการ" person={work.claimant} />
        <SignatureBlock label="ผู้ตรวจรับ" person={work.reviewer} />
      </section>

      <footer className="mt-8 h-2 bg-emerald-900 print:bg-emerald-900" />
    </main>
  );
}
