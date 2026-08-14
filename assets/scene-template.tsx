'use client';

/**
 * Skeleton demo scene. Copy, rename, and replace the Screen + BEATS.
 * Everything else is mechanism you should not need to change.
 *
 * Copy `assets/scene.css` alongside this as `scene.module.css`, and replace its
 * `ns` @property prefix with a token unique to this scene.
 */

import * as React from 'react';
import styles from './scene.module.css';
import { useSceneActive } from './use-scene-active';
import { useSceneBeats, type SceneBeat } from './use-scene-beats';
import { useSceneCamera, useSpotMarker } from './use-scene-camera';

// Authored frame size. Pick it from the real screen: big enough to hold the
// WHOLE screen, chrome included, without scrolling. Keep its aspect close to the
// stage's — under `fit: 'cover'` the gap between the two aspects is the crop, and
// it comes off the top, which is where the navbar is. If the chrome must always
// be in shot, use `fit: 'contain'` instead and let it letterbox.
const FRAME = { height: 900, width: 1400 };

// Targets. Prefer a literal `data-tour-target` in your own markup; use
// useSpotMarker for controls inside shared components you don't own.
const PRIMARY = 'primary';

// ── The script ────────────────────────────────────────────────────────────
// One task, ~10s. Action beats alternate with holds long enough to read what
// the click changed. `travel` is the cursor's crossing time; keep it in step
// with the cursor's CSS transition.
const BEATS: readonly SceneBeat[] = [
  // `push: 0` on every wide beat: contain fit at all widths, nothing clipped.
  // Without it these inherit `cover` and the stage's aspect ratio decides how
  // much of the navbar the viewer gets, which is exactly the wrong thing to
  // leave to chance.
  { hold: 1000, id: 'establish', push: 0 },
  { hold: 900, id: 'ready', push: 0 }, // idle beacon plays here
  { hold: 520, id: 'act', target: PRIMARY, travel: 900, zoom: 1.12 },
  // The payoff pulls back. Note the difference from a *read* hold immediately
  // after a click: that one stays pushed in, so the viewer sees what changed
  // where it changed. Only the closing beat goes wide again.
  { hold: 2400, id: 'result', push: 0 },
];

// Which beat INDEX commits which state. Read as "state X is true once beat
// AT.x has finished". Keeping this as one map is what makes the story legible.
const AT = { act: 2 } as const;

// The cursor enters once and leaves once. Between these two beats it is on
// stage continuously, including through every hold: a pointer that blinks out
// while nothing is being clicked and reappears somewhere else is the single
// fastest way to make a scene read as a fake.
const FIRST_ACTION = BEATS.findIndex((b) => b.target);
const LAST_ACTION = BEATS.map((b) => Boolean(b.target)).lastIndexOf(true);

// No spotlight. The default scene shows the page, full stop: the camera's
// push-in and the beacon already say where to look, and dimming a product you
// are trying to sell is a strange thing to do. Both spotlight layers (`.dim`
// vignette and `.blur`) are opt-in — scene.css has the rules and what to add
// back if a particular scene genuinely needs one.

// A control inside a shared component, addressed by its accessible name.
const PRIMARY_AT = '[aria-label="Primary action"]';

export function DemoScene() {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const live = useSceneActive(viewportRef);
  const { index, phase, reset } = useSceneBeats(BEATS, live && !reduced);

  // Rewind once off screen, so every viewer gets the story from the top.
  React.useEffect(() => {
    if (!live) reset();
  }, [live, reset]);

  const beat = BEATS[index]!;
  // How many beats have actually COMMITTED. Everything below derives from it,
  // so a click always lands before the state it causes.
  const done = phase === 'done' ? index : index - 1;
  // Reduced motion skips the walkthrough and renders where the story ends.
  const acted = reduced || done >= AT.act;
  // Two separate questions. `onStage` is "is the pointer in the room" and spans
  // the whole walkthrough. `acting` is "is it pressing something right now".
  // Driving visibility off `acting` is what makes a cursor teleport.
  const onStage =
    !reduced && index >= FIRST_ACTION && index <= LAST_ACTION && FIRST_ACTION >= 0;
  const acting = !reduced && !!beat.target && !beat.quiet;

  // The key must change whenever the marked control moves, mounts or unmounts —
  // list every scene state that shifts it, not just `live`, or the marker keeps
  // covering where the control used to be.
  const primarySpot = useSpotMarker(frameRef, PRIMARY_AT, `${live}:${acted}`);

  // Narrow stages need no configuration here: the camera ramps its own push-in
  // as the stage gets smaller. `push` is the per-beat lever over that — 0 for a
  // beat that must show the whole screen, >1 for one that must be *read* on a
  // phone — and it does nothing on a stage wide enough to fit the scene.
  //
  // This template pushes in and pans. For a flat scene pass `pan: false` and
  // `zoom: 1`; the cursor needs no changes either way. See authoring.md.
  const camera = useSceneCamera({
    fit: 'cover',
    frameHeight: FRAME.height,
    frameRef,
    frameWidth: FRAME.width,
    // Re-measure when frame content moves; the frame is a fixed size, so no
    // observer can detect this on its own.
    key: String(acted),
    panStrength: 0.85,
    push: beat.push,
    target: reduced ? undefined : beat.target,
    viewportRef,
    zoom: reduced ? 1 : (beat.zoom ?? 1),
  });

  return (
    <div
      ref={viewportRef}
      className={styles.scene}
      data-beat={beat.id}
      data-live={live ? '' : undefined}
      data-phase={phase}
      role="img"
      aria-label="One sentence naming the person, the task, and the outcome."
    >
      <div
        ref={frameRef}
        className={styles.camera}
        style={{
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
        }}
      >
        {/* The replica: the browser bar if the brief asked for one, then your
            app's real chrome, real page components, and fixtures.
            Pass plain booleans; never let a child own scene state. */}
        <Screen acted={acted} />

        {primarySpot && (
          <span
            className={styles.spot}
            data-tour-target={PRIMARY}
            style={primarySpot}
            aria-hidden="true"
          />
        )}
      </div>

      {/* No spotlight layers here on purpose. See scene.css if a scene needs
          one; it also needs the --nsf* vars and data-focus adding back. */}

      <span
        className={styles.cursor}
        data-press={acting && phase !== 'travel' ? '' : undefined}
        data-show={onStage ? '' : undefined}
        style={{
          transform: `translate3d(${camera.cursorX}px, ${camera.cursorY}px, 0)`,
        }}
        aria-hidden="true"
      >
        <i />
        <svg viewBox="0 0 24 24">
          <path d="M5.8 2.5v17.1l4.5-4.3 2.8 6 3-1.4-2.8-5.9 5.8-.4Z" />
        </svg>
      </span>
    </div>
  );
}

function Screen({ acted }: { acted: boolean }) {
  return <div className={styles.page}>{acted ? 'after' : 'before'}</div>;
}
