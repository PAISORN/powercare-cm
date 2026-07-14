# Organization Admin

`ORGANIZATION_ADMIN` is the organization-level owner role between `ADMIN` and `SITE_ADMIN`.

## Scope

- `ADMIN`: system owner, all organizations and all sites.
- `ORGANIZATION_ADMIN`: one organization, all sites inside that organization.
- `SITE_ADMIN`: one site, with checkbox permissions.
- `ENGINEER`, `TECHNICIAN`, `VISITOR`: operational roles scoped by site/category and role rules.

## Organization Admin Permissions

- Manage sites inside the organization.
- Manage Site Admin permissions and quotas.
- Manage users inside the organization, except `ADMIN` and other `ORGANIZATION_ADMIN` accounts.
- Assign Site Admin, Engineer, Technician, and Visitor roles.
- Assign user sites and multiple work categories.
- View dashboard, all work, members, reports, notifications, and audit history across the organization.
- Manage organization profile, categories, zones, QR code, LINE settings, SLA, and engineer assignment settings.
- Receive CM notifications for work inside the organization.

## Restrictions

- Cannot manage Super Admin accounts.
- Cannot create or assign another `ORGANIZATION_ADMIN`.
- Cannot see platform-only tools such as announcements and global feedback unless those are intentionally promoted later.

