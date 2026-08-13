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

The cursor is synthetic and touches nothing, so three things have to be faked:

1. **The beacon.** In the beat *before* an action, pulse an outline on the control the
   cursor is about to hit. The eye is then already there when the cursor arrives, and
   the click reads as deliberate rather than random.
2. **Hover.** On the action beat, apply the control's own hover treatment
   (`filter: brightness(1.05)`, its real shadow).
3. **Press.** On `[data-phase='press']`, scale the control down the way its `:active`
   state does — 0.97 for a button, 0.92 for a small checkbox — and fire the ripple.

Drive all three off `data-beat` + `data-phase` on the scene root. Address controls
inside shared components by their accessible name (`[aria-label="…"]`) rather than
adding marketing classes to product components.

If the click lands on a card rather than the button inside it, animate the **card** and
merely brighten the button. Whatever the pointer is over is what must react.

## Camera direction

- Push in (`zoom` 1.10–1.18) on the beat that acts; return to 1 for wide holds.
- Never cut. Every camera change is a transition, and the spotlight's `@property`
  lengths transition on the same curve and duration so the light travels with it.
- Keep `panStrength` around 0.85. At 1.0 the frame slams to a corner and the viewer
  loses the page they were reading.
- One idea per beat. Zoom *and* pan *and* a state change in the same 400ms reads as a
  glitch.

## Typed text

For chat, AI answers, terminal output, or search-as-you-type, use `useTypedText` and
gate `running` on the beat that produces the text. Reveal **by line** for anything
with structure: a markdown table sliced mid-row parses as a paragraph of pipes and
reflows the whole block when the rest arrives. Character reveal is only for prose.

Feed a fixed answer. Never wire a demo to a live endpoint.

## Naming

Use Western placeholder names for people and companies unless a specific locale is
requested (Emily Carter, Daniel Brooks, Northwind Labs). Keep one roster across all
scenes in a product so the panels read as one company.
