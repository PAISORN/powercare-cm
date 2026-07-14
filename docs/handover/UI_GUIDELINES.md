# UI Guidelines

## 1. Design Language

PowerCare.CM is an operational industrial SaaS interface. It should feel clear, compact, dependable, and suitable for repeated work on desktop and mobile.

Principles:

- Prioritize scanning, comparison, and action over decorative composition.
- Keep the current PowerCare.CM identity and day/night themes.
- Use restrained surfaces, clear hierarchy, and consistent 8px spacing.
- Avoid marketing-style hero composition inside authenticated tools.
- Avoid nested cards, ornamental blobs, and visual effects that reduce legibility.
- Use real application data and state labels; do not add explanatory marketing copy inside tools.

## 2. Theme Tokens

The authoritative tokens live in `app/globals.css`.

### Day theme

| Token | Typical value | Use |
|---|---|---|
| Background | `#f5f8fc` | Page canvas |
| Surface | `#ffffff` | Panels and tools |
| Ink | `#102033` | Primary text |
| Muted | `#5b6f86` | Secondary text |
| Line | `#d8e4f2` | Borders and separators |
| Primary | `#1463ff` | Primary actions and selection |
| Primary strong | `#0b4fe8` | Hover/active |
| Soft | `#eef5ff` | Inputs and selected soft states |
| Accent | `#12b6cb` | CM/interactive accent |
| Warning | `#f59e0b` | Due/attention |
| Danger | `#ef4444` | Destructive/error |

### Night theme

| Token | Typical value | Use |
|---|---|---|
| Background | `#07111d` | Page canvas |
| Surface | `#0c1d2d` | Panels |
| Ink | `#f8fbff` | Primary text |
| Muted | `#9db7ca` | Secondary text |
| Line | `#1f3f58` | Borders |
| Primary | `#26d1c2` | Primary action/accent |
| Primary strong | `#0f9f95` | Hover/active |
| Soft | `#102c42` | Inputs and soft panels |
| Accent | `#60a5fa` | Secondary accent |

Never hard-code a day-only background where a theme token exists.

## 3. Typography

- Font stack: Segoe UI, Noto Sans Thai, Arial, sans-serif.
- Maintain zero letter spacing; do not use negative tracking.
- Page titles: strong, compact, responsive without viewport-width font scaling.
- Panel titles: smaller than page titles; do not use hero-sized text inside cards.
- Body text: readable Thai and English at normal browser zoom.
- Numeric KPIs: tabular-looking alignment where useful; labels remain visible.
- Prevent mojibake: source files must be UTF-8 and Thai strings must be reviewed in browser.

## 4. Layout and Spacing

- Base spacing grid: 8px.
- Main content uses a constrained but wide operational layout.
- Desktop sidebar can collapse to icons; main content must expand without horizontal page overflow.
- The authenticated top bar is sticky.
- Mobile top bar keeps menu, Home/brand, notifications, and compact theme control aligned.
- Use CSS grid with explicit min/max tracks for dashboards and forms.
- Avoid empty dead space created by fixed heights.
- Components with fixed formats (charts, boards, icon controls) need stable responsive dimensions.

## 5. Component Rules

- Use Lucide icons; do not draw custom SVG controls when a matching icon exists.
- Icon-only buttons require a tooltip/accessible label.
- Use segmented controls or icon toggles for view modes.
- Use checkboxes/toggles for binary settings.
- Use select/dropdown for finite option sets and auto-submit where established.
- Use command buttons only for clear actions.
- Current code uses medium/large rounded panels; keep radius consistent within each page and avoid increasing it casually.
- Do not place a visual card inside another decorative card unless the inner item is a repeated record/tool.

## 6. Navigation

- Main menu labels are bold and include a Lucide icon.
- Submenus are indented, use a small bullet, and do not repeat icons.
- Parent groups expand/collapse with a chevron.
- My Activities is a primary menu directly below Dashboard.
- Navigation is permission-aware but server authorization remains mandatory.
- Mobile uses a drawer; it must not cover or collide with the hero/header after opening/closing.

## 7. Tables

- Use tables for dense operational data, not decorative cards.
- Header must have an opaque theme-aware background.
- Align headers and cells using the same grid/table definition.
- Use subtle row separators.
- Keep actions in a stable final column.
- Small screens may scroll horizontally; do not squeeze text into unreadable columns.
- Limit a page to 50 rows where implemented and show page count/navigation.
- Stock and Spare Parts use **Header Replacement** behavior: when the table header reaches the top bar, the top bar hides and a synchronized replacement header becomes fixed; restore the top bar when scrolling back.
- Replacement header columns must use the same width model as the source header.
- Quantity displays include unit on the second line; Max/Min share one column.
- Issue/Receive action buttons use stable equal dimensions and aligned arrows.

## 8. Forms

- Labels remain above controls.
- Long controls that need full width should occupy a complete row rather than overflow a two-column grid.
- Use shared `AutoSubmitSelect` for filters intended to apply immediately.
- Provide an explicit clear/all option.
- Preserve Site scope in hidden/URL state, but validate it again on the server.
- Required fields need both browser and server validation.
- Keep file size/type help close to upload controls.
- Destructive actions require a confirmation dialog; high-risk deletion may require Owner Admin password confirmation where already designed.

## 9. Drawers and Modals

- Use a right-side drawer for contextual create/edit/action flows when the user should remain on the list/map/activity page.
- Drawer must trap focus, have a clear close control, and fit mobile width.
- Do not open a drawer until a record/action is selected.
- Put primary action at the bottom/right and destructive action visually separated.
- Modals are for short decisions/confirmation, not long forms.
- Success/failure feedback should use clear icon, title, and action result.

## 10. Dashboard

- KPI strip appears before analytical charts.
- Monthly CM Trend spans full width on desktop and shows latest 12 months; responsive view reduces to latest 3 months.
- Chart hover shows values without shifting layout.
- Status Overview and yesterday/category summary form the next row.
- Zone Workload and Priority Work Queue form the following row.
- Dashboard filters apply consistently to the sections intended by product rules.
- Public dashboard mirrors the useful visual summary but does not expose authenticated actions/details.

## 11. Status and Color

- Colors must be semantic and accompanied by text/icon; never rely on color alone.
- CM statuses use the centralized status badge component.
- Store stock: sufficient green, low warning/orange, out-of-stock red.
- Store actions: Issue red-tinted, Receive blue/green according to the current final design token; keep contrast compliant in both themes.
- Unread badge is a small red circle showing unread count and disappears after read.
- Role/hierarchy colors remain consistent by level: Owner unique, Organization consistent, Site consistent, Member neutral/category accents.

## 12. Responsive Behavior

### Desktop

- Full sidebar or icon-only collapsed sidebar.
- Dense tables and multi-column dashboards.
- Drawers open from right without hiding the full context.

### Tablet

- Fewer grid columns; charts/tables remain readable.
- Organization chart uses a scrollable canvas when needed.

### Mobile

- Sidebar becomes a drawer.
- Organization chart becomes a vertical tree.
- Cards and forms become one column.
- Charts reduce visible month count rather than adding unusable horizontal page scroll.
- Tables may use controlled horizontal scrolling while preserving sticky header alignment.
- Buttons must not overlap, truncate critical labels, or exceed viewport.

Test at least 1440px, 1024px, 768px, 430px, and 360px widths.

## 13. Motion

- Normal transition: approximately 200-360ms.
- Theme transition: approximately 520ms.
- Page/section reveal should be visible but not slow work.
- Use hover lift sparingly on interactive repeated records.
- Charts may animate on entry.
- Respect `prefers-reduced-motion` and remove nonessential animation.

## 14. Accessibility

- Keep keyboard focus visible.
- Use semantic buttons/links/forms/table headers.
- Provide labels for icon buttons and form controls.
- Maintain readable contrast in both themes.
- Do not block browser zoom.
- Announce validation/success/error state where practical.
- Keep touch targets suitable for mobile Store operations.

## 15. UI Verification Checklist

1. Day and night screenshots.
2. Desktop and mobile screenshots.
3. No horizontal page overflow unless inside an intentional table/canvas scroller.
4. No text clipping or overlap.
5. Sticky top/table behavior works in both directions.
6. Drawer opens/closes and focus remains usable.
7. Long Thai/English labels fit.
8. Empty/loading/error/disabled states exist.
9. Permission-hidden controls also fail safely server-side.
