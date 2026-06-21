type CandidateUser = { id: string; role: string; categoryId: string | null; active: boolean };
type RecipientEvent = { eventType: string; categoryId: string; actorId: string | null; claimantId: string | null };

export function selectRecipients(event: RecipientEvent, users: CandidateUser[]) {
  const selected = users.filter((user) => {
    if (!user.active || user.id === event.actorId) return false;
    if (user.role === "ADMIN") return true;
    if (user.id === event.claimantId) return true;
    return user.categoryId === event.categoryId && (user.role === "ENGINEER" || user.role === "TECHNICIAN");
  });
  return [...new Map(selected.map((user) => [user.id, user])).values()];
}
