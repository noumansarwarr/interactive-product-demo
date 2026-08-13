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

// Authored frame size. Pick it from the real screen: wide enough that the
// content which must stay legible fits without scrolling. `cover` crops the
// edges on narrow viewports, so put nothing load-bearing at the top/bottom.
const FRAME = { height: 900, width: 1400 };

// Targets. Prefer a literal `data-tour-target` in your own markup; use
// useSpotMarker for controls inside shared components you don't own.
const PRIMARY = 'primary';

// ── The script ────────────────────────────────────────────────────────────
// One task, ~10s. Action beats alternate with holds long enough to read what
// the click changed. `travel` is the cursor's crossing time; keep it in step
// with the cursor's CSS transition.
const BEATS: readonly SceneBeat[] = [
  { hold: 1000, id: 'establish' },
  { hold: 900, id: 'ready' }, // idle beacon plays here
  { hold: 520, id: 'act', target: PRIMARY, travel: 900, zoom: 1.12 },
  { hold: 2400, id: 'result' },
];

// Which beat INDEX commits which state. Read as "state X is true once beat
// AT.x has finished". Keeping this as one map is what makes the story legible.
const AT = { act: 2 } as const;

// Spotlight geometry. The gradient radii are half-extents and the mask is only
// fully clear out to PLATEAU of the radius, so the focused control plus its
// padding has to fit inside that. Capped here because min()/calc() is invalid
// in a radial-gradient radius slot (see scene.css).
const PLATEAU = 0.65;
const DIM = 2.6;
const PAD = { x: 92, y: 68 };
const focusRadius = (size: number, pad: number, cap: number) =>
  Math.min(cap, Math.max(pad * 2, (size / 2 + pad) / PLATEAU));

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
  const pressing = !reduced && !!beat.target && !beat.quiet;

  const primarySpot = useSpotMarker(frameRef, PRIMARY_AT, String(live));

  const camera = useSceneCamera({
    fit: 'cover',
    frameHeight: FRAME.height,
    frameRef,
    frameWidth: FRAME.width,
    panStrength: 0.85,
    target: reduced ? undefined : beat.target,
    viewportRef,
    zoom: reduced ? 1 : (beat.zoom ?? 1),
  });

  const focused = !reduced && camera.hasTarget;
  const fx = focusRadius(camera.focusW, PAD.x, camera.viewW * 0.46);
  const fy = focusRadius(camera.focusH, PAD.y, camera.viewH * 0.5);

  return (
    <div
      ref={viewportRef}
      className={styles.scene}
      data-beat={beat.id}
      data-focus={focused ? '' : undefined}
      data-live={live ? '' : undefined}
      data-phase={phase}
      role="img"
      aria-label="One sentence naming the person, the task, and the outcome."
      style={
        {
          '--nsfx': `${camera.cursorX}px`,
          '--nsfy': `${camera.cursorY}px`,
          '--nsfrx': `${fx}px`,
          '--nsfry': `${fy}px`,
          '--nsdimx': `${fx * DIM}px`,
          '--nsdimy': `${fy * DIM}px`,
        } as React.CSSProperties
      }
    >
      <div
        ref={frameRef}
        className={styles.camera}
        style={{
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
        }}
      >
        {/* The replica: your app's real chrome + real page components + fixtures.
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

      <span className={styles.blur} aria-hidden="true" />
      <span className={styles.dim} aria-hidden="true" />

      <span
        className={styles.cursor}
        data-press={pressing && phase !== 'travel' ? '' : undefined}
        data-show={pressing ? '' : undefined}
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
