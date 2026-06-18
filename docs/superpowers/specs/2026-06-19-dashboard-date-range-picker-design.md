# Dashboard Date Range Picker Design

## Goal

Replace the separate day, range, month, and year inputs with one responsive date range picker on the public and authenticated dashboards. The selected range continues to drive the existing Bangkok-time-aware dashboard query.

## Selected Approach

Build a focused in-project React component using the existing `date-fns` dependency. This gives PowerCare.CM the approved visual treatment without introducing another UI library or changing the server-side filter contract.

Alternatives considered:

- Native date inputs: smallest implementation, but they cannot provide the approved two-month calendar or preset panel.
- Third-party range picker: faster initially, but adds styling, bundle, accessibility, and maintenance overhead for behavior the project can express with its existing date utilities.

## User Experience

- A single trigger displays the active Thai-formatted date range.
- Opening it shows presets for the last 7, 14, and 30 days; last 3 and 12 months; month to date; quarter to date; year to date; all time; and custom range.
- Desktop shows two adjacent calendar months.
- Mobile shows one calendar month and converts presets into a horizontally scrollable row.
- Custom selection uses the first click as the start date and the second click as the end date. Selecting an earlier second date restarts the range from that date.
- The selected range is highlighted, with distinct start and end dates.
- `Apply` updates the current dashboard URL and data. `Cancel` closes the picker without changing the applied filter.
- Existing `Include closed / cancelled` behavior remains available beside the picker.

## Components

- `CmDateRangePicker`: owns open state, visible calendar months, draft dates, presets, and responsive calendar presentation.
- `CmDateFilterBar`: renders the range picker and terminal-status checkbox, then submits the existing query-string fields.
- `cm-date-filter-presets`: pure helper functions that calculate preset ranges in the Bangkok calendar.
- Existing `parseCmDateFilter`: remains the server-side source of truth for inclusive start and end dates.

## Data Flow

The picker emits `startDate` and `endDate` as `YYYY-MM-DD`. The filter form submits `mode=range`, except `All time`, which submits `mode=all`. Dashboard and public pages continue to parse these values through `parseCmDateFilter`, so database filtering and current-status behavior do not change.

## Date Rules

- Calendar calculations and defaults use `Asia/Bangkok`.
- Displayed years use the Buddhist Era, while submitted values remain Gregorian ISO dates.
- End dates are inclusive in the UI and converted to the existing exclusive upper boundary on the server.
- Presets include the current Bangkok date.

## Error Handling

- `Apply` stays disabled until a complete valid range exists.
- An end date before the start date restarts selection instead of producing an invalid range.
- Invalid URL values fall back to the current Bangkok month through the existing parser behavior.
- The popover closes on Escape, outside click, Cancel, or successful Apply.

## Accessibility

- Trigger, calendar navigation, dates, presets, Cancel, and Apply are keyboard reachable.
- The dialog exposes an accessible name and uses button semantics for dates.
- Selected dates use `aria-pressed`; today and unavailable states are announced without relying on color alone.
- Focus returns to the trigger after the picker closes.

## Testing

- Unit tests cover every preset around month and year boundaries in Bangkok time.
- Component tests cover opening, preset selection, custom range selection, cancel, apply, and keyboard closing.
- Existing date-filter and dashboard-query tests remain green.
- Responsive browser verification covers public and authenticated dashboards at desktop and mobile widths.

## Out Of Scope

- Changing the meaning of status-at-date filtering.
- Adding time-of-day selection.
- Changing production data or deploying this development work.
