export function ActivityEmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-sm font-semibold text-[var(--muted)]">
      {text}
    </div>
  );
}
