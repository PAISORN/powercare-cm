export function CmCalendar() {
  return (
    <div className="grid grid-cols-7 gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
      {Array.from({ length: 28 }, (_, index) => (
        <div key={index + 1} className="aspect-square rounded-md border border-[var(--line)] p-2 text-sm">
          {index + 1}
        </div>
      ))}
    </div>
  );
}
