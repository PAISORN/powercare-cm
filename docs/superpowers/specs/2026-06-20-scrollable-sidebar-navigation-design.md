# Scrollable Sidebar Navigation Design

## Goal

Keep the growing application navigation usable at every viewport height without moving the brand or signed-in user summary out of view.

## Desktop Sidebar

- Keep the PowerCare.CM brand and user summary fixed at the top of the sidebar.
- Let the navigation occupy the remaining sidebar height.
- Apply vertical scrolling only to the navigation region when its content exceeds the available height.
- Preserve the existing sidebar width, link styling, active states, and role-based links.
- Keep Logout in the normal navigation sequence.

## Mobile Drawer

- Keep the drawer header, close button, and user summary fixed at the top.
- Let the navigation fill the remaining drawer height and scroll vertically.
- Preserve body scroll locking while the drawer is open.
- Preserve closing behavior after selecting a navigation item.

## Layout Approach

Use a full-height flex column for each sidebar container. The fixed header content remains non-shrinking. The navigation receives `min-height: 0`, flexible growth, and `overflow-y: auto`, ensuring scrolling works correctly inside nested flex layouts.

## Accessibility And Responsive Behavior

- Mouse wheel, keyboard scrolling, and touch scrolling must work naturally.
- Navigation links must remain reachable at short desktop heights and narrow mobile heights.
- No horizontal scrolling is introduced.
- Existing focus, active, and notification states remain unchanged.

## Verification

- Add source-level layout tests for the desktop sidebar and mobile drawer scroll regions.
- Run the complete test suite and TypeScript validation.
- Verify the sidebar remains usable with the Admin role, which has the longest menu.
