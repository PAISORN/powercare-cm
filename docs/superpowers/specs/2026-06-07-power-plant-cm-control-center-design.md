# Power Plant CM Control Center Design

## Summary

Power Plant CM Control Center is a web application for managing Corrective Maintenance (CM) in a power plant. The first release focuses on a practical MVP: public repair requests, public status tracking, role-based dashboards, CM work claiming by maintenance category, engineer review, printable CM completion documents, admin back office settings, and Excel report export.

The system name shown in the product is **Power Plant CM Control Center** with Thai supporting text: **ระบบแจ้งซ่อมและติดตามงาน Corrective Maintenance**.

## Goals

- Let requesters submit repair requests without login.
- Give requesters a CM work number for public status tracking.
- Provide public dashboard visibility without exposing internal work details.
- Let Admin, Engineer, and Technician users manage CM work through role-based dashboards.
- Support Electrical and Mechanical categories in the first release.
- Support 10 initial plant zones.
- Let eligible users claim work themselves by category.
- Require engineer review before CM work is closed.
- Generate printable CM completion documents after work is closed.
- Store signatures in user profiles and render them automatically on completion documents when available.
- Let Admins and Engineers export filtered CM work lists to Excel.
- Keep audit history for important changes, especially changes after closure.

## Non-Goals For First Release

- LINE or email notifications.
- Two-factor authentication.
- Active Directory or LDAP integration.
- Spare parts, material usage, or labor hour tracking.
- Multi-step approval beyond engineer review.
- Separate mobile app.
- ERP integration.
- Advanced KPI such as mean time from request to closure.
- Multi-category assignment for one Engineer or Technician.

## Roles And Permissions

### Requester

The requester does not need a login or system role.

Allowed actions:
- Submit a repair request.
- See public dashboard information.
- Track basic status using the CM work number.

Not allowed:
- Print CM completion documents.
- See internal notes, root cause, corrective action, technician notes, engineer notes, audit trail, or signatures.
- Edit a submitted repair request.

### Admin

Admin is not tied to a category.

Allowed actions:
- See all CM work in all categories and zones.
- Create, edit, deactivate, and manage users.
- Assign role and category for Engineers and Technicians.
- Upload or edit user signatures.
- Manage Zone, Category, and SLA settings.
- Edit closed CM work for typo or missing-data corrections with audit trail.
- Cancel any CM work with a required reason.
- Print completion documents for any closed CM work.
- Export filtered CM work lists to Excel.

### Engineer

Engineer has exactly one category in the first release, such as Electrical or Mechanical.

Allowed actions:
- See all CM work.
- Claim work in their own category.
- Change urgency for work in their own category.
- Cancel work in their own category with a required reason.
- Review technician completion details in their own category.
- Return CM work to the technician for correction.
- Close CM work in their own category.
- Print completion documents for any closed CM work.
- Export filtered CM work lists to Excel.

Not allowed:
- Claim, cancel, review, or close work outside their category.
- Manage users or master data unless also granted Admin in a later release.

### Technician

Technician has exactly one category in the first release, such as Electrical or Mechanical.

Allowed actions:
- See all CM work.
- Claim work in their own category.
- Release claimed work back to the claim queue with a required reason.
- Update practical work fields for their claimed work: root cause, corrective action, and technician note.
- Move their claimed work to in-progress.
- Submit their claimed work for engineer review.
- Print completion documents for any closed CM work.

Not allowed:
- Claim work outside their category.
- Edit original repair request fields.
- Change urgency.
- Cancel CM work.
- Close CM work directly.
- Export Excel reports in the first release.

## Initial Master Data

### Categories

- งานไฟฟ้า
- งานเครื่องกล

Admin can add, edit, and deactivate categories. A category that is already used by CM work must not be deleted.

### Zones

Initial zones:

- Fuel preparation
- Fuel Warehouse
- Boiler&Combustion
- Turbine
- ESP
- Water Treatment Plant
- Cooling Tower
- Vehicle
- Office
- Other

Admin can add, edit, and deactivate zones. A zone that is already used by CM work must not be deleted.

### Roles

- Admin
- Engineer
- Technician

Engineer and Technician users have one category assignment. Admin does not have a category assignment.

## Repair Request Form

The no-login repair request form captures:

- Requester name.
- Requester department.
- Category.
- Zone.
- Machine name.
- Problem title.
- Problem detail.
- Urgency: ปกติ, เร่งด่วน, วิกฤต.
- Created date and time, generated automatically by the system.

The form does not include contact channel or image attachment in the first release.

After successful submission, the system shows:

- CM work number, using the same value as the repair request number.
- Initial status: แจ้งใหม่.
- Message telling the requester to keep the number for tracking.
- Button to track status.
- Button to submit another repair request.

## CM Work Number

The CM work number format is:

```text
CM-YYYY-MM-0001
```

The sequence resets monthly. The same number is used as the repair request number, CM work number, and printed completion document reference.

## Workflow

### Statuses

First release statuses:

- แจ้งใหม่
- รอรับงาน
- รับเรื่องแล้ว
- กำลังดำเนินการ
- รอปิดงาน
- ส่งกลับให้แก้ไข
- ปิดงานแล้ว
- ยกเลิก

### Main Flow

1. Requester submits a repair request.
2. System creates a CM work number and sets status to แจ้งใหม่.
3. A Technician or Engineer in the same category claims the work.
4. Status becomes รับเรื่องแล้ว.
5. The claimant starts work and moves status to กำลังดำเนินการ.
6. The claimant records root cause, corrective action, and work note. In normal operation, this is done by a Technician.
7. The claimant submits work for engineer review.
8. Status becomes รอปิดงาน.
9. Engineer reviews the completion details.
10. Engineer either closes the work or returns it for correction.
11. Closed work becomes ปิดงานแล้ว and can be printed.

### Return For Correction

If the Engineer decides completion details are incomplete, they add an engineer note and return the work. The status becomes ส่งกลับให้แก้ไข. The Technician updates the details and submits again for review.

### Release Back To Claim Queue

If a Technician claims work by mistake or cannot continue, they can release it back to the queue while the work is รับเรื่องแล้ว or กำลังดำเนินการ. A reason is required. The status becomes รอรับงาน.

### Cancellation

Admin can cancel any work. Engineer can cancel only work in their category. A cancellation reason is required every time. Canceled work cannot produce a completion document.

## Dashboards And Filters

### Public Dashboard

The public dashboard is visible without login and shows overview information only.

It includes:

- Total CM work count.
- Count by status.
- Count by category.
- Count by zone.
- Count by urgency.
- Overdue CM work count based on SLA.
- New repair requests per day in the selected month.
- Closed work by month.
- Latest 10 CM work items.

Latest items show only:

- CM work number.
- Request date.
- Category.
- Zone.
- Machine name.
- Status.

### Logged-In Dashboard

Admin sees all work and back office shortcuts.

Engineer sees all work but action badges focus on:
- Work in their category.
- Work waiting for engineer review.
- Critical or overdue work.

Technician sees all work but the dashboard emphasizes:
- New work in their category.
- Their claimed work.
- Returned work needing correction.

### Filters

Dashboard and work list filters include:

- Month and year calendar filter.
- Status.
- Category.
- Zone.
- Urgency.
- Claimant.
- Requester department.
- Search text for CM work number, machine name, or problem title.

The main monthly calendar uses the repair request date to show incoming workload. Work accepted, review, and closure dates appear in work detail.

## SLA And Overdue Rules

Default SLA settings:

- แจ้งใหม่ or รอรับงาน over 1 day: overdue for claim.
- รับเรื่องแล้ว or กำลังดำเนินการ over 3 days: overdue for execution.
- รอปิดงาน over 2 days: overdue for engineer review.

Overdue age is counted from the time the work entered the relevant status group. Admin can change SLA thresholds in back office settings.

No individual due date is required in the first release.

## Pages

### Public Pages

- Landing Page.
- Public Dashboard.
- Repair Request Form.
- Submit Success.
- Public Tracking.
- Login.

### Logged-In Pages

- Role Dashboard.
- All CM Work List.
- CM Work Detail.
- My Profile.
- Completion Document Print View.
- Admin User Management.
- Admin Zone Management.
- Admin Category Management.
- Admin SLA Settings.
- Admin Audit View.
- Report Export.

## CM Work Detail Page

The detail page includes:

- CM work number / repair request number.
- Original repair request information.
- Current status and status history.
- Claimant information.
- Technician work notes: root cause, corrective action, technician note.
- Engineer review: engineer note, return for correction, close work.
- Completion document section.
- Audit trail.

## Completion Document

The printable completion document is available only when CM work is ปิดงานแล้ว.

Every logged-in role can print closed CM work from any category. Public users and requesters cannot print it.

The document is primarily Thai, with limited English where useful, such as Corrective Maintenance.

It includes:

- CM work number / repair request number.
- Request date.
- Claim date.
- Close date.
- Requester name.
- Requester department.
- Category.
- Zone.
- Machine name.
- Problem title.
- Problem detail.
- Root cause.
- Corrective action.
- Technician / performer.
- Engineer reviewer.
- Status.
- Technician signature area.
- Engineer signature area.

Signatures are stored in Engineer and Technician profiles. If a signature exists, it appears automatically on the document. If no signature exists, the document can still be printed with a blank signature area, and the system should warn that the profile has no signature.

## User Profiles And Signatures

User profile fields:

- Full name.
- Username.
- Role.
- Category for Engineer and Technician.
- Department.
- Signature for Engineer and Technician.
- Active or inactive status.
- Created and updated timestamps.

Signature upload:

- Supports PNG and JPG.
- Maximum file size is 2 MB.
- Transparent PNG is recommended but not required.
- Profile page should preview the signature before saving.

Creating an Engineer or Technician does not require a signature. Missing signatures should be visible as an admin warning.

## Reports And Export

Admin and Engineer can export filtered CM work lists to Excel. Export uses the same filters as Dashboard and All CM Work List.

The export is for reporting and is separate from the printable CM completion document.

Technician export is not included in the first release.

## Visual Design

The visual direction combines Industrial Command Center and Dark Control Room.

Theme behavior:

- Day Mode is bright and readable for normal daily work.
- Night Mode is dark and suitable for control room or nighttime use.
- On first page load, the default theme is selected by Thailand time.
- 06:00-17:59 starts in Day Mode.
- 18:00-05:59 starts in Night Mode.
- Users can manually switch Day or Night during use.

The landing page should not be a long marketing page. It must be immediately usable with visible repair request entry, login, and public dashboard overview in the first screen.

## Audit Trail

Audit trail records important changes, including:

- Status changes.
- Claim and release events.
- Cancellation with reason.
- Return for correction.
- Closure.
- Admin edits after closure.
- Changes to urgency.

For each audit event, record who performed it, when it happened, and what changed.

Closed CM work can be edited only by Admin for typo or missing-data corrections, and every edit must be audited.

## Error Handling And Validation

- Required repair request fields must be validated before submission.
- Category and Zone must be active when selected.
- A user cannot claim work outside their category.
- A user cannot claim work already claimed by another user.
- Cancellation requires a reason.
- Release back to queue requires a reason.
- Engineer return for correction requires an engineer note.
- Print view is unavailable for non-closed or canceled work.
- Public tracking should show a friendly not-found message for invalid CM work numbers.
- Missing signatures should not block closure or printing.

## Testing Focus

First release testing should cover:

- Public repair request submission.
- CM work number generation and monthly sequence.
- Public tracking visibility limits.
- Role permission boundaries.
- Category-based claim restrictions.
- Main workflow from new request to closed work.
- Return for correction.
- Release back to claim queue.
- Cancellation with required reason.
- SLA overdue calculation.
- Completion document rendering with and without signatures.
- Excel export permission and filter behavior.
- Admin edits after closure and audit trail recording.
- Day/Night default by Thailand time and manual switching.
