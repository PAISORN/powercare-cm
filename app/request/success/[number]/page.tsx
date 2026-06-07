import Link from "next/link";
import { PublicHeader } from "../../../../components/public-header";

export default async function RequestSuccessPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;

  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-2xl px-8 py-12">
        <h1 className="text-3xl font-bold">ส่งแจ้งซ่อมสำเร็จ</h1>
        <p className="mt-4 text-lg">
          เลขที่แจ้งซ่อม: <strong>{number}</strong>
        </p>
        <p className="mt-2 text-[var(--muted)]">กรุณาจดเลขที่แจ้งซ่อมไว้สำหรับติดตามสถานะ</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-md bg-[var(--primary)] px-4 py-2 text-white" href={`/tracking?number=${number}`}>
            ติดตามสถานะ
          </Link>
          <Link className="rounded-md border border-[var(--line)] px-4 py-2" href="/request">
            แจ้งซ่อมรายการใหม่
          </Link>
        </div>
      </section>
    </main>
  );
}
