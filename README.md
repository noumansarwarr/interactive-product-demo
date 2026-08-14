# interactive-product-demo

A Claude Code skill for recording product demos as **live DOM/CSS scenes** instead of
screen recordings.

A scripted cursor walks through a replica of your real UI — built from your own
components fed fixture data — while a camera pans, pushes in, and spotlights the
control being used. Nothing is pre-rendered: no video, no GIF, no Lottie, no canvas.

## Why

| | Video / GIF | Demo scene |
| --- | --- | --- |
| Payload | MBs, fetched and decoded before it plays | none beyond the page |
| Text | baked pixels | real DOM, sharp at any zoom |
| Layout | one baked aspect ratio | responds to its container |
| Copy change | re-record and re-export | edit a string |
| Product change | the demo silently goes stale | the compiler tells you |
| Reduced motion | a separate asset | a rendered end state |

## Install

Copy the folder into your skills directory:

```bash
# personal, available in every project
git clone https://github.com/<you>/interactive-product-demo ~/.claude/skills/interactive-product-demo

# or per-project
git clone https://github.com/<you>/interactive-product-demo .claude/skills/interactive-product-demo
```

Then ask Claude for a product demo, showcase scene, or hero animation — or invoke it
directly with `/interactive-product-demo`.

## Contents

```
SKILL.md                      the workflow, the seven invariants, the ship gate
references/
  architecture.md             layer model, camera math, state derivation, activity gating
  replica.md                  reusing real app components on a marketing page
  authoring.md                beat scripts, timing budget, cursor legibility
  pitfalls.md                 the failures that are silent or layout-specific
  checklist.md                pre-ship gate
assets/
  use-scene-beats.ts          travel → press → done, with pause/resume banking
  use-scene-active.ts         the one true "is anyone watching" signal
  use-scene-camera.ts         fit/cover, narrow-stage ramp, damped pan, spot markers
  use-typed-text.ts           character/line reveal for chat and console output
  scene.css                   spotlight, cursor, press ripple, degradation
  scene-template.tsx          a complete wired skeleton
```

The assets are React + TypeScript with no dependencies beyond React. The CSS is
framework-agnostic; the whole contract between JS and CSS is a handful of data
attributes and custom properties on one root element, so a Vue/Svelte/vanilla port
only replaces the scheduling.

## The seven invariants

1. The click lands **before** the state it causes.
2. Keep the meaningful object mounted; change its state and geometry.
3. Nothing animates off screen.
4. Measure real targets; never hard-code coordinates.
5. The cursor is a real object: it replays the control's states, and it is continuous
   in space and time.
6. The scene must still read when the text does not.
7. The frame fills its stage, whole: never sliced, never letterboxed.

## License

MIT.
