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
| Cursor vanishes between actions and reappears somewhere else | Visibility driven by "this beat has a target" instead of "the walkthrough is running" | Show it from the first targeted beat to the last, holds included. Two different questions: is it in the room, is it pressing |
| Cursor drifts to the middle of the screen during a hold | Untargeted beats centre the frame, and the cursor followed the frame | Keep the last real aim point and hold the cursor there while the camera moves under it |
| Cursor disappears through a drag, then reappears at the drop | The transit was authored as a quiet or untargeted beat | A drag is one continuous gesture: the pointer stays visible and stays pressed from grab to release |
| The press reads as the cursor pausing for no reason | Ripple drawn in the default white over a light replica | Restate `--ripple` against the replica's surface |
| Ripple fires on the first action beat and never again | `data-press` stayed applied across two consecutive action beats, so the animation never restarted | Remove it during the next beat's `travel` (`pressing && phase !== 'travel'`) |

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
| Dead bars beside the scene; it does not use the width it was given | Frame aspect does not match the stage's, so the contain fit (`push: 0`) letterboxes. The commonest form of this bug, and it looks like a broken embed | Match the two aspects: author the frame to the measured slot, or pin the slot's `aspect-ratio` in CSS. Never letterbox as the answer |
| The replica's navbar is sliced off at the top | `fit: 'cover'` on a frame taller in aspect than the stage; the crop lands top and bottom | Same root cause, other direction: match the aspects. `push: 0` on wide beats then fills rather than crops |
| A hold beat is still cropped | It inherited the scene's `cover` fit because nobody gave it `push: 0` | A beat that shows the whole screen must say so; the camera cannot infer it from the absence of a target |
| The viewer never sees the whole product, only pieces of it | Every beat is targeted or zoomed | Leave the establish beat and the payoff untargeted at zoom 1 |
| Part of the UI is simply missing | It was dropped to make the content fit the frame | Cut a data row or shorten the story instead; the chrome and the column set are the product (invariant 7) |
| Rebuilt chrome looks almost, but not quite, right | Shell rebuilt from memory instead of from the real screen | Copy it item for item — secondary nav, search, bell, avatar, badges are what go missing |
| The browser frame reads as a drawing of a browser | Invented proportions: traffic lights flush to the left edge, address pill left-aligned beside them | Inset the lights 12–16px, centre the pill in the bar. See the numbers in `replica.md` |
| Cursor and spotlight sit beside their controls, for the whole loop | Targets measured before the webfont swapped; the metrics then changed under them | Re-measure on `document.fonts.ready` |
| Camera aims where a control *used* to be | Frame content moved. The frame is a fixed size, so no observer sees this and no dep changes | Bump the camera's `key` on every scene state that shifts a target |

## Narrow viewports

| Symptom | Cause | Fix |
| --- | --- | --- |
| Text is unreadable on a phone | Expected, and capped on purpose — the ramp tops out at 1.55 because more reads as a crop, not a screen | Not a bug. Carry the story in silhouette and colour (invariant 6); `push` above 1 buys a little on one beat |
| A beat meant to show the whole screen is cropped on a phone | The narrow ramp applies to every beat by default | `push: 0` on that beat — it floors at the contain fit and letterboxes |
| Camera centres a wide target and shows its empty middle | A target wider than the visible window cannot be centred and be useful | Handled: the camera aims at the leading slice. If you replaced that logic, put it back |
| The scene never plays on a phone, ever | `useSceneActive`'s 0.35 threshold on a tall scroll-driven wrapper that cannot be 35% visible in a short viewport | Observe the stage element rather than the wrapper, or lower the threshold |
| Frame jumps mid-beat while scrolling on iOS/Android | The URL bar collapsing resizes the viewport, `ResizeObserver` fires, the camera re-fits | Size the stage in `dvh` or fixed px rather than `vh`; or ignore height-only changes under ~120px |
| Scene runs under the notch or the home indicator | Edge-to-edge stage with no safe-area padding | `env(safe-area-inset-*)` on the stage, never on `.scene` (it would offset the camera) |

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
