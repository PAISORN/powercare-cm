import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";

export function IssueActionHiddenFields({
  issueId,
  returnTo,
  scope,
}: {
  issueId: string;
  returnTo: string;
  scope: AdminSiteScope;
}) {
  return (
    <>
      <AdminScopeHiddenFields scope={scope} />
      <input name="issueId" type="hidden" value={issueId} />
      <input name="returnTo" type="hidden" value={returnTo} />
    </>
  );
}
