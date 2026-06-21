# Status Notification Badges Design

Date: 2026-06-19
Status: Approved design, pending written-spec review

## Goal

Extend the in-app notification center so unread CM activity is visible not only in the notification bell, but also as red count badges on Dashboard KPI cards, CM Work List status cards, and individual Work Results rows.

## Source of Truth

`UserNotification` is the only source of unread state. Badge counts are derived from unread CM notifications for the current user. The system must not maintain a separate counter table or browser-only read state.

This guarantees that the bell, Dashboard, Work List, and Work Results remain consistent across pages, sessions, and devices.

## Badge Placement

### Dashboard

- `Total CM`: all unread CM work notifications.
- `New Request`: unread notifications whose destination status is `NEW`.
- `In Process`: unread notifications for `WAITING_TO_CLAIM`, `CLAIMED`, `IN_PROGRESS`, `WAITING_TO_CLOSE`, or `RETURNED_FOR_CORRECTION`.
- `Closed`: unread notifications whose destination status is `CLOSED`.
- `Cancel`: unread notifications whose destination status is `CANCELED`.

### CM Work List

Each of the eight status cards displays the number of unread CM notifications whose destination status matches that card.

### Work Results

Each work row displays a small red indicator when the current user has at least one unread notification for that CM work. The indicator is visual support only and must also have an accessible text label.

## Read Behavior

- Clicking a Dashboard KPI or Work List status card marks all unread notifications in that status group as read, then opens CM Work List with the matching filter.
- Clicking `Total CM` marks all unread CM work notifications as read, then opens the unfiltered CM Work List.
- Clicking a Work Results row marks unread notifications for that CM work as read, then opens the work detail page.
- Opening the notification bell alone does not mark anything as read.
- Opening a notification row marks only that notification as read.
- `Mark all as read` marks every notification for the current user as read.
- Read operations are idempotent and always include `recipientId` for the current user.

## Recipient and Event Rules

Notifications are created only for active users who are permitted to see the target work.

- New request: Admin plus Engineer and Technician users in the matching category.
- Assignment or claim: assigned Technician, matching-category Engineers, and Admin.
- Work progress and waiting close: claimant, matching-category Engineers, and Admin.
- Returned for correction: claimant and Admin, plus matching-category Engineers other than the actor when applicable.
- Closed or canceled: claimant, matching-category Engineers, and Admin.
- The actor is excluded when the event would otherwise notify only the actor about the actor's own action, except where an explicit work receipt is useful.

Every CM notification stores `eventType`, `entityType = CmWork`, `entityId`, target status, title, message, href, created time, and optional read time.

## UI Rules

- Badges are compact red circles, not oversized floating shapes.
- Counts from 1 to 99 are shown as numbers; larger counts show `99+`.
- Zero unread items render no badge.
- Badge placement must not resize or shift the card layout.
- Desktop and mobile cards retain stable dimensions and no horizontal overflow.
- Day and Night themes use the same red semantic color with sufficient contrast.

## Data Flow

1. A CM mutation succeeds inside a database transaction.
2. The same transaction writes status history and recipient notifications.
3. Dashboard and Work List queries load unread counts grouped by target status for the current user.
4. Work Results loads the set of work IDs with unread notifications for the current page.
5. A card or row click submits a server-side read operation scoped to the current user and selected group or work.
6. The server redirects to the filtered list or work detail page.

## Security and Errors

- Notification reads and updates are server-authorized and scoped to the current user's `recipientId`.
- A user cannot mark another user's notifications as read.
- Before opening a notification target, the server rechecks current work permission.
- A missing or inaccessible target is marked read and redirects to Notifications with a target-unavailable message.
- A failed notification insert rolls back the related CM transaction once notifications are part of that transaction.
- Public requesters do not receive in-app notifications because they have no authenticated account.

## Testing

- Recipient selection by Role and Category.
- Event-to-status mapping for every CM transition.
- Unread grouping for exact status and Dashboard aggregate groups.
- Read-one, read-status-group, read-work, and read-all isolation per user.
- Badge count cap at `99+` and zero-badge omission.
- Card click marks only its group and preserves other unread groups.
- Work row click clears only that work's unread state.
- Desktop and mobile browser verification in Day and Night modes.

## Acceptance Criteria

- Bell, Dashboard, Work List, and Work Results show counts from the same unread notification data.
- Dashboard aggregate mappings match the definitions above.
- Status-card clicks mark the selected group read and apply the correct Work List filter.
- Work-row clicks mark only the selected work read.
- Badge state remains consistent across page changes and devices.
- No notification or read operation exposes work outside the user's Role and Category permission.
- Production database and deployed website remain unchanged until explicit deployment approval.
