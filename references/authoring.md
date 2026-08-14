# Authoring the scene

## Story rules

1. **One task, one outcome.** A named person completing one job. Not a feature tour.
2. **Show a before-state.** The viewer must see what the product changed. A scene that
   opens on the finished state has nothing to demonstrate.
3. **Something arrives, someone acts, the result holds.** Establish → trigger → act →
   read. The "read" beat is not padding; it is the payoff.
4. **Never show more than three actions.** Four is a tutorial, and nobody watches a
   tutorial on a landing page.
5. **The `aria-label` is the script.** If you cannot write the sentence, the scene has
   no story yet. Write it before the code.

## The beat script

```ts
const BEATS: readonly SceneBeat[] = [
  { hold: 1000, id: 'queue'   },                                        // establish
  { hold: 1100, id: 'ping'    },                                        // trigger arrives
  { hold: 420,  id: 'open',    target: NOTICE,     travel: 900, zoom: 1.12 },
  { hold: 1700, id: 'arrived' },                                        // read
  { hold: 480,  id: 'select',  target: SELECT_ALL, travel: 900, zoom: 1.16 },
  { hold: 1600, id: 'selected'},                                        // read
  { hold: 520,  id: 'approve', target: APPROVE,    travel: 900, zoom: 1.12 },
  { hold: 2400, id: 'approved'},                                        // payoff
]
const AT = { approve: 6, arrive: 3, ping: 1, select: 4 } as const
```

Read the shape: **action beats are short** (`hold` 400–550ms — they end the moment the
click commits) and **hold beats are long** (1.5–2.5s). The action beat's real duration
is `travel + press + hold`.

`quiet: true` frames a target with the camera but presses nothing — use it to look at
something without pretending to click it.

A beat with no `target` leaves the camera wherever it was, which is what you want for
a hold immediately after an action.

## Timing budget

| Beat | Range | Purpose |
| --- | ---: | --- |
| Establish (opening hold) | 800–1200ms | Let the viewer see the screen before anything moves. |
| Cursor travel | 700–950ms | Slower than a real cursor on purpose — the path is the explanation. |
| Press | 170–220ms | Reads as intentional. |
| Post-action hold | 1400–2000ms | Read what the click changed. |
| Final payoff hold | 2200–3000ms | The outcome is the message; let it sit. |
| Whole scene | 8–15s | Beyond 15s the loop restarts before anyone finishes watching. |

Two constants must agree or the motion detaches: the beat's `travel` and the cursor's
CSS `transition` duration. Set the CSS slightly **shorter** (e.g. 800ms vs 900ms) so
the pointer settles, then presses. Arriving exactly on the press reads as a lunge.

## Making the cursor legible

The cursor is synthetic and touches nothing, so three things have to be faked. None of
them are decoration: they are the only evidence the viewer gets that a click happened
at all, which is why the ripple ships on by default rather than as an opt-in flourish.

1. **The beacon.** In the beat *before* an action, pulse an outline on the control the
   cursor is about to hit. The eye is then already there when the cursor arrives, and
   the click reads as deliberate rather than random.
2. **Hover.** On the action beat, apply the control's own hover treatment
   (`filter: brightness(1.05)`, its real shadow).
3. **Press.** On `[data-phase='press']`, scale the control down the way its `:active`
   state does — 0.97 for a button, 0.92 for a small checkbox — and fire the ripple at
   the cursor: a contact flash inside an expanding ring, both drawn in `--ripple`.
   Set that colour against **the replica's** surface, not the page's. The default is
   white, which on a light product UI is invisible, and the press then reads as the
   cursor stopping for no reason.

Drive all three off `data-beat` + `data-phase` on the scene root. Address controls
inside shared components by their accessible name (`[aria-label="…"]`) rather than
adding marketing classes to product components.

If the click lands on a card rather than the button inside it, animate the **card** and
merely brighten the button. Whatever the pointer is over is what must react.

### Continuity

The cursor obeys the physics of a pointer, and the viewer checks this without knowing
they are checking it.

- **It enters once and leaves once.** Fade it in on the first action, out after the
  last. Everything between is one unbroken presence, holds included.
- **It never moves while invisible.** Hiding it, repositioning it, and showing it
  again is a teleport, and it is the single fastest way to make a careful replica read
  as a slideshow.
- **It parks during holds.** An untargeted beat centres the *frame*; the pointer stays
  on the control it last used, riding the camera. It does not slide to the middle of
  the screen because nothing is being clicked.
- **A drag is one gesture, not two clicks.** From grab to release the pointer stays
  visible and stays pressed, and the object travels with it. Authoring the transit as
  a quiet beat drops the cursor out exactly when the viewer is following it hardest.

## Camera direction

- Push in (`zoom` 1.10–1.18) on the beat that acts; return to 1 for wide holds.
- Never cut. Every camera change is a transition, and the spotlight's `@property`
  lengths transition on the same curve and duration so the light travels with it.
- Keep `panStrength` around 0.85. At 1.0 the frame slams to a corner and the viewer
  loses the page they were reading.
- One idea per beat. Zoom *and* pan *and* a state change in the same 400ms reads as a
  glitch.
- **Open and close on the whole screen.** The establish beat and the payoff hold are
  what tell the viewer which product this is, so leave both untargeted at zoom 1 and
  make sure the chrome is in shot. Push in only for the actions between them. A loop
  where every beat is targeted never shows the product, only its parts.

### Flat scenes (no camera)

If the brief chose flat, everything above stops applying. Three changes, and they only
work made together:

- `pan: false`, `zoom` held at 1, `fit: 'contain'` — the whole frame, standing still.
- **No spotlight.** Derive `focused` as `false` rather than from `camera.hasTarget`.
  A vignette tracking a cursor with no camera behind it reads as a smear on the glass.
- **The beacon becomes load-bearing.** Under a camera, the push-in tells the viewer
  where to look. Without one, the pulse in the beat before each action is the only
  thing doing that job — so give *every* action beat a beacon, not just the first.

The cursor is unaffected: `useSceneCamera` returns `cursorX/cursorY` from the same
target measurement whether or not it pans.

Timing shifts. Holds can come down 10–20% since nothing has to travel, but the opening
establish beat should get *longer* — the viewer is taking in a whole screen at once
instead of being pointed at one control.

A flat scene still gets the narrow-stage ramp, since that is fit and not camera work.
If flat means flat at every width, give every beat `push: 0`.

### On a narrow viewport

You configure nothing. The camera ramps its own push-in as the stage shrinks —
continuously, so there is no breakpoint to lurch across — and it is 1 on any stage
wide enough to fit the scene at its authored scale.

Know what that ramp does and does not buy. A 1400px frame on a phone-sized stage fits
at roughly 0.24, which puts 12px body text at 3px. The ramp is capped at 1.55, so the
best it reaches is about 4.5px. **The cap is deliberate**: past it the untargeted
beats stop reading as a screen and start reading as a crop of one. So the phone view
is never made readable, and the story has to survive that — see invariant 6.

The per-beat lever is `push`:

- **`push: 0`** — show the whole screen, at every width. The camera holds the contain
  fit, so nothing is sliced: no half navbar, no sidebar cut down the middle. This is
  the setting for the establish beat, for any "pull back and hold", and for the
  payoff. Overflow is then only ever something the scene chose by pushing in, exactly
  as on a real site, where the chrome stays whole until someone zooms.

  **It assumes the frame's aspect matches the stage's.** If it does not, the contain
  fit fills one axis and leaves bars on the other, and `push: 0` turns into the
  letterboxing failure rather than the fix. Settle the aspect in step 3 first.
- **`push` above 1** — push further in, for the one beat that genuinely has to be
  *read* on a phone. Use it once per scene at most.
- Either way it does nothing on a stage wide enough to fit the scene, so a beat
  tuned for a phone cannot zoom the desktop composition.

## Typed text

For chat, AI answers, terminal output, or search-as-you-type, use `useTypedText` and
gate `running` on the beat that produces the text. Reveal **by line** for anything
with structure: a markdown table sliced mid-row parses as a paragraph of pipes and
reflows the whole block when the rest arrives. Character reveal is only for prose.

Feed a fixed answer. Never wire a demo to a live endpoint.
