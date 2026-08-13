# Pitfalls

Read this before debugging a scene. Most of these fail silently or only in one
layout, and none of them are guessable from the symptom.

## Motion and timing

| Symptom | Cause | Fix |
| --- | --- | --- |
| UI changes before the cursor arrives | State derived from `index`, not committed beats | `done = phase === 'done' ? index : index - 1` |
| Cursor lunges into the click | CSS transition ≥ the beat's `travel` | Make the CSS transition ~100ms shorter |
| Beat replays from the start after a pause | Timer restarted instead of resumed | Bank the unspent remainder in the effect cleanup (see `useSceneBeats`) |
| Viewer joins the story mid-way | No rewind on exit | `useEffect(() => { if (!live) reset() }, [live, reset])` |
| Stale cursor / menu / toast after fast scroll | Beat side effects held in their own state | Derive everything from `(index, phase)`; store nothing |
| Object jumps instead of morphing | It was unmounted and remounted | Keep it mounted; change CSS variables on the state root |

## Camera and spotlight

| Symptom | Cause | Fix |
| --- | --- | --- |
| Blur covers the whole stage | `min()`/`calc(min())` in a radial-gradient radius slot — invalid there, so `mask-image` silently resolves to `none` | Clamp the radii in JS and pass plain px |
| Spotlight snaps between targets | Radii/centre are unregistered custom properties, so they don't interpolate | Register with `@property … syntax: '<length>'` |
| Two scenes' spotlights corrupt each other | `@property` registration is **global** and first-wins | Prefix every registered name per scene (`--lfx`, `--afx`) |
| Focus window is a keyhole | Padding too small for a tiny control | Floor the radius at `pad * 2`; use ~90×70 authored px of padding |
| Cursor lands beside the control | Measured in viewport space, applied in frame space | Measure with the `offsetParent` walk, then apply scale and translation once |
| Cursor is huge on a zoomed beat | Cursor rendered inside the camera | Move it outside; only the frame is scaled |
| Frame pinned to the top-left at low pan | Pan lerped from origin instead of from centred | Lerp between *centred* and *target-centred* |
| Scene sits behind a fixed nav | Sticky offset ignores the bar | Measure the live bar height into the stage's top offset |

## Reuse and CSS

| Symptom | Cause | Fix |
| --- | --- | --- |
| Reused components lose all spacing | The landing page's **unlayered** `.landing *` reset outranks every Tailwind utility | `margin: revert-layer; padding: revert-layer` scoped to the replica content |
| Borders/fonts subtly wrong | Marketing page redefined app token names | Restate the app values on `.scene` |
| A tooltip appears in the page corner | A real component's portal escaped the scaled camera | `pointer-events: none` on `.camera` |
| A decorative layer is invisible | `-z-10` inside an element that paints its own background | Stage `z-index: 0`, content `position: relative; z-index: 1` |
| A sticky column loses its stacking | `display: contents` on the row wrapper | Wrap rows in a Fragment instead |
| Prettier eats a space in a conditional `className` | Separator inside the ternary | Put the space outside: `` `${a} ${b ? x : y}` `` |

## Performance and lifecycle

| Symptom | Cause | Fix |
| --- | --- | --- |
| Timers run for scenes nobody is watching | Deck hides panels with `visibility`, which still intersects | Gate on the deck's live class **and** intersection **and** `document.hidden` |
| Every scene freezes on mobile | Live-class gate with no fallback when the deck's driver stands down | Fall back to intersection when no panel is live |
| Sustained GPU cost with nothing moving | Permanent `will-change` on each camera | `.scene[data-live] .camera { will-change: transform }` only |
| Jank on scroll on mid-range phones | Stage-sized `backdrop-filter` layers | Drop the blur; the `.dim` vignette plus the push-in already carries focus |
| Layout thrash | Reading `getBoundingClientRect` right after writing transforms | Use the `offsetParent` walk in `useLayoutEffect` |

## Accessibility

| Symptom | Cause | Fix |
| --- | --- | --- |
| Reduced-motion users still see movement | Only JS or only CSS handled | Do both: stop scheduling **and** kill transitions/animations |
| Screen reader announces mock data | Replica exposed as content | `role="img"` + one `aria-label` on the root |
| Keyboard focus enters the demo | Real components carry real focusables | Scene is inert: no handlers, `pointer-events: none`, decorative layers `aria-hidden` |
| Text gets selected while scrolling | Scene behaves like a document | `user-select: none` on the scene only, never the surrounding copy |
