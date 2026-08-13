---
name: interactive-product-demo
description: >-
  Record a product demo as a live DOM/CSS scene instead of a video or GIF: a replica of the
  real UI, a scripted cursor, a camera that pans and spotlights each control, and a beat
  engine that runs only while the scene is on screen. Use when building a hero animation,
  product showcase, landing-page demo, feature walkthrough, animated screenshot, onboarding
  tour replay, or when replacing a screen recording / Loom / GIF on a marketing page.
  Triggers: "animate the product", "show the product in action", "showcase scene",
  "hero animation", "scripted cursor demo", "demo without recording a video".
---

# Demo Scene

Build a product demo out of real DOM, real components, and CSS transitions. A scripted
cursor walks through a replica of the actual app while a camera pans and spotlights the
control being used.

## What this is not

Not a screen recording, not a GIF, not a Lottie export, not a canvas/WebGL scene, not a
carousel of screenshots. Nothing is pre-rendered. The demo is the product's own components
fed fixture data, driven by a small state machine.

You get: no media payload, text that stays sharp and selectable-by-the-DOM, layout that
responds to the container, copy/colors/states editable without a re-export, and a demo that
does not go stale the day the UI changes.

## The five invariants

Violate these and the scene reads as broken, not as a product.

1. **The click lands before the state it causes.** Derive scene state from *committed*
   beats (`done = phase === 'done' ? index : index - 1`), never from the current index. If
   the table updates while the cursor is still travelling, the demo looks like a slideshow.
2. **Keep the meaningful object mounted.** Change its state, geometry, and surroundings.
   Never cross-fade two copies of the same thing.
3. **Nothing animates off screen.** A scene that is mounted but not being watched must have
   zero pending timers. Visibility gating is a correctness requirement, not an optimization.
4. **Measure real targets; never hard-code coordinates.** The cursor follows a
   `[data-tour-target]` node measured in unscaled frame space.
5. **The cursor never actually touches anything.** Replay the control's own hover/press
   states in CSS, or the click reads as landing on a dead pixel.

## Workflow

Work top to bottom. Each step has a gate; do not proceed past a failing gate.

### 1. Pick one task, not a feature tour

A scene shows **one person completing one task with one visible outcome**, in 8–15 seconds.
"Approve the three leave requests waiting on HR" is a scene. "Leave management" is not.
Write the one-sentence outcome down first; it becomes the `aria-label`.

**Gate:** you can name the before-state, the actions, and the after-state in one sentence.

### 2. Collect product truth

Open the real screens in the codebase and list: the route, the components that render it,
the fixture shape those components need, the exact labels/statuses/colors, and the guard
rules that decide what is actionable. Read code, do not guess. Do not invent generic SaaS
UI — the reason a scene feels real is that it *is* the product.

**Gate:** you have a list of real component imports and the props they need.

### 3. Build the still frame first

Chrome replica (sidebar, header, breadcrumb) + **the real page components** + fixture data.
No motion yet. Author the frame at fixed pixel dimensions (e.g. `1400 × 900`) sized so the
content that must stay legible fits without scrolling.

Reuse over rebuild: import the app's own table, badge, avatar, and toolbar components and
feed them fixtures. Hand-rolled mock UI drifts from the product within a sprint. See
`references/replica.md` for the reuse traps (CSS resets, portals, tokens) — they are the
main reason this step fails.

**Gate:** the static frame is indistinguishable from a screenshot of the real screen.

### 4. Write the beat script as data

```ts
const BEATS: readonly SceneBeat[] = [
  { hold: 1000, id: 'queue' },                                            // establish
  { hold: 1100, id: 'ping' },                                             // something arrives
  { hold: 420, id: 'open', target: NOTICE, travel: 900, zoom: 1.12 },     // act
  { hold: 1700, id: 'arrived' },                                          // read the result
  ...
]
const AT = { arrive: 3, ping: 1 } as const   // which beat index commits which state
```

A beat with a `target` is an action; a beat without one is a hold that lets the viewer read
what just changed. Alternate them. Timing budget in `references/authoring.md`.

**Gate:** every state change in the story maps to exactly one beat index in `AT`.

### 5. Wire the primitives

Copy from `assets/` (they are dependency-free and framework-thin):

| File | Owns |
| --- | --- |
| `use-scene-beats.ts` | `travel → press → done` per beat, pause-resume that banks unspent time |
| `use-scene-active.ts` | the one true "is anyone watching" signal (intersection + panel liveness + tab visibility) |
| `use-scene-camera.ts` | fit/cover scale, damped pan to target, cursor point, focus box — via `ResizeObserver` |
| `use-typed-text.ts` | character/line-wise reveal for chat or console output |
| `scene.css` | spotlight blur+dim masks, cursor, press ripple, reduced-motion and mobile fallbacks |
| `scene-template.tsx` | a complete skeleton wiring all of the above |

**Gate:** `reset()` runs when the scene goes inactive, so every viewer starts at beat 0.

### 6. Derive everything from committed beats

```tsx
const done = phase === 'done' ? index : index - 1
const arrived   = reduced || done >= AT.arrive
const selected  = !reduced && done >= AT.select && !committing
```

One derivation block, then pass plain booleans down. Do not `useState` + `useEffect` your
way to the same values — that reintroduces ordering bugs on fast scroll.

**Gate:** scrubbing fast through the scene never leaves a stale cursor, menu, or toast.

### 7. Degrade deliberately

- `prefers-reduced-motion`: render the **end state**, no camera, no cursor, no spotlight.
  Handle it in JS (stop scheduling) *and* CSS (kill transitions) — either alone leaks.
- Narrow viewports: switch the camera to `cover` and pan to the active target. Do not
  shrink a desktop frame until the text is unreadable.
- `role="img"` + one `aria-label` sentence on the scene root; `aria-hidden` on cursor,
  spotlight, beacons, and decorative SVG.
- `pointer-events: none` on the frame; `user-select: none` on the scene.

**Gate:** the reduced-motion render alone still communicates the outcome.

## Reference map

Load only what the current step needs.

| File | Read when |
| --- | --- |
| `references/architecture.md` | wiring the layers, camera math, state derivation |
| `references/replica.md` | reusing real app components inside a marketing page |
| `references/authoring.md` | writing the beat script, timing, story rules, cursor legibility |
| `references/pitfalls.md` | anything looks wrong — read this before debugging |
| `references/checklist.md` | before shipping |

## Ship gate

Run the project's own checks (formatter, linter, type-check) and read the diff. Do **not**
verify a scene by driving a browser unless the user asks for it in that message. Then walk
`references/checklist.md`.
