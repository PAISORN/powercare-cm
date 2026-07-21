# PowerCare Public Landing Page

## Purpose

Replace the public operational dashboard at `/` with a product Landing Page for prospective organizations. Existing authenticated Dashboard, CM, Store, authentication, permissions, Organization, Site, and Site Public Portal behavior remains intact except for the explicitly approved platform announcement and feedback changes below.

## Routing

- Unauthenticated `/` renders the Public Landing Page.
- Authenticated `/` redirects to `/dashboard`.
- `/login` remains the single authenticated product entry.
- Site-specific public request, tracking, and store-issue links remain available only through each Site URL or QR code.
- The Landing Page never provides a generic operational request form or Site selector.

## Product Modules

- The page is permanently structured for CM, Store, PM, and Asset.
- CM and Store initially display `Available`.
- PM and Asset initially display `Coming Soon`.
- Availability and operational links must be switchable without redesigning the page.
- CM and Store use sanitized previews derived from the real interface.
- PM and Asset use clearly conceptual previews until the modules are operational.
- Module calls to action reveal details within the Landing Page; Login is the only product entry.

## Content Order

1. Sticky Navbar
2. Full-width Hero and PowerCare orbit scene
3. Four-module overview
4. CM, Store, PM, and Asset detail sections
5. Why PowerCare and How It Works
6. Platform Capabilities: multi-Organization, multi-Site, and analytics
7. Customer Benefits
8. FAQ
9. Platform Announcements
10. Platform Feedback
11. Soon CTA
12. Footer

## Visual Direction

- Thai-first content with established English product terms.
- Full-width immersive Hero; copy overlays the left side and the orbit scene is biased right.
- Use the `PowerCare` wordmark and a replaceable CSS `PC` mark until an official logo exists.
- Keep a hint of the next section visible in the first viewport.
- CM and Store visuals use sanitized data only.
- Do not use unsupported metrics, customer testimonials, or customer logos.
- Day/Night uses the existing session-scoped theme behavior and Bangkok-time default.
- Contact and Get Started remain visible with a `Soon` badge, no navigation, and a short explanatory tooltip.

## Motion

- Reuse the existing `RevealOnScroll` component, Tailwind CSS, Lucide icons, and CSS animation.
- Do not add shadcn/ui, Motion, or Framer Motion solely for this page.
- Orbit and floating effects must be lightweight and honor `prefers-reduced-motion`.
- No horizontal page overflow.

## Platform Content

- Owner Admin is the only announcement publisher.
- Platform Announcements have no Organization or Site scope and are the only announcement type.
- Organization announcement functionality and existing Organization announcement records are removed.
- Organization announcement records are removed from Development and Production through a reviewed migration after backup and record-count verification; they are never deleted through an ad hoc Production command.
- Landing feedback is Platform Feedback with no Organization or Site scope and is reviewed by Owner Admin.
- The existing nullable scope fields are reused; no new Landing-specific schema is required.

## Metadata

- Public brand: `PowerCare`, without a version number.
- Page title: `PowerCare | CMMS สำหรับงานซ่อมบำรุง`.
- Application version remains visible only inside the authenticated product shell.

## Verification

- TypeScript build and focused tests pass.
- Verify desktop, tablet, and mobile layouts in Day and Night modes.
- Verify reduced-motion behavior and absence of horizontal overflow.
- Verify authenticated root redirect and unauthenticated Landing rendering.
- Verify Platform Announcement and Platform Feedback isolation.
