# Database Reference

> Schema snapshot: 14 July 2026.  
> Development schema: `prisma/schema.prisma` (SQLite).  
> Production schema: `prisma/schema.supabase.prisma` (PostgreSQL/Supabase).

## 1. Database Strategy

PowerCare.CM maintains two Prisma schemas with the same domain models:

- SQLite for local development and disposable test data.
- PostgreSQL for Supabase production/staging.

Schema changes require four coordinated updates:

1. SQLite Prisma schema.
2. PostgreSQL Prisma schema.
3. Local migration under `prisma/migrations/`.
4. Supabase SQL migration under `prisma/supabase-migrations/`.

Never assume these are synchronized merely because Prisma Client generates successfully.

## 2. Conventions

- Primary keys are usually CUID strings.
- `createdAt` and `updatedAt` are UTC timestamps.
- Tenant-owned operational tables carry `organizationId` and `plantId`.
- UI terminology is **Site**; schema terminology remains **Plant**.
- Statuses, roles, events, and permission keys are stored as strings.
- Monetary and quantity fields use Prisma `Decimal` where precision matters.
- Master data that has been used should be set `active = false`, not deleted.

## 3. Identity and Tenancy Tables

### `User`

- **Purpose:** authenticated user identity and role/scope assignment.
- **Important fields:** `username` (unique), `passwordHash`, `fullName`, `department`, `role`, optional `organizationId`, `plantId`, primary `categoryId`, `active`, `lastSeenAt`.
- **Relationships:** Organization, Plant/Site, primary Category, multiple `UserCategory` rows, Signature, ProfilePhoto, claimed/reviewed CM work, permissions, notifications, audit, and Store transactions.
- **Rules:** Owner Admin should not be tied to one organization; organization/site roles must have valid scope. `lastSeenAt` supports online/offline status.
- **RLS:** enabled in Supabase; Prisma server-role policy grants all operations. Application scope is mandatory.

### `Organization`

- **Purpose:** top-level customer/company tenant.
- **Important fields:** unique `slug`, `name`, `active`.
- **Relationships:** Sites, users, Categories, CM work, LINE, profiles, feedback, audit, and all Store data.
- **Rules:** defaults exist for local/bootstrap compatibility (`primary`, `Power Care.CM`).
- **RLS:** enabled; Prisma server access policy.

### `Plant`

- **Purpose:** operational Site within an Organization.
- **Important fields:** `organizationId`, `code`, unique optional `inventoryCode`, `name`, public Store flags, `maxUsers`, `maxWorkRequests`, `active`.
- **Relationships:** users, CM master/work, profile, settings, LINE, permissions, and Store data.
- **Constraints:** unique `(organizationId, code)` and `(organizationId, name)`; inventory code is globally unique.
- **RLS:** enabled; Prisma server access policy.

### `SiteAdminPermission`

- **Purpose:** optional per-Site grants for a Site Admin.
- **Important fields:** `userId`, `plantId`, `permissionKey`, `enabled`, `grantedById`.
- **Constraints:** unique `(userId, plantId, permissionKey)`.
- **Relationships:** target user, Site, granting user.
- **RLS:** production migration enables/grants server access; confirm policy in deployed database.

### `Signature`

- **Purpose:** metadata for a user's stored signature used in closure documents.
- **Important fields:** unique `userId`, file name/type/size, `storagePath`, `uploadedAt`.
- **Relationships:** one-to-one User.
- **RLS:** enabled; Prisma server access policy. Bytes are in file storage, not the DB.

### `ProfilePhoto`

- **Purpose:** profile-photo metadata.
- **Important fields:** unique `userId`, file metadata, `storagePath`, `checksum`.
- **Relationships:** one-to-one User.
- **RLS:** enabled; Prisma server access policy.

## 4. CM and Operational Master Tables

### `Category`

- **Purpose:** Site-scoped CM work category, for example Electrical, Mechanical, or Instrument.
- **Important fields:** `name`, optional legacy `organizationId`, `plantId`, `active`.
- **Relationships:** users, `UserCategory`, CM work, LINE destinations.
- **Constraints:** unique `(plantId, name)`.
- **RLS:** enabled; Prisma server access policy.

### `UserCategory`

- **Purpose:** many-to-many category eligibility for Engineer/Technician users.
- **Important fields:** `userId`, `categoryId`.
- **Constraints:** unique `(userId, categoryId)`.
- **RLS:** deployment policy must be verified; newer scoped table added after initial core RLS rollout.

### `Zone`

- **Purpose:** Site-scoped CM physical/functional zone.
- **Important fields:** `name`, `plantId`, `active`.
- **Relationships:** CM work and spare-part applicable zones.
- **Constraints:** unique `(plantId, name)`.
- **RLS:** enabled; Prisma server access policy.

### `CmWork`

- **Purpose:** Corrective Maintenance work order.
- **Important fields:** unique `number`; requester, organization/site, category, zone, machine/problem, urgency, status; claimant/reviewer; root cause, corrective action, notes/reasons; lifecycle timestamps.
- **Relationships:** Category, Zone, claimant User, reviewer User, history, audit, and linked spare-part issues.
- **Rules:** transitions must go through the CM state machine. Closed and canceled are terminal.
- **RLS:** enabled; Prisma server access policy. Every query/action must also enforce scope.

### `CmNumberSequence`

- **Purpose:** monthly CM running number allocator.
- **Important fields:** `yearMonth` primary key, `lastNumber`.
- **RLS:** enabled; Prisma server access policy.
- **Risk:** current key is not explicitly Site-scoped; confirm number-generation implementation before changing multi-site numbering.

### `StatusHistory`

- **Purpose:** immutable CM status transition history.
- **Important fields:** `cmWorkId`, `fromStatus`, `toStatus`, `changedById`, `changedAt`, `note`.
- **Relationships:** CM work; `changedById` is currently an ID value rather than a declared Prisma User relation.
- **RLS:** enabled; Prisma server access policy.

### `AuditEvent`

- **Purpose:** administrative and significant domain audit event.
- **Important fields:** optional CM/actor/organization/site, `entityType`, `entityId`, `action`, before/after JSON text, reason, timestamp.
- **Relationships:** CM, User, Organization, Site.
- **Indexes:** organization/site/action by time.
- **RLS:** enabled; Prisma server access policy.

### `SlaSetting`

- **Purpose:** Site SLA durations.
- **Important fields:** unique optional `plantId`, `claimDays`, `executionDays`, `reviewDays`.
- **Relationships:** optional one-to-one Site.
- **RLS:** enabled; Prisma server access policy.

### `SystemSetting`

- **Purpose:** Site feature settings.
- **Important fields:** `id`, unique optional `plantId`, `engineerWorkAssignmentEnabled`.
- **RLS:** enabled; Prisma server access policy.

## 5. Communication, Branding, and Feedback Tables

### `Announcement`

- **Purpose:** scheduled public announcement with optional image.
- **Important fields:** title/content, organization, image metadata/path, publish window, pinned, active, author.
- **RLS:** enabled; Prisma server access policy. Public image route only serves active/in-window records.

### `UserNotification`

- **Purpose:** in-app recipient-specific notification.
- **Important fields:** recipient, event/entity/target status, title/message, optional `href`, `createdAt`, `readAt`.
- **Indexes:** optimized for unread recipient and entity lookups.
- **RLS:** enabled; Prisma server access policy. Read actions also enforce recipient and operational scope.

### `LineDestination`

- **Purpose:** configured LINE target/group.
- **Important fields:** unique `targetId`, display name, organization/site/category scope, active.
- **Relationships:** event settings, deliveries, discovery, daily reports.
- **RLS:** enabled; Prisma server access policy.

### `LineEventSetting`

- **Purpose:** enabled/disabled LINE events per destination.
- **Important fields:** `destinationId`, `eventType`, `enabled`.
- **Constraints:** unique `(destinationId, eventType)`.
- **RLS:** enabled; Prisma server access policy.

### `LineDeliveryLog`

- **Purpose:** idempotency, retry, status, and diagnostics for LINE delivery.
- **Important fields:** `eventId`, destination, event type, payload JSON, status, attempts, error, sent timestamp.
- **Constraints:** unique `(eventId, destinationId)`.
- **RLS:** enabled; Prisma server access policy.

### `LineGroupDiscovery`

- **Purpose:** remember LINE groups seen by the webhook before Admin activates them.
- **Important fields:** unique `groupId`, organization, display name, first/last seen, linked destination.
- **RLS:** enabled; Prisma server access policy.

### `LineDailyReportSetting`

- **Purpose:** organization/site daily LINE report schedule and template.
- **Important fields:** organization/site, enabled, destination, `sendTime`, `dateMode`, `templateJson`.
- **RLS:** enabled; Prisma server access policy.

### `OrganizationProfile`

- **Purpose:** organization display/company name and logo metadata.
- **Important fields:** unique optional `organizationId`, company name, logo metadata/path.
- **RLS:** enabled; Prisma server access policy.

### `PlantProfile`

- **Purpose:** Site-specific company/site details and logo.
- **Important fields:** unique `plantId`, company name, address, contact name/phone, notes, logo metadata/path.
- **RLS:** production migration enables server access; verify deployed policy.

### `PublicFeedback`

- **Purpose:** public comments/suggestions linked to organization/site.
- **Important fields:** name, optional department, organization/site, message, source path, timestamp.
- **RLS:** verify production policy; public creation is performed through a Server Action rather than browser Supabase access.

## 6. Store and Spare-Part Tables

### `StoreCategory`

- **Purpose:** groups Stores/warehouses within a Site.
- **Important fields:** organization/site, name, description, active.
- **Constraints:** unique `(plantId, name)`.
- **RLS:** enabled by Store migration; Prisma server policy.

### `Store`

- **Purpose:** physical/logical spare-part warehouse.
- **Important fields:** organization/site, optional StoreCategory, `code`, name, location, active.
- **Constraints:** unique Site code and Site name.
- **Relationships:** stock, movements, receive/issue items, default Store for parts.
- **RLS:** enabled; Prisma server policy.

### `SparePartCategory`

- **Purpose:** Site-scoped spare-part category such as EI or ME.
- **Important fields:** organization/site, optional `code`, name, description, active.
- **Constraints:** unique Site name and Site code.
- **RLS:** enabled; Prisma server policy.

### `SparePartType`

- **Purpose:** expense/spare-part type such as `630101` Consumable.
- **Important fields:** organization/site, `code`, name, active.
- **Constraints:** unique Site code and name.
- **RLS:** added after initial Store migration; confirm latest production policy.

### `SparePartStorageZone`

- **Purpose:** coded storage zone such as `01` or `02`.
- **Important fields:** organization/site, text `code`, name, description, active.
- **Constraints:** unique Site code and name. Code is text to preserve leading zero.
- **RLS:** added after initial Store migration; confirm latest production policy.

### `SparePart`

- **Purpose:** spare-part master.
- **Important fields:** organization/site, category/type/default Store/storage zone, generated `code`, optional accounting `itemCode`, name, description, unit, latest unit price, min/max/reorder stock, active.
- **Constraints:** generated code unique per Site; Item Code unique per Organization.
- **Relationships:** applicable CM Zones, stocks, movements, receipt/issue items, per-item issue sequence.
- **RLS:** enabled; Prisma server policy.

### `SparePartApplicableZone`

- **Purpose:** many-to-many link between a spare part and CM Zones where it applies.
- **Constraints:** unique `(sparePartId, zoneId)`.
- **RLS:** enabled by Store migration; verify current policy after later schema changes.

### `SparePartSequence`

- **Purpose:** Site-specific spare-part code sequence.
- **Important fields:** Site ID as primary key, `lastNumber`.
- **Output:** `SP-{SITE_CODE}-{00001}`.
- **RLS:** enabled; Prisma server policy.

### `StoreIssueSequence`

- **Purpose:** monthly Site issue-header number sequence.
- **Important fields:** Site, year, month, last number.
- **Constraints:** unique `(plantId, year, month)`.
- **Output:** `SI-{SITE_CODE}-{YYYY}-{MM}-{0001}`.
- **RLS:** enabled; Prisma server policy.

### `SparePartIssueItemSequence`

- **Purpose:** five-digit per-spare-part request occurrence sequence.
- **Important fields:** spare-part ID primary key, last number.
- **Output suffix:** `00001`, `00002`, and so on.
- **RLS:** introduced in 14 July migration; production policy must be verified.

### `StoreStock`

- **Purpose:** current quantity for one spare part in one Store.
- **Important fields:** organization/site/store/part, Decimal `quantity`.
- **Constraints:** unique `(storeId, sparePartId)`.
- **RLS:** enabled; Prisma server policy.

### `StockMovement`

- **Purpose:** append-oriented stock ledger.
- **Important fields:** scope, Store, part, actor, movement type, reference type/ID, quantity change, balance after, unit price, note, occurred time.
- **Rules:** every receive/issue/adjustment should produce a movement in the same transaction.
- **RLS:** enabled; Prisma server policy.

### `SparePartReceive`

- **Purpose:** receipt header.
- **Important fields:** unique number, scope, receiving user, supplier/reference/note, status, received time.
- **Relationships:** receipt items.
- **RLS:** enabled; Prisma server policy.

### `SparePartReceiveItem`

- **Purpose:** one received spare-part line.
- **Important fields:** receipt, Store, part, quantity, optional unit price/note.
- **RLS:** enabled; Prisma server policy.

### `SparePartIssue`

- **Purpose:** issue-request header for direct, CM-linked, or public requests.
- **Important fields:** unique number, scope, optional CM, issue type/status, requester/contact/user, engineer, Store Officer, notes/rejection, approval/issue/reject timestamps.
- **Relationships:** issue items and optional CM work.
- **RLS:** enabled; Prisma server policy.

### `SparePartIssueItem`

- **Purpose:** requested/approved/issued quantity for one spare part.
- **Important fields:** unique optional generated `lineNumber`, issue, optional Store, part, requested/approved/issued quantities, unit price, status, note.
- **Line format:** `SITE-STORE-TYPE-CATEGORY-ZONE-ITEM-00001`; leading `GL` is removed from type code.
- **RLS:** enabled; latest line-number migration/policy must be verified in production.

## 7. Important Relationship Rules

1. A Site belongs to one Organization.
2. A Site-scoped user must not reference a Site outside its Organization.
3. Category, Zone, Store, Store masters, and inventory transactions must remain in one Site.
4. `SparePart.itemCode` must not duplicate within an Organization.
5. CM-linked Store issues must reference a CM in the same Site.
6. Store issue items must reference Stores/parts in the issue's Site.
7. Stock quantities and movement records must update atomically.
8. Master records referenced by parts or transactions should be deactivated rather than deleted.

## 8. RLS Considerations

Supabase SQL enables RLS on core and Store tables and creates `FOR ALL TO prisma USING (true) WITH CHECK (true)` policies. This is a server-gateway design:

- Supabase anonymous/public clients should not query tables directly.
- Vercel/Prisma has broad table access.
- Application code must always apply organization/site scope.
- `service_role` or similarly privileged credentials must never reach the browser.
- New tables need explicit RLS enablement, grants, and policies; do not assume they inherit protection.
- Review `UserCategory`, `PlantProfile`, `PublicFeedback`, `SparePartType`, `SparePartStorageZone`, and `SparePartIssueItemSequence` in the actual deployed database after migration.

Long-term option: use tenant-aware PostgreSQL policies based on trusted request claims. This would be a major architecture change and should be captured in an ADR first.

## 9. Migration Order and Release Rules

- Apply migrations chronologically.
- Back up before applying production SQL.
- Run backfills after structural migrations.
- Validate both Prisma schemas.
- Generate the production Prisma client before building.
- Check constraints against existing data before making optional codes required.
- Never edit a migration already applied to production; add a new corrective migration.

## 10. Future Planned Tables

These do not yet exist as complete production models:

### Asset and PM

- `Asset`, `Equipment`, `AssetLocation`, `AssetCategory`.
- `PreventiveMaintenancePlan`, `PmTask`, `PmSchedule`, `PmWorkOrder`.
- `Meter`, `MeterReading`, `MeterThreshold`.

### Purchase

- `Supplier`, `PurchaseRequest`, `PurchaseRequestItem`.
- `PurchaseApproval`, `PurchaseOrder`, `PurchaseOrderItem`.
- `GoodsReceipt` or linkage from PO to existing SparePart Receive.

### Inventory Hardening

- `StockCount`, `StockCountLine`, `StockReservation`, `StockTransfer`.
- Optional immutable sequence/allocation table for stronger high-concurrency numbering.

### Security and Integration

- `Session` for opaque expiring/revocable sessions.
- `ApiClient`, `ApiKey`, `WebhookSubscription`, `WebhookDelivery`.
- Optional `OutboxEvent` for reliable asynchronous notifications.

No future table should be added before defining Organization/Site ownership, RLS policy, audit needs, retention, and deletion behavior.
