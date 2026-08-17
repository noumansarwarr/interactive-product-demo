# Interactive Product Demo

A [Claude Code](https://claude.com/claude-code) skill that builds your product demo as a
**live DOM/CSS demo** instead of a screen recording.

You point Claude at a screen in your app. It builds a replica from your own components
fed fixture data, then scripts a cursor through one task while a camera pans, pushes in,
and holds on the result. Nothing is pre-rendered — no video, no GIF, no Lottie, no
canvas. The demo is your product, running.

```
You:    /interactive-product-demo — hero animation for the landing page,
        the leave-approval screen
Claude: [asks 2–4 questions] → [writes a brief, you confirm]
        → [shows you the beat script, you confirm]
        → [builds it, verifies it in a browser]
```

---

## Why not a video

| | Video / GIF | Interactive product demo |
| --- | --- | --- |
| Payload | MBs, fetched and decoded before it plays | none beyond the page |
| Text | baked pixels | real DOM, sharp at any zoom |
| Layout | one baked aspect ratio | responds to its container |
| Copy change | re-record and re-export | edit a string |
| Product change | the demo silently goes stale | the compiler tells you |
| Reduced motion | a separate asset | a rendered end state |

---

## Requirements

- **Claude Code** (CLI, desktop, web, or an IDE extension).
- **React 18+ with TypeScript.** The primitives are a handful of small hooks with no
  dependencies beyond React itself.
- **CSS Modules** (or any setup where a `.module.css` file works — Next.js, Vite, CRA,
  Remix all ship this).
- A screen in your app whose components can be imported and rendered with fixture data.

Not on React? The CSS is framework-agnostic and the whole contract between JS and CSS is
a handful of data attributes and custom properties on one root element — a Vue/Svelte/
vanilla port only replaces the scheduling. Say so up front and Claude will port the hooks.

---

## Install

Clone the skill into your skills directory. Personal install makes it available in every
project:

```bash
git clone https://github.com/noumansarwarr/interactive-product-demo \
  ~/.claude/skills/interactive-product-demo
```

Or per-project, so it ships with the repo and your team gets it too:

```bash
git clone https://github.com/noumansarwarr/interactive-product-demo \
  .claude/skills/interactive-product-demo
```

On Windows (PowerShell), the personal path is `$env:USERPROFILE\.claude\skills\`.

**Verify it:** start Claude Code and type `/` — `interactive-product-demo` should appear
in the list.

---

## How to use it

### 1. Ask

Invoke it directly:

```
/interactive-product-demo
```

…or just describe what you want, and Claude picks the skill up on its own:

> Build a hero animation for the landing page showing the leave-approval flow.

A request that names **the screen** and **where the demo will sit** on the page saves you
a round of questions. Both of these work:

| Vague — expect questions | Specific — goes straight to the brief |
| --- | --- |
| "Animate the product" | "Hero animation for `/dashboard/approvals` — one HR manager approving three requests. Full-bleed panel under the headline, ~16:9, dark theme, ships to mobile." |

### 2. Answer the brief questions

Claude asks **at most four questions, in one batch** — only for things the codebase
cannot answer:

| It asks about | Because it decides |
| --- | --- |
| Screen and task | everything downstream; the most expensive thing to get wrong |
| Camera style | zoom-and-spotlight vs. flat whole-screen — and whether a browser frame earns its place |
| Placement and stage geometry | frame dimensions, aspect ratio, clearing a fixed nav |
| Mobile posture | how hard the story must work once the text is unreadable |
| Theme | which palette the replica restates |

**Camera style is the one to think about**, because it changes the build:

- **Zoom and spotlight** — the camera pushes in on each control. Directs the eye hard,
  and it is the only thing that works in a slot too small to show the whole screen
  legibly. Costs context: the viewer never sees the product whole.
- **Flat, whole screen** — the frame sits still at full size and the cursor does all the
  work. Shows the product as a product, and every change stays in shot. Needs a wide
  stage.

Anything you leave open gets a stated default, not a second round of questions.

### 3. Confirm the brief

Claude writes the brief back and stops. Nothing is built until you say yes.

```
Task      An HR manager clears the three leave requests waiting on her.
Screen    /dashboard/approvals — ApprovalsTable, StatusBadge, Toolbar
Actions   open the notice → select all → approve
Before    three amber "Pending" rows, an unread notice dot
After     three green "Approved" rows, empty queue, toast
Camera    flat whole-screen
Chrome    inside a browser frame showing app.acme.com/approvals
Frame     1400×900 — holds the full sidebar + table without scrolling
Stage     full-bleed panel under the headline, pinned to 14:9
Mobile    yes — status pill colour carries the story at 4px text
Theme     dark, tokens from app/globals.css
```

Read the **Actions** and **After** lines carefully. Redirecting here is free; redirecting
after the build is not.

### 4. Confirm the beat script

Second checkpoint. Before wiring anything, Claude shows you the whole story as data —
it reads in about ten seconds:

```ts
const BEATS: readonly DemoBeat[] = [
  { hold: 1000, id: 'queue',    push: 0 },                                  // establish
  { hold: 1100, id: 'ping',     push: 0 },                                  // notice arrives
  { hold: 420,  id: 'open',     target: NOTICE, travel: 900, zoom: 1.12 },  // act
  { hold: 1700, id: 'arrived' },                                            // read the result
  { hold: 480,  id: 'select',   target: SELECT_ALL, travel: 900 },
  { hold: 520,  id: 'approve',  target: APPROVE, travel: 900, zoom: 1.12 },
  { hold: 2400, id: 'approved', push: 0 },                                  // payoff
]

const AT = { approve: 5, arrive: 3, ping: 1, select: 4 } as const
```

A beat with a `target` is an action; one without is a hold that lets the viewer read what
just changed. `AT` maps each state change to the beat index that commits it — that map is
what keeps the click landing *before* its consequence.

### 5. Review what ships

Claude builds the still frame first, wires the primitives, runs your formatter, linter and
type-check, then walks a pre-ship checklist. It finishes by **driving the real page in a
browser at more than one width** — the failures that matter here (bars beside the frame, a
sliced navbar, a cursor that lands after the state it caused) are obvious on sight and
invisible in a diff.

If you have a browser tool wired up — Chrome DevTools MCP, Playwright, Claude in Chrome —
name it in your first message and Claude will use it instead of asking.

---

## What lands in your codebase

A demo component plus its stylesheet, with the primitives copied in as plain source
files you own and can edit:

```
components/interactive-product-demo/
  interactive-product-demo.tsx   your demo: the replica, the BEATS script, the AT map
  demo.module.css                spotlight, cursor, press ripple, degradation
  use-demo-beats.ts              travel → press → done, with pause/resume banking
  use-demo-active.ts             the one true "is anyone watching" signal
  use-demo-camera.ts             fit/cover, narrow-stage ramp, damped pan, spot markers
  use-typed-text.ts              character/line reveal, if the demo types anything
```

No package to install, no runtime dependency added, nothing to keep upgraded.

---

## Tuning it afterwards

Most changes are one edit to the `BEATS` array:

| You want | Change |
| --- | --- |
| More time to read a result | raise that beat's `hold` (1400–2000ms is the usual range) |
| A slower, clearer cursor path | raise `travel`, and keep the cursor's CSS transition slightly shorter |
| Show the whole screen on a beat | `push: 0` |
| One beat readable on a phone | `push: 1.2`–`1.5` (only bites on narrow stages; desktop is untouched) |
| Look at a control without clicking it | `quiet: true` |
| A different order | reorder the beats, then fix the indices in `AT` |

Keep the whole demo between **8 and 15 seconds** — past 15 the loop restarts before
anyone finishes watching. `references/authoring.md` has the full timing budget.

Nothing extra is needed for phones or for `prefers-reduced-motion`: the camera ramps its
own push-in as the stage narrows, and reduced motion renders the end state with no camera,
cursor, or spotlight.

---

## Repository contents

```
SKILL.md                      the workflow, the seven invariants, the ship gate
references/
  architecture.md             layer model, camera math, state derivation, activity gating
  replica.md                  reusing real app components on a marketing page
  authoring.md                beat scripts, timing budget, cursor legibility
  pitfalls.md                 the failures that are silent or layout-specific
  checklist.md                pre-ship gate
assets/
  use-demo-beats.ts           travel → press → done, with pause/resume banking
  use-demo-active.ts          the one true "is anyone watching" signal
  use-demo-camera.ts          fit/cover, narrow-stage ramp, damped pan, spot markers
  use-typed-text.ts           character/line reveal for chat and console output
  demo.css                    spotlight, cursor, press ripple, degradation
  demo-template.tsx           a complete wired skeleton
```

Claude loads only the reference the current step needs — you don't have to read any of
it. It's there for when you want to hand-tune the result.

---

## The seven invariants

The rules the skill holds itself to. Violate them and a demo reads as broken rather than
as a product.

1. The click lands **before** the state it causes.
2. Keep the meaningful object mounted; change its state and geometry.
3. Nothing animates off screen.
4. Measure real targets; never hard-code coordinates.
5. The cursor is a real object: it replays the control's states, and it is continuous in
   space and time.
6. The demo must still read when the text does not.
7. The frame fills its stage, whole: never sliced, never letterboxed.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| The skill never triggers | not in a skills directory Claude Code reads | check `~/.claude/skills/` or `.claude/skills/`, then `/help` |
| Empty bars beside the demo | frame aspect ≠ stage aspect | pin the host panel's `aspect-ratio` to the frame's, or re-author the frame |
| Half a navbar, a dropped column | a beat is pushed in when it should be wide | `push: 0` on that beat |
| The result appears while the cursor is still moving | state derived from `index` instead of committed beats | `const done = phase === 'done' ? index : index - 1` |
| Cursor blinks out between clicks | visibility driven by "does this beat have a target" | span it from the first action beat to the last |
| Demo keeps running off screen | the activity signal isn't wired | `useDemoActive` must gate `useDemoBeats` |

More, with the reasoning behind each: `references/pitfalls.md`.

---

## License

MIT — see [LICENSE](LICENSE). Changes by release in [CHANGELOG.md](CHANGELOG.md).
