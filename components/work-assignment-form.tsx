import { UserRoundPlus } from "lucide-react";

type TechnicianOption = {
  id: string;
  fullName: string;
};

type WorkAssignmentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  technicians: TechnicianOption[];
};

export function WorkAssignmentForm({ action, technicians }: WorkAssignmentFormProps) {
  if (technicians.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No active technician is available in this category
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <label className="grid gap-1 text-sm font-semibold">
        Technician
        <select
          aria-label="Technician"
          className="min-h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3"
          defaultValue=""
          name="technicianId"
          required
        >
          <option disabled value="">
            Select technician
          </option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.fullName}
            </option>
          ))}
        </select>
      </label>
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]"
        type="submit"
      >
        <UserRoundPlus aria-hidden="true" size={18} />
        Assign work
      </button>
    </form>
  );
}
