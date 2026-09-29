export function IssuePageFeedback({
  created,
  error,
  saved,
}: {
  created?: string;
  error?: string;
  saved?: string;
}) {
  return (
    <>
      {created ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">
          ส่งคำขอเบิกสำเร็จ เลขที่ใบเบิก:{" "}
          <span className="font-mono">{created}</span>
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">
          บันทึกการดำเนินการเรียบร้อยแล้ว
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-700 dark:text-red-300"
          role="alert"
        >
          ดำเนินการไม่สำเร็จ: {error}
        </p>
      ) : null}
    </>
  );
}
