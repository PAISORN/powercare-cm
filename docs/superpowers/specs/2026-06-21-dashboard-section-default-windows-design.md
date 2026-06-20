# Dashboard Section Default Windows Design

## Goal

Make the authenticated Dashboard and Public dashboard use useful section-specific default time windows while preserving one consistent result when users choose a custom date range.

## Default Windows

When no explicit date filter is present:

- Status Overview and the KPI cards use the current Bangkok calendar year, from January 1 through the current time.
- Plant Zone Workload uses the same current-year window.
- Monthly CM Trend uses the latest six calendar months, including the current month.
- Priority Work Queue is not restricted by the default year or trend window. It uses current open work and returns at most five items.

## Explicit Date Filter

When the URL contains an explicit date selection, including a day, range, month, year, or all-time mode:

- The selected filter replaces every section-specific default.
- Status Overview, KPI cards, Plant Zone Workload, Monthly CM Trend, and Priority Work Queue all use the selected range.
- The Work Category filter continues to apply to every section.

## Priority Work Queue

- Preserve the existing eligibility rule: Critical, Urgent, Waiting Close, and Returned for Correction work are candidates.
- Exclude Closed and Canceled work.
- Rank Critical before Urgent, followed by other eligible status-priority work.
- Within the same priority tier, older work appears first.
- Return no more than five items from the query layer so both pages render the same list without additional slicing rules.

## Shared Query Architecture

- Implement the default-window selection in `modules/dashboard/dashboard-query.ts`.
- Return one composed dashboard view model containing current-year summary data, six-month trend data, and five priority items.
- Reuse the same query entry point from `app/dashboard/page.tsx` and `app/page.tsx`.
- Avoid duplicating date-window calculations or priority ordering in page components.

## Bangkok Time Rules

- Current-year boundaries use Bangkok calendar dates, not server UTC dates.
- The six-month trend starts at the first Bangkok calendar day of the oldest included month and ends after the current month.
- Existing Bangkok-aware custom date parsing remains the source of truth for explicit filters.

## Verification

- Test current-year and six-month default boundaries with a fixed current date.
- Test that explicit date filters override every default window.
- Test Priority Work Queue eligibility, ordering, and the five-item limit.
- Test that Dashboard and Public use the shared query entry point.
- Run the complete test suite, TypeScript validation, production build, and whitespace checks.
