import { CalendarDays, Megaphone, Pin } from "lucide-react";
import Image from "next/image";

type PublicAnnouncement = {
  id: string;
  title: string;
  content: string;
  publishStart: Date;
  publishEnd: Date;
  pinned: boolean;
  isNew: boolean;
  imageStoragePath: string | null;
  authorName: string;
};

const dateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function PublicAnnouncements({ announcements }: { announcements: PublicAnnouncement[] }) {
  if (announcements.length === 0) return null;
  const ordered = [...announcements].sort(
    (left, right) => Number(right.pinned) - Number(left.pinned) || right.publishStart.getTime() - left.publishStart.getTime(),
  );

  return (
    <section className="mt-6" aria-labelledby="public-announcements-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
            <Megaphone aria-hidden="true" size={17} />
            Plant Communication
          </p>
          <h2 className="mt-1 text-2xl font-extrabold" id="public-announcements-title">
            ประกาศโรงไฟฟ้า
          </h2>
        </div>
        <span className="text-sm text-[var(--muted)]">{announcements.length} รายการ</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {ordered.map((announcement) => (
          <article
            className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] only:lg:col-span-2 sm:grid sm:grid-cols-[180px_1fr] only:sm:grid-cols-[240px_1fr]"
            key={announcement.id}
          >
            {announcement.imageStoragePath ? (
              <div className="relative aspect-[16/9] bg-[var(--soft)] sm:aspect-auto sm:min-h-48">
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 100vw, 180px"
                  src={`/announcement-images/${announcement.id}`}
                  unoptimized
                />
              </div>
            ) : (
              <div className="grid aspect-[16/9] place-items-center bg-[var(--soft)] text-[var(--primary)] sm:aspect-auto sm:min-h-48">
                <Megaphone aria-hidden="true" size={42} />
              </div>
            )}

            <div className="min-w-0 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {announcement.pinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                    <Pin aria-hidden="true" size={13} /> สำคัญ
                  </span>
                ) : null}
                {announcement.isNew ? (
                  <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-extrabold text-white">NEW</span>
                ) : null}
              </div>
              <h3 className="mt-3 text-lg font-extrabold">{announcement.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--muted)]">{announcement.content}</p>
              <div className="mt-4 flex items-start gap-2 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                <CalendarDays aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
                <span>
                  {dateFormatter.format(announcement.publishStart)} - {dateFormatter.format(announcement.publishEnd)} · {announcement.authorName}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
