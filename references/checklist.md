# Ship checklist

## Story

- [ ] The `aria-label` names a person, a task, and an outcome in one sentence.
- [ ] There is a visible before-state and a visible after-state.
- [ ] Three actions or fewer.
- [ ] Whole loop is 8–15s.
- [ ] Every state change maps to exactly one entry in `AT`.

## Fidelity

- [ ] Page content uses the product's real components, not hand-built mocks.
- [ ] Fixtures are typed with the real API response types.
- [ ] Optional fields that get compared are explicitly `null`, not absent.
- [ ] The scene respects the product's own guard rules (what is actionable).
- [ ] Placeholder names are Western and consistent with sibling scenes.
- [ ] Nothing in the scene can mutate anything; all handlers are `noop`.

## Motion

- [ ] Every state change lands *after* its click (`done` derivation in place).
- [ ] Cursor CSS transition is slightly shorter than the beat's `travel`.
- [ ] The control being clicked replays its own hover and press states.
- [ ] A beacon draws the eye to the target in the beat before the action.
- [ ] Camera never cuts; spotlight travels on the same curve and duration.
- [ ] Pausing and resuming continues mid-beat rather than replaying it.
- [ ] Leaving the viewport rewinds to beat 0.

## Lifecycle

- [ ] No timer, observer, or rAF survives unmount.
- [ ] Nothing animates while the scene is off screen, hidden by its deck, or the tab
      is backgrounded.
- [ ] `will-change` is applied only while the scene is live.
- [ ] Fast scrolling across the whole section leaves no stale cursor, menu, or toast.

## Responsive

- [ ] ~375px: frame crops and pans to the active target; the acting control is legible.
- [ ] ~768px, ~1024px, ≥1440px: composition holds, nothing important is clipped.
- [ ] No horizontal page scroll at any width.
- [ ] Nothing essential depends on hover.
- [ ] The sticky stage clears any fixed navigation bar.

## Accessibility

- [ ] `role="img"` + `aria-label` on the scene root.
- [ ] Cursor, spotlight, dim, beacons, decorative SVG all `aria-hidden`.
- [ ] With `prefers-reduced-motion: reduce`: end state rendered, no cursor, no camera,
      no spotlight — and it still communicates the outcome on its own.
- [ ] Reduced motion handled in **both** JS and CSS.
- [ ] No keyboard focus lands inside the scene.
- [ ] Surrounding headings, copy, and CTAs remain normal selectable document text.

## Gate

- [ ] The project's formatter, linter, and type-check all pass.
- [ ] The diff was read.
- [ ] No browser was driven to "verify" this unless the user asked in that message.
