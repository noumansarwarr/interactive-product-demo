'use client';

import * as React from 'react';

export interface SceneBeat {
  /** ms to dwell after the action has committed — the "read what changed" pause */
  hold: number;
  id: string;
  /**
   * The per-beat control over "whole screen" versus "close up".
   *
   * `0` means show the whole screen, at every width: the camera holds the
   * contain fit and nothing is clipped — no sliced navbar, no half a sidebar.
   * Use it on the establish beat, on any "pull back and hold", and anywhere the
   * point is the shape of the product rather than one control.
   *
   * Above 0 it multiplies the small-stage push-in (see `use-scene-camera`).
   * Above 1 pushes further in for a beat that has to be *read* on a phone. Those
   * only bite on a narrow stage, so they never zoom a desktop composition.
   */
  push?: number;
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

/** What every scene in a deck accepts, so the deck can drive them alike. */
export interface SceneProps {
  /** Fired once the scripted walkthrough wraps back to its first beat. */
  onCycleEnd?: () => void;
}

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
export function useSceneBeats(
  beats: readonly SceneBeat[],
  active: boolean,
  onCycleEnd?: () => void,
) {
  const [index, setIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<BeatPhase>('travel');
  const rest = React.useRef<number | null>(null);
  const startedAt = React.useRef(0);
  const fired = React.useRef(false);
  // Held in a ref so a fresh callback identity can't restart the beat below.
  const cycleEnd = React.useRef(onCycleEnd);
  cycleEnd.current = onCycleEnd;

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
        // A deck advances on this: the scene finishes its story, then hands over.
        const next = (index + 1) % beats.length;
        if (next === 0) cycleEnd.current?.();
        setIndex(next);
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
