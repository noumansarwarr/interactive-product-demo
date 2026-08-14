'use client';

import * as React from 'react';

interface CameraOptions {
  /** 'contain' fits the whole frame (desktop); 'cover' crops it (narrow). */
  fit?: 'contain' | 'cover';
  frameHeight: number;
  frameRef: React.RefObject<HTMLDivElement | null>;
  frameWidth: number;
  /**
   * Any string that changes when content INSIDE the frame moves — a toolbar that
   * appears with a selection, a row that expands. The frame is a fixed size, so
   * no observer can see this; without a key the camera keeps aiming at where the
   * target used to be.
   */
  key?: string;
  pan?: boolean;
  /** 0 = frame stays centred, 1 = the target is centred in the viewport */
  panStrength?: number;
  /**
   * Per-beat multiplier on the small-stage push-in. `0` is special: it forces
   * the contain fit at every width, so nothing is clipped — that is the setting
   * for a beat that shows the whole screen.
   */
  push?: number;
  /** value of the [data-tour-target] attribute to frame */
  target?: string;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  /** multiplies the fitted scale, so a beat can push in on its target */
  zoom?: number;
}

export interface Spot {
  h: number;
  w: number;
  /** centre of the node, in untransformed frame coordinates */
  x: number;
  y: number;
}

/** Below this stage width the replica is too small to read anything on. */
const NARROW = 640;
/** Past this the untargeted beats read as a crop rather than as a screen. */
const MAX_PUSH = 1.55;

/**
 * How much to push in past the fitted scale. The scenes are fixed ~1400px
 * replicas, so a phone-sized stage fits them at ~0.24 — 12px body text lands at
 * 3px. This ramps continuously (no snap at a breakpoint) and is 1 on every stage
 * wide enough to read at its fitted size.
 *
 * This is the whole of the scene's responsive behaviour. Resist adding a
 * breakpoint on top: a ramp keeps the composition believable at every width in
 * between, and a snap is visible as a lurch to anyone resizing.
 */
const pushIn = (width: number) =>
  width >= NARROW ? 1 : Math.min(MAX_PUSH, NARROW / Math.max(1, width));

/**
 * Position of `node` inside `frame`, in the frame's own untransformed pixels.
 *
 * Deliberately an offsetParent walk rather than getBoundingClientRect: the frame
 * is already translated and scaled, so rect maths would have to divide the
 * transform back out (and would read layout right after the transform was
 * written). offsetLeft/offsetTop are transform-independent by definition.
 *
 * Requires every offsetParent between node and frame to be positioned normally;
 * if a wrapper uses a transform, make it the frame or measure from inside it.
 */
export const spotIn = (node: HTMLElement, frame: HTMLElement): Spot => {
  let current: HTMLElement | null = node;
  let x = node.offsetWidth / 2;
  let y = node.offsetHeight / 2;

  while (current && current !== frame) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return { h: node.offsetHeight, w: node.offsetWidth, x, y };
};

/**
 * Fits a fixed-size frame into a fluid viewport and pans it toward the current
 * beat's target. Returns everything the scene needs to place the camera, the
 * cursor and the spotlight — all in viewport pixels.
 *
 * Apply as:
 *   frame.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
 *   cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`
 */
export function useSceneCamera({
  fit = 'contain',
  frameHeight,
  frameRef,
  frameWidth,
  key,
  pan = true,
  panStrength = 1,
  push = 1,
  target,
  viewportRef,
  zoom = 1,
}: CameraOptions) {
  const [style, setStyle] = React.useState({
    cursorX: 0,
    cursorY: 0,
    focusH: 0,
    focusW: 0,
    hasTarget: false,
    scale: 1,
    viewH: 0,
    viewW: 0,
    x: 0,
    y: 0,
  });

  // Where the cursor was last genuinely aimed, in frame coordinates. Untargeted
  // beats centre the FRAME, but the cursor must not follow that: a pointer that
  // slides to the middle of the screen every time nobody is clicking is not a
  // pointer, it is a bug the viewer can see.
  const lastAim = React.useRef<{ x: number; y: number } | null>(null);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const frame = frameRef.current;
    if (!viewport || !frame) return;

    const measure = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const base =
        fit === 'cover'
          ? Math.max(width / frameWidth, height / frameHeight)
          : Math.min(width / frameWidth, height / frameHeight);
      const narrow = pushIn(width);
      // The factor only ever applies on a stage that is already being pushed
      // in, so a beat asking for a tighter shot can't zoom the desktop scene.
      // The floor is the contain fit: `push: 0` pulls back to the whole frame,
      // letterboxed against the scene's own backdrop, rather than to `cover`'s
      // crop — a beat that exists to show the whole screen has to show it.
      const contain = Math.min(width / frameWidth, height / frameHeight);
      // `push: 0` means "show the whole screen", and it means it at EVERY width:
      // the contain fit, letterboxed, nothing clipped. This is what a hold or a
      // pull-back beat is for, and a viewer reads a sliced navbar as a broken
      // page, not as a camera angle. Overflow is only ever acceptable on a beat
      // that is deliberately pushed in.
      const scale =
        push === 0
          ? contain
          : Math.max(contain, base * zoom * (narrow > 1 ? narrow * push : 1));
      const node = target
        ? frame.querySelector<HTMLElement>(`[data-tour-target="${target}"]`)
        : null;
      const spot = node
        ? spotIn(node, frame)
        : {
            h: frameHeight,
            w: frameWidth,
            x: frameWidth / 2,
            y: frameHeight / 2,
          };

      // A target bigger than the window can't be centred without showing only
      // its middle — for a search field that is the empty half, past the text.
      // Aim at the leading slice instead, and don't damp that: the whole point
      // is that the target's start is on screen. Targets only: without one the
      // "spot" is the whole frame, and this would pin it to the top-left.
      const windowW = width / scale;
      const windowH = height / scale;
      const wideX = Boolean(node) && spot.w > windowW;
      const wideY = Boolean(node) && spot.h > windowH;
      const aimX = wideX ? spot.x - spot.w / 2 + windowW / 2 : spot.x;
      const aimY = wideY ? spot.y - spot.h / 2 + windowH / 2 : spot.y;

      const scaledWidth = frameWidth * scale;
      const scaledHeight = frameHeight * scale;
      let x = 0;
      let y = 0;

      if (pan) {
        // Damp between "frame centred" and "target centred" — panStrength 0
        // must read as a centred frame, not one pinned to the top-left.
        const strengthX = wideX ? 1 : panStrength;
        const strengthY = wideY ? 1 : panStrength;
        const centredX = (width - scaledWidth) / 2;
        const centredY = (height - scaledHeight) / 2;
        x = centredX + (width / 2 - aimX * scale - centredX) * strengthX;
        y = centredY + (height / 2 - aimY * scale - centredY) * strengthY;
        // Never pan past an edge: clamp when the frame overflows, centre when
        // it does not.
        x =
          scaledWidth <= width
            ? centredX
            : Math.min(0, Math.max(width - scaledWidth, x));
        y =
          scaledHeight <= height
            ? centredY
            : Math.min(0, Math.max(height - scaledHeight, y));
      }

      if (node) lastAim.current = { x: aimX, y: aimY };
      // Holds keep the pointer where it was left, still glued to the same point
      // of the UI as the camera moves under it.
      const cursorAim = node ? { x: aimX, y: aimY } : (lastAim.current ?? { x: aimX, y: aimY });

      const next = {
        cursorX: x + cursorAim.x * scale,
        cursorY: y + cursorAim.y * scale,
        focusH: (wideY ? windowH : spot.h) * scale,
        focusW: (wideX ? windowW : spot.w) * scale,
        hasTarget: Boolean(node),
        scale,
        viewH: height,
        viewW: width,
        x,
        y,
      };

      // Bail when nothing moved. Every value here is a number or a boolean, so
      // a shallow compare is exact, and it keeps a resize storm from re-rendering
      // the whole replica for a sub-pixel change.
      setStyle((current) =>
        (Object.keys(next) as (keyof typeof next)[]).every(
          (field) => current[field] === next[field],
        )
          ? current
          : next,
      );
    };

    let cancelled = false;
    measure();

    // Every measurement here is an offset walk taken before an async web font
    // has swapped. When it lands the metrics change and every target moves — so
    // the cursor and the spotlight would sit beside their controls for the whole
    // loop, on exactly the machines that load the font slowest.
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [
    fit,
    frameHeight,
    frameRef,
    frameWidth,
    key,
    pan,
    panStrength,
    push,
    target,
    viewportRef,
    zoom,
  ]);

  return style;
}

type Box = Pick<React.CSSProperties, 'height' | 'left' | 'top' | 'width'>;

/**
 * Pins an invisible tour target over a node the scene does not own — a control
 * inside a shared app component you do not want to pollute with a marketing
 * attribute. Render the returned box as an absolutely positioned
 * `<span data-tour-target=... aria-hidden />` inside the frame.
 *
 * `key` is any string that changes when that node moves, mounts or unmounts
 * (e.g. `String(selected)` for a bar that appears with a selection).
 */
export function useSpotMarker(
  frameRef: React.RefObject<HTMLDivElement | null>,
  selector: string,
  key: string,
): Box | null {
  const [box, setBox] = React.useState<Box | null>(null);

  React.useLayoutEffect(() => {
    const measure = () => {
      const frame = frameRef.current;
      const node = frame?.querySelector<HTMLElement>(selector);
      if (!frame || !node) {
        setBox(null);
        return;
      }
      const spot = spotIn(node, frame);
      setBox({
        height: spot.h,
        left: spot.x - spot.w / 2,
        top: spot.y - spot.h / 2,
        width: spot.w,
      });
    };

    let cancelled = false;
    measure();
    // Same font-swap trap as the camera: measured before the webfont lands, the
    // marker sits beside the control it is meant to cover.
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [frameRef, key, selector]);

  return box;
}
