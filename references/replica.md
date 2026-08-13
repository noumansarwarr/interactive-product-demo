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

## Sizing the frame

Author at fixed pixels chosen from the real screen. Then budget:

- The frame cannot scroll. Anything that does not fit is a clipped row. Count the
  header, filters, toolbar, and rows before adding one more.
- Make the frame *wider* than the stage's aspect ratio if width is the thing that must
  survive (tables). `cover` then crops top and bottom, which is the cheap dimension.
- App spacing may need trimming by a few px to fit; note the budget in a comment so
  the next edit knows it is tight.
