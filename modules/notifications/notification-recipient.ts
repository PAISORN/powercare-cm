import { isSiteAdminRole, RoleName } from "../cm-work/cm-work-types";

type CandidateUser = { id: string; role: string; categoryId: string | null; plantId?: string | null; active: boolean };
type RecipientEvent = { eventType: string; categoryId: string; plantId: string | null; actorId: string | null; claimantId: string | null };

function samePlant(user: CandidateUser, event: RecipientEvent) {
  return user.plantId === event.plantId;
}

export function selectRecipients(event: RecipientEvent, users: CandidateUser[]) {
  const selected = users.filter((user) => {
    if (!user.active || user.id === event.actorId) return false;
    if (user.role === RoleName.ADMIN || user.role === RoleName.ORGANIZATION_ADMIN) return true;
    if (isSiteAdminRole(user.role)) return samePlant(user, event);
    if (user.id === event.claimantId) return true;
    return samePlant(user, event) && user.categoryId === event.categoryId && (user.role === "ENGINEER" || user.role === "TECHNICIAN");
  });
  return [...new Map(selected.map((user) => [user.id, user])).values()];
}
