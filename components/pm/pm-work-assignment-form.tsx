type AssigneeOption = { id: string; fullName: string; role: string };

export function PmWorkAssignmentForm({ action, users, defaultLeadId, defaultCollaboratorIds = [] }: {
  action: (data: FormData) => void | Promise<void>;
  users: AssigneeOption[];
  defaultLeadId?: string;
  defaultCollaboratorIds?: string[];
}) {
  return <form action={action} className="grid gap-4 rounded-2xl border border-[var(--line)] p-4">
    <label className="grid gap-1 text-sm font-bold">Lead performer
      <select aria-label="Lead performer" className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" defaultValue={defaultLeadId ?? ""} name="leadUserId" required>
        <option disabled value="">Select lead</option>
        {users.map(user => <option key={user.id} value={user.id}>{user.fullName} · {user.role}</option>)}
      </select>
    </label>
    <fieldset className="grid gap-2"><legend className="text-sm font-bold">Collaborators</legend>
      <div className="grid gap-2 sm:grid-cols-2">{users.map(user => <label className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--soft)] px-3 text-sm" key={user.id}>
        <input defaultChecked={defaultCollaboratorIds.includes(user.id)} name="collaboratorUserIds" type="checkbox" value={user.id} />{user.fullName}
      </label>)}</div>
    </fieldset>
    <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 font-bold text-white sm:justify-self-end" type="submit">Save assignment</button>
  </form>;
}
