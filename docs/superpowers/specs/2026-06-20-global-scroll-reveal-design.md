# Global Scroll Reveal Design

## Goal

Apply the dashboard's soft entrance and scroll-reveal behavior consistently to every application page without hiding long content or disrupting responsive layouts.

## Interaction Design

- Keep the sidebar and header stable and immediately visible.
- Reveal the first main content sections with a short upward slide and fade when a page opens.
- Reveal lower cards, forms, and content sections when their leading edge enters the viewport.
- Use a short 300 ms ease-out transition with small staggered delays between nearby sections.
- Preserve the current layout dimensions while elements are hidden so content does not jump.
- Show all content immediately when the user enables reduced motion.

## Technical Design

- Continue using the shared `RevealOnScroll` client controller from the root layout.
- Expand section discovery so nested page sections and explicitly marked cards are covered consistently.
- Use a low intersection threshold suitable for very tall sections such as Work Results.
- Mark elements as revealed once and stop observing them so scrolling back does not replay the animation.
- Avoid animating navigation shells, fixed controls, dialogs, and overlays.
- Keep the CSS transform distance small on desktop and reduce it further on narrow screens.

## Responsive Behavior

- The animation must not change widths, heights, grid tracks, or overflow behavior.
- Mobile layouts use the same fade but a shorter vertical movement.
- Tall list containers reveal as soon as their leading portion enters the viewport.
- Existing horizontal scroll areas remain usable and are not animated individually.

## Verification

- Component tests cover initial hidden state, intersection reveal, tall-section threshold, nested sections, and reduced-motion behavior.
- TypeScript validation and the full test suite must pass.
- Check representative public, dashboard, work-list, profile, report, and form pages at desktop and mobile widths.
