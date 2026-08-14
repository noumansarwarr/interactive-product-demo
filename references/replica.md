# The replica: reuse the real product

The single biggest quality lever. A hand-built mock of your own UI is a fake that
drifts from the product within one sprint. Import the product's own components and
feed them fixtures.

## What to reuse vs. what to rebuild

| Layer | Do |
| --- | --- |
| App chrome (sidebar, header, breadcrumb, avatar) | **Rebuild once**, as a small `<Replica>` shell. It is mostly static, and the real shell drags in auth, routing, and stores. |
| Page content (tables, cards, badges, toolbars, charts, empty states) | **Import the real components.** This is where fidelity lives. |
| Data | **Fixtures typed with the real API response types.** The compiler then tells you when the product moved. |
| Actions | `noop`. Nothing in a scene may mutate. |

### Rebuilding the shell is not licence to simplify it

"Rebuild" means skipping auth, routing and stores. It does not mean an approximation.
Open the real screen and copy it: the same nav items in the same order, the same
active state, the same breadcrumb depth, the same header controls, the same spacing.

The things that get dropped when the shell is rebuilt from memory, and that are always
noticed: secondary nav, the search field, the notification bell, the user avatar and
its label, count badges, and whatever is pinned to the bottom of the sidebar.

If the scene should differ from the product — a highlight the real UI does not have, a
simplified sidebar, invented flair — that is the user's call and it belongs in the
brief. Anything not in the brief matches the product.

The shell is where you plant permanent tour targets (`data-tour-target="nav-people"`)
because you own it. For controls inside imported components, use `useSpotMarker` with
a selector — usually the accessible name — rather than editing a shared component to
carry a marketing attribute.

## Fixtures

- Type them with the real response types, not `any` or a local shape.
- Set optional fields **explicitly to `null`** when a component compares them against
  another value. `undefined === undefined` is true, so a row with an absent
  `currentApproverId` matched against an absent `myEmployeeId` flags *every* row as
  "yours".
- Keep one roster across all scenes — same names, codes, designations — so several
  panels read as one company rather than four unrelated demos.
- Model the guard rules the real screen applies (which rows are actionable, which are
  disabled). A bulk action that selects rows the product would refuse is a lie the
  viewer can feel.
- Export the before-state and after-state as separate arrays derived from one seed
  list, so they cannot drift:

```ts
export const rowsBefore = rows.slice(1)
export const STORY_IDS  = rows.filter(isActionable).map(r => r.id)
export const rowsAfter  = rows.map(r =>
  STORY_IDS.includes(r.id) ? { ...r, status: 'Approved', … } : r)
```

## The four traps of putting app components on a marketing page

These are why step 3 fails, every time, and none of them are obvious.

### 1. The marketing CSS reset outranks Tailwind

A landing page typically ships an **unlayered** reset like `.landing * { margin: 0;
padding: 0 }`. Unlayered declarations beat every `@layer utilities` rule regardless of
specificity, so every reused component loses its spacing and nothing you write in a
utility class brings it back.

```css
.scene .page,
.scene .page * {
  margin: revert-layer;
  padding: revert-layer;
}
```

`revert-layer` drops the unlayered declaration for those two properties only and hands
the cascade back to the utility layer. Scope it to the replica's content — the shell
around it sets its own padding and must keep it.

### 2. Design tokens get redefined

Marketing pages often reassign app token names (`--color-border`, `--color-surface`,
font vars) to their own palette. Every imported component inherits the marketing value
through `border-border` and looks subtly wrong. Restate the app's values on `.scene`:

```css
.scene {
  --color-border: #e2e8f0;
  --font-sans: var(--font-app);
}
```

### 3. Portals escape the stage

Tooltips, dropdowns, and popovers portal to `<body>`. Inside a scaled, translated
camera that means they render at the wrong place, at the wrong scale, outside the
clip. `pointer-events: none` on `.camera` prevents the hover that would open them.
If the story genuinely needs an open menu, render it as your own markup inside the
frame instead of triggering the real one.

### 4. Negative z-index inside a painted stage

`-z-10` on a decorative layer inside an element with its own background paints it
*behind* that background and it vanishes. Give the stage `z-index: 0` and lift content
with `position: relative; z-index: 1` instead of pushing decoration negative.

## The browser frame

Optional, and decided in the brief. A top bar with a tab and the product's real URL
buys "a real page someone is actually using" for around 60px of frame height. Worth
drawing for a flat scene; usually wasted under a zoom camera, which crops it out of
shot for most of the loop.

If it is in:

- **Use the real URL, on the route the scene is showing.** A queue screen with a
  generic `app.example.com` in the bar reads as a placeholder, which is the opposite
  of what the bar is there to do.
- **Draw it, do not screenshot it.** A captured browser bar re-introduces the media
  payload this whole approach exists to avoid, and it will be the wrong OS for most
  of the people looking at it.
- **Match a real browser's proportions.** This is the same argument as the cursor: a
  bar with invented spacing reads as a drawing of a browser, and the viewer clocks it
  without being able to say why. Working numbers for a macOS-style bar, at the frame's
  authored scale:
  - Bar height 40–44px, with the page content starting immediately below it.
  - Three traffic lights, 12px across, 8px apart, the first one inset **12–16px from
    the left edge**. Flush against the edge is the giveaway.
  - The address pill **centred in the bar**, not butted up against the lights. Width
    around 40–55% of the bar, height 26–28px, fully rounded, one step off the bar's
    own background rather than a hard border.
  - Nothing else. No tab strip, no bookmarks bar, no extension icons: they add width
    that has to come off the product, and every one of them is another proportion to
    get wrong.
- **Keep it dead.** No traffic lights that look pressable, no tab that looks
  switchable, `aria-hidden` on the whole bar. It is set dressing; the scene's one
  `aria-label` already says what is happening.
- **Budget its height out of the content, not into a taller frame.** It comes off the
  top of the same fixed frame, so it costs rows. Growing the frame instead means a
  smaller scale at every width.
- **Expect it to be off screen on a phone.** The narrow-stage ramp pushes past it on
  every targeted beat, so it earns its height on desktop and is invisible where the
  frame is tightest. That is another reason it belongs to flat scenes.

## Sizing the frame

One frame, authored at fixed pixels chosen from the real screen. There is no narrow
variant to build: the camera fits and ramps the same frame at every width. Budget:

- The frame cannot scroll, so size it to hold the whole screen. If the content does
  not fit, cut a **row of data** or shorten the story — never a piece of the UI. The
  chrome, the toolbar, and the column set are the product; fixture rows are filler.
- **Match the frame's aspect to the measured stage**, before choosing any dimension.
  The difference between the two aspects is either a crop or a pair of dead bars,
  depending on the fit, and there is no third option. Measure the real slot; if its
  shape is wrong for the screen, pin its `aspect-ratio` in CSS instead of authoring
  around it.
- App spacing may need trimming by a few px to fit; note the budget in a comment so
  the next edit knows it is tight. Trimming spacing is fine. Removing elements is not.
- A taller frame is a smaller scale at every width, phones included. Adding a row is
  never free.
