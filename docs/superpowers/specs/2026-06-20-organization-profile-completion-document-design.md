# Organization Profile And Completion Document Design

## Goal

Allow Admins to maintain the company name and logo once, then reuse that organization identity in the printable CM completion document and future documents.

## Scope

- Add an Admin-only `Organization` navigation item and `/admin/organization` page.
- Store one organization profile containing the company name and optional logo metadata.
- Accept PNG, JPG, or WebP logos up to 2 MB.
- Replace the previous logo when a new logo is uploaded and remove the obsolete stored file after the database update succeeds.
- Render the organization name and logo in the CM completion document.
- Redesign the complete printable document to follow the approved visual reference.
- Keep the existing CM data, signature sources, permissions, and print eligibility rules unchanged.

## Data Model

Create a singleton `OrganizationProfile` record with the stable ID `primary`:

- `id`
- `companyName`
- `logoFileName`
- `logoMimeType`
- `logoFileSize`
- `logoStoragePath`
- `createdAt`
- `updatedAt`

The dedicated model keeps organization identity separate from operational `SystemSetting` flags and allows address, tax ID, or other document fields to be added later without mixing concerns.

## Admin Page

The `/admin/organization` page contains:

- Current organization preview.
- Company-name input.
- Logo file input with PNG/JPG/WebP and 2 MB guidance.
- Save command.
- Success and error states.

Only Admin may view or update this page. Every update records an Audit Event without embedding image bytes. If a new upload fails, the existing organization record and logo remain unchanged.

## File Storage

Use the existing Local/Supabase storage abstraction. Store organization logos under a stable organization path. A replacement upload becomes the active logo only after validation and a successful database update; an obsolete path is deleted afterward when it differs from the new path.

Serve the logo through an authenticated `/organization-logo` route. The print document references this route with the organization `updatedAt` timestamp as a cache version.

## Completion Document

The printable page remains A4 portrait and uses a restrained dark-green document palette.

### Header

- Company logo on the left in a fixed, object-contain area so it never stretches.
- Company name and document title on the right.
- Title: `ใบสรุปปิดงาน Corrective Maintenance`.
- Subtitle: `Power Plant CM Control Center`.
- If no profile exists, display `PowerCare.CM` and omit the logo.

### Sections

1. `ข้อมูลงานซ่อม`: CM number, status, created date, claimed date, and closed date in a responsive two-column information grid.
2. `รายละเอียดงานซ่อม`: requester, department, category, zone, machine, problem title, and problem detail.
3. `การดำเนินการแก้ไข`: root cause, corrective action, and engineer note.
4. Signature area: technician and reviewer signatures in two equal columns with names and roles.

Use green section headings, subtle borders, readable spacing, and print-safe colors. On narrow preview screens, information rows and signatures may stack; print layout returns to the fixed A4 composition. Long values wrap and must not overlap adjacent content.

## Permissions And Audit

- Admin alone can access and update organization information.
- All authenticated roles that can already print a closed CM document continue to do so.
- Save actions record `UPDATE_ORGANIZATION_PROFILE` with the previous/new company name and whether a logo exists.

## Verification

- Unit tests cover organization input validation and Admin-only permission.
- Storage tests cover logo type, size, and stable replacement behavior.
- Route tests cover authenticated logo access and missing-logo behavior.
- Document tests verify organization fallback, logo placement before title content, all three information sections, and both signature roles.
- Full tests, TypeScript validation, and production build must pass.
- Visual checks cover desktop preview, narrow preview, and print/A4 output without overlap.
