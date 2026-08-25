# PM Planning and Work Design

## Objective

Add a Preventive Maintenance module that lets a Site organize registered Assets into reusable PM Groups, place one or more groups on a calendar date, confirm the resulting daily plan, execute one PM Work per distinct Asset, and retain the completed result in that Asset's PM record.

Detailed inspection checklists, measurements, maintenance disciplines, recurring schedules, LINE messages, and email are outside the initial scope.

## Domain boundaries

### PM Group is not Zone

The existing Zone master describes a plant system, area, or operational location used by Assets and CM. PM needs flexible collections that do not follow physical Zone membership, so the new concept is `PM Group`.

A PM Group belongs to one Site and contains registered Assets from that Site. PM treats every selected Asset as an independent target and does not infer coverage through Parent/Child relationships.

An Asset may belong to multiple PM Groups but may appear only once in the same group.

### PM Group identity and lifecycle

Each PM Group has:

- a Site-unique code;
- a name;
- an active/inactive state;
- zero or more Asset members.

The code and name may be edited before first use. After the group has appeared in a confirmed plan, its code is immutable while its name remains editable. Confirmed plans preserve a snapshot of the code and name used at confirmation.

An unused PM Group may be deleted. A used PM Group is deactivated instead and may later be reactivated. An empty active group may be saved for preparation, but it creates no work and cannot by itself support plan confirmation.

Only Assets with active registration may be added. Under Repair, Standby, and Temporarily Out of Service operating states remain eligible. If an Asset is retired after plan confirmation, its PM Work remains visible with a warning and requires an explicit decision to continue or cancel.

## Calendar planning

### Daily plan

There is at most one PM Plan per Site and planned calendar date. The initial scope uses a date in `Asia/Bangkok` without start/end times.

The user selects a date and adds one or more PM Groups through `+ เพิ่ม PM Group`. Planning is manual; recurrence templates and automatic future generation are deferred.

### Draft

A newly created plan is Draft. The user may:

- add or remove PM Groups;
- move the plan to another date;
- review the union of current Assets from all groups;
- review empty groups, retired-Asset warnings, and duplicate membership.

Draft plans create no PM Works. Draft deletion removes the draft without creating work history.

### Confirmation

Confirmation performs one transaction that:

1. reloads the current active membership of every selected PM Group;
2. skips empty groups with a warning;
3. unions Assets by Asset ID;
4. preserves every source PM Group for Assets that appeared in more than one group;
5. rejects confirmation if no eligible Asset remains;
6. stores the PM Group identity and Asset snapshots;
7. creates one PM Work for every distinct Asset;
8. changes the plan to Confirmed.

The same Asset included by multiple groups produces one PM Work, not duplicate work.

### Confirmed-plan changes

Confirmed PM Group snapshots are not edited. Later PM Group membership changes affect only future plans.

An authorized manager may add an individual Asset after confirmation by providing a reason. The work is marked as added after confirmation and the action is audited. Removing work is represented by canceling an unstarted PM Work with a reason; records are never deleted.

A Draft plan may move freely. A Confirmed plan may move only while all PM Works remain Planned. The system records the old date, new date, actor, and time. Once any work starts, the original date is preserved and unperformed work must be canceled and replanned explicitly.

A Confirmed plan may be canceled as a whole, with a reason, only while every PM Work remains Planned. If any work is In Progress or Completed, the plan remains and only unperformed works may be canceled individually.

Routine plans may be created for today or a future date. Owner Admin and Organization Admin may create a backdated plan to recover omitted records only when a reason is supplied and audited.

## Identifiers

References are immutable even when a plan is rescheduled:

- PM Plan: `PMP-{SITE_CODE}-{CREATION_DATE}-{PLAN_SEQUENCE}`
- PM Work: `PM-{SITE_CODE}-{CREATION_DATE}-{PLAN_SEQUENCE}-{WORK_SEQUENCE}`

The planned date must always be read from plan data, not parsed from the reference.

## PM Work

### Lifecycle

Each distinct selected Asset receives one PM Work under the confirmed plan:

- `PLANNED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELED`

Cancellation requires a reason. A Daily PM Plan is complete when every work is Completed or Canceled; there is no separate manual close-plan operation.

`OVERDUE` is a derived warning for Planned or In Progress work whose plan date has passed. It does not replace the lifecycle status, cancel work, or move its date. Overdue work remains actionable and retains planned and actual timestamps.

### Assignment and execution

Pre-assignment is optional. A PM Work supports:

- one lead performer;
- multiple collaborators;
- a separately recorded completing User.

All assignees must have PM Execution Permission within the same Site. An unassigned work may be claimed by an eligible User. After assignment, operational results may be changed only by an assigned performer or an authorized PM manager. A manager may change responsibility within scope.

### Initial completion result

Completing work records:

- the completing User automatically;
- completion timestamp automatically;
- result: Normal or Abnormal;
- a note, optional for Normal and required for Abnormal.

Attachments, checklists, measurements, and Electrical/Mechanical/Instrumentation sections are deferred.

After completion, performers cannot edit the result. Owner Admin, Organization Admin, and Site Admin may correct it within scope only with a reason. History preserves old values, new values, actor, and time. A completed work cannot change Asset or owning plan.

### Abnormal result and CM

An Abnormal result does not create CM automatically. The completed work offers `สร้างงาน CM จากผล PM`, prefilled with the Asset and abnormality note. A User must also have the existing CM creation permission. Once created, the CM Work and PM Work link to each other.

## Permissions and scope

Use the existing layered Role and User override architecture. Add action permissions rather than building a parallel PM permission system.

| Capability | Default access |
| --- | --- |
| View PM | Every authenticated Role within its data scope |
| Manage PM Groups | Owner Admin: all Sites; Organization Admin: Sites in its Organization; Site Admin: own Site |
| Manage PM Plans and edit PM Works | Owner Admin: all Sites; Organization Admin: Sites in its Organization; Site Admin: own Site |
| Execute PM Work | Engineer and Technician within their Site |
| Create CM from PM | Existing CM creation permission |
| Configure Role/User PM permissions | Owner Admin |

Owner Admin, Organization Admin, and Site Admin do not receive PM Execution Permission merely because they can manage plans. An Admin who performs PM requires an explicit Role or User override. All server mutations must enforce permission and Organization/Site scope; menu visibility is not authorization.

Suggested keys:

- `VIEW_PM`
- `MANAGE_PM_GROUPS`
- `MANAGE_PM_PLANS`
- `EXECUTE_PM_WORK`

## User experience

### Module navigation

Add a PM module separate from CM and Assets:

1. `ปฏิทิน PM`
2. `PM Groups`
3. `งาน PM`

The Work page filters Planned, In Progress, Overdue, Completed, and Canceled work by date range, PM Group, Asset, and assignee.

### Calendar

Desktop and tablet use a monthly calendar. Each day shows compact counts for groups, PM Works, and status mix; selecting the day opens its Daily PM Plan rather than listing all Assets inside the cell.

Mobile uses an agenda list ordered by date. Both layouts provide previous month, next month, and today controls.

### Asset PM tab

Add a PM tab to the Asset record with:

- upcoming work: Planned, In Progress, and Overdue;
- history: Completed and Canceled;
- result, performers, completion time, note, and linked CM Work where applicable.

## Notifications

Use in-app notifications in the initial release for:

- new assignment;
- responsibility change;
- work due today;
- work becoming Overdue;
- CM Work created from an Abnormal PM result.

Do not send LINE or email in the initial release. Notification jobs must be idempotent so due/overdue events are not emitted repeatedly.

## Summary and export

Show initial summary counts for Today, Planned, In Progress, Overdue, Completed, and Abnormal. Support filters for date range, PM Group, Asset, and assignee, plus CSV export.

Advanced PM Compliance, Schedule Attainment, and MTBF analytics are deferred.

## Data model direction

Names are directional and may be adjusted to repository conventions:

- `PmGroup`: Site, code, name, active, first-used marker/timestamp.
- `PmGroupAsset`: unique membership of one Asset in one PM Group.
- `PmPlan`: Site, immutable number, planned date, lifecycle, confirmation/cancellation/reschedule/backdate metadata.
- `PmPlanGroupSnapshot`: source PM Group ID plus captured code/name.
- `PmPlanAssetSnapshot`: captured Asset identity and all source group snapshots.
- `PmWork`: immutable number, plan, Asset, captured Asset code/name, lifecycle, result, note, assignment and activity timestamps.
- `PmWorkSourceGroup`: work-to-group source links for deduplicated membership.
- `PmWorkAssignee`: lead/collaborator assignments.
- existing Audit History for every material mutation.
- optional link from `CmWork` to its originating `PmWork`.

Required database constraints include:

- unique PM Group code per Site;
- unique Asset membership per PM Group;
- at most one non-canceled/current PM Plan per Site and planned date, with transaction-safe rescheduling;
- unique Asset per PM Plan;
- unique plan and work numbers;
- assignees restricted by application authorization and Site scope.

## Delivery sequence

1. Add PM schema, immutable reference generation, audit actions, and migrations.
2. Add PM permission keys, defaults, overrides, scope helpers, navigation rules, and permission tests.
3. Build PM Group management and Asset selection.
4. Build Draft Daily PM Plan and monthly/agenda calendar.
5. Implement transactional confirmation, snapshots, deduplication, and PM Work creation.
6. Build assignment, claim, lifecycle, completion, cancellation, correction, and rescheduling flows.
7. Add Asset PM tab and PM-originated CM linking.
8. Add in-app notifications, summaries, filters, and CSV export.
9. Add unit, permission, integration, concurrency, and responsive end-to-end tests.

## Acceptance scenarios

1. One Asset in two selected groups creates one PM Work and retains both group sources.
2. Parent and Child Assets selected independently each create work; hierarchy adds no implicit coverage.
3. Changing group membership after confirmation does not mutate existing work.
4. An empty group may be saved but cannot create or solely confirm a plan.
5. A retired Asset does not disappear from confirmed work and shows a warning.
6. A Confirmed plan cannot move after any work begins.
7. Overdue work remains actionable without automatic status or date mutation.
8. An Abnormal result requires a note and does not create CM without explicit confirmation and CM permission.
9. Completed data correction requires an authorized Admin, a reason, and preserved before/after history.
10. Every server mutation rejects cross-Site access even if a route or control is manually invoked.
