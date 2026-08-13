# Architecture

## The layer model

```
Story (one task, one outcome)
  ↓  authored as data
Beat script  ──►  useSceneBeats  ──►  { index, phase }
  ↓  derived, never stored
Committed-beat booleans           ──►  the replica renders that state
  ↓  attributes on the scene root
data-beat / data-phase / data-live / data-focus
  ↓
CSS interpolates geometry, replays control states, runs short keyframes
```

React owns *which semantic state is true*. CSS owns *how it looks getting there*.
No drawing loop, no per-frame style writes on a large tree.

## DOM layers

```
.scene                      viewport, container-type: inline-size, holds all state attrs
├── .camera                 the fixed 1400×900 frame; translate3d + scale; pointer-events: none
│   ├── <Replica>           app chrome + REAL page components + fixtures
│   └── .spot ×n            invisible markers pinned over controls you don't own
├── .blur                   backdrop-filter, radial mask punches a hole at the target
├── .dim                    radial vignette, same centre
└── .cursor                 translate3d to the target's centre + press ripple
```

The cursor and spotlight live **outside** the camera. If they were inside, the
camera's scale would scale the cursor too, and it would balloon on a zoomed beat.

## State derivation, in full

```tsx
const beat = BEATS[index]!
const done = phase === 'done' ? index : index - 1   // committed beats only
const arrived  = reduced || done >= AT.arrive
const selected = !reduced && done >= AT.select && !committing
const pressing = !reduced && !!beat.target && !beat.quiet
```

Three properties fall out of this and are the reason it is written this way:

- **Causality.** `done` excludes the beat currently in `travel`/`press`, so the UI
  changes on the frame after the click, not before it.
- **Idempotence.** Any `(index, phase)` pair renders exactly one state. Fast scroll,
  tab-away, resize, remount — all land on a consistent frame with no cleanup.
- **Free reduced motion.** `reduced ||` on each line renders the end state with no
  separate code path to maintain.

Only ever pass the derived booleans down. A child that holds its own copy of scene
state will disagree with the cursor sooner or later.

## Camera math

`useSceneCamera` fits a fixed frame into a fluid viewport each time the viewport
resizes, and pans toward the current target.

- **`fit: 'contain'`** — the whole frame is visible. Right for a wide desktop stage.
- **`fit: 'cover'`** — the frame is deliberately larger than the stage and clipped.
  Right for narrow viewports and for a scene whose one indispensable dimension is
  width (a table): crop top and bottom, keep the columns readable.
- **`zoom`** per beat multiplies the fitted scale — 1.10–1.18 is a push-in that reads
  as attention without becoming a magnifier.
- **`panStrength`** damps between "frame centred" (0) and "target centred" (1).
  0.8–0.9 keeps context in shot. At 1 the frame lurches to a corner and the viewer
  loses the page.
- Pan is clamped to the frame edges, and falls back to centred whenever the scaled
  frame is smaller than the viewport in that axis — otherwise a small frame gets
  pinned to the top-left.

### Why `spotIn` walks offsetParents

The frame is already translated and scaled when you measure. `getBoundingClientRect`
returns post-transform pixels, so you would have to divide the transform back out —
and you would be reading layout immediately after writing a transform. `offsetLeft`
and `offsetTop` are transform-independent, so the walk yields the target's position
in the frame's authored coordinate space, which is exactly the space the camera
transform maps from.

Constraint: every `offsetParent` between the node and the frame must be positioned
normally. If an intermediate wrapper carries its own transform, it becomes the
containing block and the walk short-circuits — make that wrapper the frame instead.

### Spotlight geometry

The mask is a radial gradient in **viewport** pixels, centred on the same point as
the cursor (`camera.cursorX/Y`). Its radii come from the target's scaled size plus
padding:

```
radius = clamp( pad*2 , (size/2 + pad) / PLATEAU , cap )
```

`PLATEAU` (0.65) is where the gradient stops being fully transparent, so dividing by
it converts "the clear window I want" into "the radius that produces it". Padding
matters more than it looks: focusing an 18px checkbox with a small pad collapses the
clear window into a keyhole and blurs the surrounding row the viewer needs for
context. 90×70 authored pixels is a reasonable floor.

Registering the radii with `@property … syntax: '<length>'` is what makes them
animate. Unregistered custom properties are strings and snap.

## Activity gating

`useSceneActive` returns `onScreen && panelIsLive && !document.hidden`.

The failure it exists to prevent: a deck keeps every panel mounted and hides the
inactive ones with `visibility`/`opacity`. IntersectionObserver still reports all of
them as intersecting, so all N scenes run their timers, their cameras, and their
`will-change` layers simultaneously, forever.

The fallback matters as much as the signal: when the deck's scroll driver stands down
(stacked mobile layout, reduced motion) **no** panel carries the live class, and the
hook must fall back to intersection alone rather than freezing every scene. That is
what the `|| !deck.querySelector('.is-live')` clause does.

The MutationObserver watches the **deck**, not the panel. In the stacked layout your
own panel's class never changes; a sibling going live is the only signal that reaches
you.

## Porting off React

The React-specific part is four hooks' worth of scheduling. The contract is
attributes on a root element:

| Attribute | Value |
| --- | --- |
| `data-beat` | current beat id |
| `data-phase` | `travel` \| `press` \| `done` |
| `data-live` | present while playing |
| `data-focus` | present while a target is framed |
| `--nsfx/--nsfy/--nsfrx/--nsfry` | spotlight centre and radii, px |

Any framework — or 60 lines of vanilla JS with a `setTimeout` chain — can produce
those. The CSS is unchanged.
