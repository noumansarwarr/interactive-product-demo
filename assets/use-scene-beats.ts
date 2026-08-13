'use client';

import * as React from 'react';

export interface SceneBeat {
  /** ms to dwell after the action has committed — the "read what changed" pause */
  hold: number;
  id: string;
  /** camera-only beat: it frames `target` without a cursor press on it */
  quiet?: boolean;
  /** data-tour-target the cursor travels to; absent = a quiet "breathe" beat */
  target?: string;
  /** ms of cursor travel; keep in sync with the cursor's CSS transition */
  travel?: number;
  /** multiplies the fitted camera scale, so a beat can push in on its target */
  zoom?: number;
}

export type BeatPhase = 'travel' | 'press' | 'done';

const PRESS = 190;
const TRAVEL = 620;

const waitFor = (beat: SceneBeat, phase: BeatPhase) => {
  if (!beat.target) return phase === 'done' ? beat.hold : 0;
  if (phase === 'travel') return beat.travel ?? TRAVEL;
  if (phase === 'press') return beat.quiet ? 0 : PRESS;
  return beat.hold;
};

/**
 * Drives a scripted UI walkthrough as `travel -> press -> done` per beat, so a
 * click always lands *before* the state it causes. Callers derive their scene
 * state from `index`/`phase` rather than mutating on a step boundary:
 *
 *   const done = phase === 'done' ? index : index - 1
 *
 * `active` is the "someone is watching" signal (see use-scene-active). While it
 * is false no timer is scheduled, and the unspent remainder of the current beat
 * is banked so resuming continues mid-beat instead of replaying it.
 */
export function useSceneBeats(beats: readonly SceneBeat[], active: boolean) {
  const [index, setIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<BeatPhase>('travel');
  const rest = React.useRef<number | null>(null);
  const startedAt = React.useRef(0);
  const fired = React.useRef(false);

  React.useEffect(() => {
    const beat = beats[index];
    if (!active || !beat) return;

    const wait = rest.current ?? waitFor(beat, phase);
    rest.current = null;
    fired.current = false;
    startedAt.current = Date.now();

    const timer = window.setTimeout(() => {
      fired.current = true;
      if (phase === 'travel') setPhase('press');
      else if (phase === 'press') setPhase('done');
      else {
        setIndex((current) => (current + 1) % beats.length);
        setPhase('travel');
      }
    }, wait);

    return () => {
      window.clearTimeout(timer);
      if (!fired.current) {
        rest.current = Math.max(0, wait - (Date.now() - startedAt.current));
      }
    };
  }, [active, beats, index, phase]);

  /** Rewind to beat 0. Call when the scene leaves the viewport, so the next
   *  viewer gets the story from the top instead of joining it mid-sentence. */
  const reset = React.useCallback(() => {
    rest.current = null;
    setIndex(0);
    setPhase('travel');
  }, []);

  return { index, phase, reset };
}
