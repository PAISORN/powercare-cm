# Engineer Work Assignment Control Design

Date: 2026-06-19
Status: Approved

## Goal

Allow an administrator to enable or disable the ability for engineers to assign CM work to technicians. The setting is global, takes effect immediately, and does not restrict administrator assignment.

## Permission Rules

- Admin can assign eligible work at all times.
- Engineer can assign work only when the global setting is enabled.
- Engineer can assign only work in the engineer's own category.
- Engineer can select only active technicians in the same category.
- Technician cannot assign work to another user.
- A work item can be assigned only while it has no claimant and is in a claimable status.
- Existing technician self-claim rules remain unchanged.
- Turning the setting off does not remove assignments already made.

## System Setting

Add a singleton system setting named `engineerWorkAssignmentEnabled` with a default value of `false`. Store it in the database so an Admin can change it without a deployment and all application instances use the same value.

Both the local Prisma schema and the Supabase Prisma schema must contain the setting. Production migration files may be prepared, but no production database migration or deployment is performed without explicit user approval.

## Admin Experience

Add an Admin-only `System Settings` page containing a clearly labelled on/off switch:

- Label: `Engineer Work Assignment`
- Off description: Engineers cannot assign work to technicians.
- On description: Engineers can assign work to technicians in the same category.

Saving the setting records the acting Admin, the previous value, the new value, and Bangkok date/time in the audit history. A visible success or error state confirms the result.

## Work Assignment Experience

On an eligible work detail page:

- Admin sees the assignment control regardless of the global setting.
- Engineer sees the control only when the setting is enabled and the work category matches.
- The technician selector lists only active technicians in the permitted category.
- The action requires an explicit technician selection and confirmation.
- After success, the work claimant is updated and the normal audit/status history records who assigned the work and to whom.

When an engineer is not permitted, the assignment action is unavailable in the interface. The server action independently enforces the same rules and returns a permission error for direct or stale requests.

## Data Flow

1. Load the current user, work item, and global assignment setting.
2. Evaluate role, setting, work category, technician category, active-user state, claimant state, and work status.
3. Update the claimant inside a database transaction.
4. Write work audit/status history in the same transaction.
5. Refresh the work detail page and show the assigned technician.

The permission decision is centralized in the authorization module so the UI and service layer use the same rules.

## Error Handling

- Setting disabled after page load: reject the engineer assignment and leave the work unchanged.
- Work already claimed: reject the assignment and show that another user has taken the work.
- Category mismatch: reject the assignment.
- Technician inactive or missing: reject the assignment.
- Invalid work status: reject the assignment.
- Database failure: roll back both claimant update and audit history.

## Security

- Only Admin can update the global setting.
- The server checks authorization for every setting and assignment mutation.
- Hiding controls in the UI is not treated as authorization.
- Setting changes and assignment attempts that succeed are auditable.
- No Supabase service key or privileged credential is exposed to the browser.

## Testing

Unit tests cover the permission matrix for Admin, Engineer, and Technician, including setting state and category matching. Service tests cover successful assignment and rejection for disabled settings, mismatched categories, inactive technicians, already claimed work, and invalid statuses. Component or source tests cover Admin navigation and setting-control visibility. Browser verification covers desktop and mobile Admin settings plus Admin and Engineer assignment flows.

## Acceptance Criteria

- Admin can turn engineer assignment on or off from the application.
- The default setting is off.
- Admin can assign eligible work whether the setting is on or off.
- Engineer can assign only when enabled and only to a technician in the same category.
- Technician cannot assign work to another user.
- Existing self-claim behavior continues to work.
- A stale or direct request cannot bypass server authorization.
- Setting changes and successful assignments appear in audit history.
- Local development verification does not modify the production database.
