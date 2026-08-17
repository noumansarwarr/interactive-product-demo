---
name: interactive-product-demo
description: >-
  Build a product demo out of live DOM and CSS instead of a video or GIF: a replica of the
  real UI, a scripted cursor, a camera that pans and spotlights each control, and a beat
  engine that runs only while the demo is on screen. Use when building a hero animation,
  product showcase, landing-page demo, feature walkthrough, animated screenshot, onboarding
  tour replay, or when replacing a screen recording / Loom / GIF on a marketing page.
  Triggers: "animate the product", "show the product in action", "showcase scene",
  "interactive product demo", "hero animation", "scripted cursor demo",
  "demo without recording a video".
---

# Interactive Product Demo

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

## The seven invariants

Violate these and the demo reads as broken, not as a product.

1. **The click lands before the state it causes.** Derive demo state from *committed*
   beats (`done = phase === 'done' ? index : index - 1`), never from the current index. If
   the table updates while the cursor is still travelling, the demo looks like a slideshow.
2. **Keep the meaningful object mounted.** Change its state, geometry, and surroundings.
   Never cross-fade two copies of the same thing.
3. **Nothing animates off screen.** A demo that is mounted but not being watched must have
   zero pending timers. Visibility gating is a correctness requirement, not an optimization.
4. **Measure real targets; never hard-code coordinates.** The cursor follows a
   `[data-demo-target]` node measured in unscaled frame space.
5. **The cursor is a real object, or the story is a fake.** Two halves, and both are
   load-bearing. It touches nothing, so the control has to replay its own hover and
   press states or the click lands on a dead pixel. And it is continuous in space and
   time: it enters once, stays for the whole walkthrough including every hold, moves
   only by travelling, and leaves once. A pointer that blinks out between actions and
   reappears somewhere else has told the viewer the demo is a slideshow, and no
   amount of fidelity elsewhere takes that back.
6. **The demo must still read when the text does not.** On a phone a 1400px frame
   lands near a third of its authored scale and body text is 4–5px. The camera's
   push-in is capped on purpose: magnifying further stops reading as a screen and
   starts reading as a crop. So the story is carried by silhouette, colour and
   motion, and anything that depends on reading a *word* belongs in the page copy
   around the demo, not inside the frame.
7. **The frame fills its stage, whole.** Two failures, one rule. Never slice the UI to
   fill the space: no half navbar, no column dropped to make things fit. And never
   letterbox to avoid slicing: dead bars beside the demo look like a broken embed and
   throw away the width you were given. Both mean the frame's aspect does not match
   the stage's, and the fix is to change one of them. You can. Both are yours.

## Workflow

Work top to bottom. Each step has a gate; do not proceed past a failing gate. Two of
the gates — step 0 and the step 4 checkpoint — are the user's confirmation, not your
own assessment.

### 0. Take the brief

Do not infer the demo from the surrounding page. Five things decide what gets built
and none of them are in the codebase:

| Unknown | What it decides |
| --- | --- |
| Screen and task | everything downstream; the most expensive thing to get wrong |
| Camera style | zoom-and-spotlight or flat — and with it, whether a browser frame earns its place |
| Placement and stage geometry | frame dimensions, aspect, whether a fixed nav must be cleared |
| Mobile posture | how hard the story has to work once the text is unreadable |
| Theme | which palette the replica restates on `.demo` |

**Camera style is a fork, not a detail.** Never assume it. Offer both:

- **Zoom and spotlight** — the camera pushes in on each control and dims the rest.
  Directs the eye hard, and it is the only thing that works in a slot too small to
  show the whole screen legibly. Costs context: the viewer never sees the product
  whole.
- **Flat, whole screen** — the frame sits still at full size and the cursor does all
  the work. Shows the product as a product, and every change stays in shot. Needs a
  stage wide enough to stay readable, and a beacon carrying the eye-direction the
  camera was doing.

A **browser frame** — a top bar with tab and the product's real URL — is an option the
user picks, never a call you make for them. Put it in the same question as the camera
style, with a recommendation attached, and let them answer. It costs frame height and
buys "this is a real page someone is using"; under a zoom camera it is cropped out of
shot for most of the loop, so the recommendation is usually "no" when the camera moves
and "yes" when it does not. Recommending is the job. Deciding silently, however
obvious the answer looks, is not — it is a visual choice about their product, and the
reasoning that makes it obvious to you is not visible to them.

Ask only for what the request has not already settled, and at most four questions in
**one** batched round — take them in the order of the table and give the rest a stated
default. A request that names the screen and the slot leaves two questions; a fully
specified one skips this step. Whatever is still open after the round gets a default,
not a second round.

Everything else is repo work, not a question: which components can be imported, the
real response types, the guard rules that decide what is actionable. Escalate to the
user only when the repo genuinely cannot answer — the app and the marketing site are
separate packages, the components need auth context.

Then write the brief back and wait for a yes. Draft it against the rule in step 1 —
one person, one task, one visible outcome — rather than as a transcript of the ask:

```
Task      one sentence: who, what they do, what changes  (becomes the aria-label)
Screen    route + the components that render it
Actions   3 or fewer, in order
Before    what the viewer sees at beat 0
After     what is different at the last beat
Camera    zoom-and-spotlight | flat whole-screen
Chrome    app only | inside a browser frame showing <the real url>
Frame     W×H, and why that size
Stage     where it sits on the page, and the aspect it gets
Mobile    does it ship to phones, and what carries the story at 4px text
Theme     dark/light + where the palette comes from
```

**Gate:** the user has confirmed the brief. Nothing is built before that.

### 1. Pick one task, not a feature tour

A demo shows **one person completing one task with one visible outcome**, in 8–15 seconds.
"Approve the three leave requests waiting on HR" is a demo. "Leave management" is not.
Write the one-sentence outcome down first; it becomes the `aria-label`.

**Gate:** you can name the before-state, the actions, and the after-state in one sentence.

### 2. Collect product truth

Open the real screens in the codebase and list: the route, the components that render it,
the fixture shape those components need, the exact labels/statuses/colors, and the guard
rules that decide what is actionable. Read code, do not guess. Do not invent generic SaaS
UI — the reason a demo feels real is that it *is* the product.

**Gate:** you have a list of real component imports and the props they need.

### 3. Build the still frame first

Chrome replica (sidebar, header, breadcrumb) + **the real page components** + fixture data.
No motion yet. Author the frame at fixed pixel dimensions (e.g. `1400 × 900`) sized so the
content that must stay legible fits without scrolling.

Reuse over rebuild: import the app's own table, badge, avatar, and toolbar components and
feed them fixtures. Hand-rolled mock UI drifts from the product within a sprint. See
`references/replica.md` for the reuse traps (CSS resets, portals, tokens) — they are the
main reason this step fails.

**Nothing is left out to make it fit.** The frame holds the screen as the product
renders it — every nav item, the whole header, the full toolbar. If it does not fit,
the frame is the wrong size or the story is the wrong story. Dropping UI is never the
answer (invariant 7).

**Match the frame's aspect to the stage's. Do this before you pick any dimension.**
This is the single decision that makes everything downstream work, and getting it
wrong produces the two visible failures in invariant 7:

1. **Measure the real slot**, at each width it ships at. Open the element the demo
   replaces and read its box. Do not guess from the design.
2. **Author the frame to that aspect.** Pick the width the content needs, then let the
   height follow the ratio. If the extra height leaves room, spend it on the product:
   more rows, real spacing. Do not letterbox it away.
3. **If the slot's aspect is wrong, change the slot.** It is your stylesheet. Set
   `aspect-ratio` on the panel hosting the demo so it matches the frame. A slot whose
   aspect changes across breakpoints, or that is square on phones while the screen is
   16:9, is a slot to pin, not a shape to letterbox into.

Only once the aspects agree do `contain` and `cover` mean the same thing, and only
then does **`push: 0`** mean what you want: the whole screen, filling the stage,
nothing clipped. Give it to every wide beat — the establish, any "pull back and hold",
the payoff. With mismatched aspects that same `push: 0` gives you bars, which is the
letterboxing half of invariant 7.

Clipping is then only ever something a beat asked for by pushing in, which is the deal
a viewer already accepts on a real site: the chrome stays whole until *they* zoom.

**Narrow stages are the camera's job, not a second build.** `useDemoCamera` ramps a
push-in continuously as the stage shrinks — no breakpoint, no second frame, nothing to
configure. What this step owes it is a frame whose *story* survives that ramp, because
the ramp is capped and the text does not survive it (invariant 6). Check the frame the
way a phone will show it: squint at it. If the before/after difference disappears when
you cannot read a word, the fix is here — a bigger status pill, a colour change, a row
that visibly empties — not in the camera.

**Gate:** the static frame is indistinguishable from a screenshot of the real screen —
nothing omitted, nothing simplified — and its before/after difference is still visible
with the text unreadable.

### 4. Write the beat script as data

```ts
const BEATS: readonly DemoBeat[] = [
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

**Checkpoint:** show the user the `BEATS` array and the `AT` map before wiring anything.
The script is the whole story in a form that reads in ten seconds, and this is the last
cheap moment to redirect it.

### 5. Wire the primitives

Copy from `assets/` (they are dependency-free and framework-thin):

| File | Owns |
| --- | --- |
| `use-demo-beats.ts` | `travel → press → done` per beat, pause-resume that banks unspent time |
| `use-demo-active.ts` | the one true "is anyone watching" signal (intersection + panel liveness + tab visibility) |
| `use-demo-camera.ts` | fit/cover scale, the narrow-stage ramp, damped pan to target, wide-target aiming, cursor point, focus box |
| `use-typed-text.ts` | character/line-wise reveal for chat or console output |
| `demo.css` | spotlight vignette (the blur layer is opt-in), cursor, press ripple, reduced-motion and narrow-viewport fallbacks |
| `demo-template.tsx` | a complete skeleton wiring all of the above |

**Gate:** `reset()` runs when the demo goes inactive, so every viewer starts at beat 0.

### 6. Derive everything from committed beats

```tsx
const done = phase === 'done' ? index : index - 1
const arrived   = reduced || done >= AT.arrive
const selected  = !reduced && done >= AT.select && !committing
```

One derivation block, then pass plain booleans down. Do not `useState` + `useEffect` your
way to the same values — that reintroduces ordering bugs on fast scroll.

**Gate:** scrubbing fast through the demo never leaves a stale cursor, menu, or toast.

### 7. Degrade deliberately

- `prefers-reduced-motion`: render the **end state**, no camera, no cursor, no spotlight.
  Handle it in JS (stop scheduling) *and* CSS (kill transitions) — either alone leaks.
- Narrow viewports: nothing to implement. The camera's ramp handles the scale; use a
  beat's `push` (0 for "show the whole screen", above 1 for "this one has to be read")
  where the default shot is wrong. `references/authoring.md` has the numbers.
- `role="img"` + one `aria-label` sentence on the demo root; `aria-hidden` on cursor,
  spotlight, beacons, and decorative SVG.
- `pointer-events: none` on the frame; `user-select: none` on the demo.

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

Run the project's own checks (formatter, linter, type-check), read the diff, then walk
`references/checklist.md`.

Then verify it in a browser. Most of what goes wrong with a demo cannot be settled by
reading code: whether the frame fills the stage or sits in bars, whether the chrome is
whole on the wide beats, whether the cursor reads against the replica's surface,
whether the click lands before the state it causes. Those are the failures that reach
the user, and every one of them is obvious on sight and invisible in a diff.

If the user has named a tool, use it. If not, ask which one — do not pick one and
start driving it, and do not skip the step because none was named. Drive the real page
at more than one width, step the beats, and report what you saw rather than what the
code implies.
