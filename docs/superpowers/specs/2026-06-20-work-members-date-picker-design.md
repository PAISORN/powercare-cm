# All Work And Members Date Picker Design

## Goal

Use the same single-month date-range picker from the Dashboard on All Work, and make the existing Members picker visible for Admin and Engineer users.

## All Work

- Replace the native month input with the shared `CmDateFilterBar` and `CmDateRangePicker` experience.
- Preserve Search, Status, Category, Zone, Urgency, and Claimant filters.
- Use the shared query parameters `mode`, `startDate`, and `endDate`.
- Preserve the selected date range when changing status cards or pagination pages.
- Clear filters returns to `/work`.
- Work records are filtered by `createdAt` inside the selected Bangkok calendar-day range. Changing historical status semantics is outside this UI-focused change.

## Members

- Continue showing date controls only to Admin and Engineer roles.
- Keep Technician access limited to the member directory without workload metrics or date controls.
- Remove the clipping behavior caused by the parent section's `overflow-hidden`.
- Preserve the rounded hero appearance by applying top corner rounding directly to the hero header.
- Keep member workload calculations and query parameters unchanged.

## Responsive Behavior

- Reuse the existing single-month responsive picker.
- Keep filter buttons reachable below the picker on narrow screens.
- Allow the calendar popup to extend outside the filter container without being clipped.
- Preserve all existing mobile and desktop filter layouts where possible.

## Verification

- Add tests proving All Work renders the shared date filter and carries date query parameters through filter links.
- Add a source/layout regression test proving Members no longer clips the calendar popup.
- Run the full test suite, TypeScript validation, production build, and whitespace checks.
