# Ship checklist

## Story

- [ ] The user confirmed the brief before anything was built, and confirmed the beat
      script before it was wired.
- [ ] The `aria-label` names a person, a task, and an outcome in one sentence.
- [ ] There is a visible before-state and a visible after-state.
- [ ] Three actions or fewer.
- [ ] Whole loop is 8–15s.
- [ ] Every state change maps to exactly one entry in `AT`.

## Fidelity

- [ ] The frame holds the complete screen. No nav item, header control, or column was
      left out to make it fit.
- [ ] The rebuilt chrome matches the real screen item for item, unless the brief asked
      for the difference.
- [ ] Nothing important falls inside `cover`'s crop — check the navbar specifically.
- [ ] At least one beat shows the whole screen, chrome included, uncropped.
- [ ] Page content uses the product's real components, not hand-built mocks.
- [ ] Fixtures are typed with the real API response types.
- [ ] Optional fields that get compared are explicitly `null`, not absent.
- [ ] The demo respects the product's own guard rules (what is actionable).
- [ ] The browser frame was offered to the user as a choice, and the brief records
      their answer rather than a decision made on their behalf.
- [ ] A browser frame, if the brief asked for one, shows the product's real URL for
      this route, is drawn rather than screenshotted, and is `aria-hidden`.
- [ ] Placeholder names are consistent with sibling demos.
- [ ] Nothing in the demo can mutate anything; all handlers are `noop`.

## Motion

- [ ] Every state change lands *after* its click (`done` derivation in place).
- [ ] Cursor CSS transition is slightly shorter than the beat's `travel`.
- [ ] The control being clicked replays its own hover and press states.
- [ ] The ripple fires on every action beat and is visible against the replica's
      surface, not just against the stage background.
- [ ] The cursor reads against light surfaces, not only dark ones: it keeps its
      outline, not just its drop shadow.
- [ ] The cursor enters once and leaves once. It is visible through every hold between
      the first action and the last, and it never changes position while hidden.
- [ ] During a drag it stays visible and pressed for the whole transit.
- [ ] A beacon draws the eye to the target in the beat before the action.
- [ ] The camera style matches the confirmed brief. If flat: `pan: false`, zoom held
      at 1, no spotlight, and a beacon on *every* action beat.
- [ ] Camera never cuts; spotlight travels on the same curve and duration.
- [ ] Pausing and resuming continues mid-beat rather than replaying it.
- [ ] Leaving the viewport rewinds to beat 0.

## Lifecycle

- [ ] No timer, observer, or rAF survives unmount.
- [ ] Nothing animates while the demo is off screen, hidden by its deck, or the tab
      is backgrounded.
- [ ] `will-change` is applied only while the demo is live.
- [ ] No spotlight layers are rendered — neither `.dim` nor `.blur` — unless this
      demo specifically justified one. The default is to show the page.
- [ ] Fast scrolling across the whole section leaves no stale cursor, menu, or toast.

## Responsive

- [ ] ~375px: the before/after difference is still visible with the text unreadable.
- [ ] The frame's aspect matches the measured stage, so wide beats **fill** it. No
      dead bars left, right, top or bottom at any width.
- [ ] Every wide beat — establish, any pull-back, the payoff — carries `push: 0`, and
      at those beats nothing is clipped at any width: navbar, sidebar and toolbar all
      whole.
- [ ] Anything cropped is cropped by a beat that deliberately pushed in. Nothing is
      cropped by the stage's aspect ratio.
- [ ] At most one beat uses `push` above 1.
- [ ] ~768px, ~1024px, ≥1440px: composition holds, nothing important is clipped.
- [ ] No horizontal page scroll at any width.
- [ ] The frame does not jump when the mobile URL bar collapses.
- [ ] Nothing essential depends on hover.
- [ ] The sticky stage clears any fixed navigation bar and the safe-area insets.

## Accessibility

- [ ] `role="img"` + `aria-label` on the demo root.
- [ ] Cursor, spotlight, dim, beacons, decorative SVG all `aria-hidden`.
- [ ] With `prefers-reduced-motion: reduce`: end state rendered, no cursor, no camera,
      no spotlight — and it still communicates the outcome on its own.
- [ ] Reduced motion handled in **both** JS and CSS.
- [ ] No keyboard focus lands inside the demo.
- [ ] Surrounding headings, copy, and CTAs remain normal selectable document text.

## Gate

- [ ] The project's formatter, linter, and type-check all pass.
- [ ] The diff was read.
- [ ] The demo was seen running in a browser, at more than one width, with the tool
      the user named or chose. The visual items above were verified by looking, not
      inferred from the code.
