# Accessibility Baseline Audit

Date: 2026-07-04

Scope: E11-T03 baseline audit for keyboard navigation, focus states, touch
targets, screen reader labels, color contrast, large text, reduced motion, and
keyboard-only task runner completion.

## Reference Standard

The baseline uses WCAG 2.2 Level A/AA as the practical release bar:

- Keyboard focus must be visible and focus order must preserve meaning and
  operation.
- Interactive targets should meet WCAG 2.2 Target Size (Minimum) or a documented
  exception.
- Motion should respect the user's `prefers-reduced-motion` setting.
- Labels, names, roles, and contrast should pass automated WCAG A/AA checks.

References:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI: Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- [WAI: Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [WAI: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)

## Method

Automated checks:

- Added `tests/browser/accessibility.spec.ts`.
- Runs `@axe-core/playwright` against `/`, `/sign-in`, `/sign-up`, and
  `/forgot-password` for WCAG 2.0/2.1/2.2 A/AA tags.
- Runs in both `desktop-chromium` and `mobile-chromium` through
  `pnpm test:browser`.

Manual and browser-assisted checks:

- Used Playwright screenshots for mobile focus order and keyboard task-runner
  completion.
- Verified the public header focus order starts at `Senex`, then `Sign in`, then
  `Sign up`.
- Verified the focused primary command exposes a visible focus indicator.
- Verified Symbol Match and Arrow Focus can be started and completed without
  pointer input.
- Reviewed the mobile screenshots for overlapping text, clipped controls, and
  obviously undersized primary targets.

## Findings

P0 issues found: none.

Resolved in this audit:

- Added a global `prefers-reduced-motion: reduce` rule to effectively remove
  app-authored transitions and animations when the user requests reduced motion.
- Added automated axe coverage for public and auth surfaces.
- Added browser coverage for visible focus and keyboard-only task-runner
  completion.

Notes:

- Native checkbox controls are small, but they are wrapped by visible text labels
  with larger clickable regions. No release-blocking target-size issue was found
  in the audited flows.
- The long public home page remains dense on mobile, but the audited screenshots
  did not show overlapping controls or clipped task-runner content.
- Playwright occasionally logs a React hydration warning about injected
  `caret-color` styles during mobile tests. The accessibility checks still pass,
  and this warning is not treated as an accessibility P0 in this baseline.

## Evidence

Commands run for this audit:

```bash
pnpm exec playwright test tests/browser/accessibility.spec.ts --project=desktop-chromium
pnpm exec playwright test tests/browser/accessibility.spec.ts --project=mobile-chromium
```

Screenshots produced by the focused audit:

- `test-results/.../accessibility-focus-order.png`
- `test-results/.../accessibility-keyboard-task-runners.png`

Release gate:

- `pnpm test:browser` now includes the accessibility baseline because the new
  spec lives under `tests/browser/`.
