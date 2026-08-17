# Changelog

## 0.3.0

Renamed. The skill is **interactive product demo**, and the code now says so — "scene"
survived only as an internal word that no longer matched anything the user reads.
Entries below this one keep the names they shipped under.

- **`scene` → `demo` across every identifier, filename and doc.** Nothing about the
  mechanism changed; this is a rename and only a rename.

  | Before | After |
  | --- | --- |
  | `use-scene-beats.ts` · `useSceneBeats` | `use-demo-beats.ts` · `useDemoBeats` |
  | `use-scene-active.ts` · `useSceneActive` | `use-demo-active.ts` · `useDemoActive` |
  | `use-scene-camera.ts` · `useSceneCamera` | `use-demo-camera.ts` · `useDemoCamera` |
  | `SceneBeat` · `SceneProps` | `DemoBeat` · `DemoProps` |
  | `scene.css` · `scene.module.css` | `demo.css` · `demo.module.css` |
  | `scene-template.tsx` · `DemoScene()` | `demo-template.tsx` · `InteractiveProductDemo()` |
  | `.scene` | `.demo` |
  | `data-tour-target` | `data-demo-target` |
  | `data-scene-panel` | `data-demo-panel` |

  `useSpotMarker`, `BeatPhase`, `use-typed-text.ts`, the `--ns*` custom-property prefix
  and every `.camera` / `.spot` / `.dim` / `.blur` class are unchanged. Existing scenes
  keep working until you rename them; nothing reads the old names at runtime.

- **README rewritten for public use.** It described the skill but never showed anyone
  using it. It now walks the actual flow — what you type, the questions you get asked,
  the brief you confirm, the beat script you confirm, what lands in your codebase —
  plus requirements, a tuning table, and troubleshooting. The install snippet points at
  a real clone URL instead of `<you>`.

## 0.2.0

Two things the workflow let slip: it inferred the brief instead of asking for it, and
it shipped assets that had drifted behind the production scenes they were extracted
from — most of all on narrow stages.

- **Step 0, take the brief.** One batched question round covering only what the
  request has not already settled, then a written-back brief the user confirms before
  anything is built. A second checkpoint shows `BEATS` and `AT` before they are wired.
- **Re-synced `use-scene-camera.ts` with the production camera.** It had been extracted
  before three things landed, and all three are the difference between a scene that
  works on a phone and one that does not:
  - the **narrow-stage ramp** — a continuous push-in below 640px, capped at 1.55, and
    exactly 1 on any stage wide enough to fit the scene. No breakpoint, nothing for a
    caller to configure, and nothing to snap across while resizing.
  - **`push` per beat** — above 1 pushes further in for the one beat that has to be
    read on a phone, and only bites where the ramp is active, so a phone-tuned beat
    cannot zoom the desktop shot.
  - **wide-target aiming** — a target bigger than the visible window is aimed at its
    leading edge instead of centred, with pan damping off on that axis. Centred, a
    search field shows its empty half, past the text.
- **A sixth invariant: the scene must still read when the text does not.** The ramp's
  1.55 cap is deliberate — past it a scene reads as a crop rather than a screen — so a
  phone view is never made legible. 12px body text lands near 4.5px and the story has
  to survive that in silhouette, colour and motion. Step 3 gates on the before/after
  difference still being visible with the text unreadable.
- **Invariant 5 now covers cursor continuity, and the template obeys it.** Visibility
  was driven by "does this beat have a target", so the pointer blinked out through
  every hold and reappeared at the next control, and a drag lost its cursor for the
  whole transit. It now enters on the first action, stays through every hold, and
  leaves after the last. The camera keeps the last real aim point too, so an
  untargeted beat centres the frame without the pointer sliding to the middle of the
  screen with it. A cursor that teleports tells the viewer the scene is a slideshow,
  and nothing else you get right takes that back.
- **Concrete numbers for the browser frame.** Bar height, traffic-light size and left
  inset, and a centred address pill. It was being eyeballed, which produced lights
  flush to the edge and a pill jammed beside them: recognisably not a browser.
- **No spotlight at all by default.** Neither the `.dim` vignette nor the `.blur`
  layer renders; the template drops the elements, the `--nsf*` vars and `data-focus`.
  A scene shows the page. Dimming the product you are selling works against the only
  job the scene has, and the push-in plus the beacon already direct the eye. Both sets
  of rules stay in `scene.css` for the rare dense screen that earns one.
- **The cursor has an outline.** White fill over a dark stroke drawn underneath
  (`paint-order: stroke fill`), the way an OS pointer is built. It was white with a
  drop shadow, which vanishes against the light cards and controls it spends most of
  its life on.
- **A seventh invariant: the frame fills its stage, whole.** Two failure directions, one rule: never slice the UI to fill the
  space, and never letterbox to avoid slicing. The skill had been *teaching* the first
  (`replica.md` called the top and bottom "the cheap dimension" to crop, which is where
  the navbar is) and then, once `push: 0` forced the contain fit, started producing the
  second. Both come from the frame's aspect not matching the stage's. Step 3 now makes
  matching them the first decision: measure the real slot, author the frame to that
  ratio, and if the slot's shape is wrong, pin its `aspect-ratio` in CSS rather than
  authoring around it. Also: nothing is omitted to make content fit (cut a data row,
  not a piece of UI), and at least one beat shows the whole screen.
- **`push: 0` now means the contain fit at every width, not just narrow ones.** It is
  the concrete guarantee behind "show the whole screen": nothing clipped, no sliced
  navbar, no half a sidebar, whatever the stage's aspect ratio. Every wide beat carries
  it — establish, pull-back, payoff — so the only cropping left in a scene is cropping
  a beat asked for by pushing in, which is the deal a viewer already accepts on a real
  site. **Behaviour change:** in the production scenes `push: 0` was inert on a desktop
  stage, so a beat like `attendance`'s `{ id: 'list', push: 0 }` will now letterbox
  where it used to fill and crop.
- **Rebuilding the shell is not licence to simplify it.** `replica.md` now says to copy
  the real screen item for item, and lists what goes missing when it is rebuilt from
  memory: secondary nav, search, notification bell, avatar, count badges, whatever is
  pinned to the bottom of the sidebar. Deviating from the product is a brief decision,
  not an implementation one.
- `useSceneBeats` gained `onCycleEnd` and the exported `SceneProps`, so a deck can
  advance when a scene finishes its story rather than on a timer of its own.
- `useSceneCamera` gained a `key` option for re-measuring when frame content moves,
  and both it and `useSpotMarker` re-measure on `document.fonts.ready` — every
  measurement here otherwise runs before the webfont swaps and every target moves
  afterwards.
- `measure()` bails out of `setState` when nothing changed, so a resize storm does not
  re-render the whole replica for a sub-pixel change.
- **Camera style is now asked, not assumed.** Zoom-and-spotlight or flat whole-screen
  are different demos, and the skill only ever built the first. `authoring.md` has what
  flat changes: `pan: false`, zoom held at 1, no spotlight, and a beacon on every
  action beat rather than the camera doing the eye-direction.
- **The browser frame is now an option the user picks**, offered in the same question
  as the camera style with a recommendation attached. A drawn top bar with the
  product's real URL, worth its ~60px under a flat camera and cropped out of shot
  under a zooming one. Recommending is the job; deciding it silently is not, however
  obvious the answer looks. `replica.md` has the rules.
- **The ship gate ends in a browser.** Whether the frame fills the stage, whether the
  chrome is whole, whether the cursor reads, whether the click lands before its state:
  all obvious on sight and all invisible in a diff. Use the tool the user named, ask
  which if they named none, and never pick one unasked or skip the step for want of
  one.
- The click ripple is now a contact flash inside an expanding ring rather than a
  single disc, and both layers draw from a `--ripple` custom property. It was
  hardcoded white, so on a light replica the press was invisible. **This is the one
  change here not extracted from a shipped scene** — the production scenes all use the
  single disc, on dark replicas where white works.
- The spotlight's blur layer is now genuinely opt-in: the template renders the
  vignette only. 0.1.0 called the blur opt-in but still shipped the element, so every
  scene got a stage-sized `backdrop-filter` by default.
- New pitfalls: the intersection threshold that stops a scene ever playing on a phone,
  the mobile URL bar resizing mid-beat, safe-area insets, font-swap drift, a whole-screen
  beat cropped for want of `push: 0`.
- Dropped the "do not drive a browser" clause from the ship gate. That is the caller's
  call, not the skill's — and it was the reason the responsive checks could never be
  verified.

## 0.1.0

First release. Extracted from a production Next.js marketing page running four of
these scenes.

- `SKILL.md` — the seven-step workflow, the five invariants, the ship gate.
- Four hooks: beat engine with pause/resume banking, activity gating, camera with
  target measurement and damped pan, typed-text reveal.
- `scene.css` — spotlight, cursor, press ripple, reduced-motion and narrow-viewport
  degradation.
- `scene-template.tsx` — a complete wired skeleton.
- Five references: architecture, replica reuse, authoring, pitfalls, checklist.

### Known gaps

- React only. The JS↔CSS contract is data attributes and custom properties, so a
  Vue/Svelte/vanilla port replaces scheduling only, but no port ships here yet.
- The blur half of the spotlight is opt-in. In production it was cut: two
  stage-sized `backdrop-filter` layers cost more than the vignette plus push-in
  were worth.
- No scroll-pinned variant. The scenes here are ambient loops gated on visibility;
  a scroll-driven scene (progress → step) is a documented pattern but not an asset.
