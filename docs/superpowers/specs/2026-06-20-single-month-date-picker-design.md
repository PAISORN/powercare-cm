# Single-Month Date Picker Design

## Goal

Make the shared date filter compact by showing one calendar month at a time, while preserving inclusive ranges across different months. Remove the terminal-work checkbox from the shared filter UI.

## Interaction

- The closed trigger remains one field showing the applied start and end dates.
- Opening it shows one calendar, previous/next month controls, start/end readouts, Cancel, and Apply.
- The quick-preset sidebar is removed.
- First date click sets the range start. Month navigation keeps that draft start. The next date click sets the end, including dates several months later.
- The checkbox labelled `รวมงานปิดแล้ว / ยกเลิก` is not rendered.

## Responsive Layout

The dialog is capped at 420px and stays within the viewport. The dashboard filter row becomes category, date range, Apply, and Clear without an empty grid track.

## Verification

Component tests cover a January 1 to March 27 range, one rendered month heading, absence of preset buttons, absence of the terminal-work checkbox, and the existing draft/apply behavior.
