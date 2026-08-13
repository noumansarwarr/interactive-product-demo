'use client';

import * as React from 'react';

interface CameraOptions {
  /** 'contain' fits the whole frame (desktop); 'cover' crops it (narrow). */
  fit?: 'contain' | 'cover';
  frameHeight: number;
  frameRef: React.RefObject<HTMLDivElement | null>;
  frameWidth: number;
  pan?: boolean;
  /** 0 = frame stays centred, 1 = the target is centred in the viewport */
  panStrength?: number;
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
  pan = true,
  panStrength = 1,
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
      const scale = base * zoom;
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

      const scaledWidth = frameWidth * scale;
      const scaledHeight = frameHeight * scale;
      let x = 0;
      let y = 0;

      if (pan) {
        // Damp between "frame centred" and "target centred" — panStrength 0
        // must read as a centred frame, not one pinned to the top-left.
        const centredX = (width - scaledWidth) / 2;
        const centredY = (height - scaledHeight) / 2;
        x = centredX + (width / 2 - spot.x * scale - centredX) * panStrength;
        y = centredY + (height / 2 - spot.y * scale - centredY) * panStrength;
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

      setStyle({
        cursorX: x + spot.x * scale,
        cursorY: y + spot.y * scale,
        focusH: spot.h * scale,
        focusW: spot.w * scale,
        hasTarget: Boolean(node),
        scale,
        viewH: height,
        viewW: width,
        x,
        y,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [
    fit,
    frameHeight,
    frameRef,
    frameWidth,
    pan,
    panStrength,
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
  }, [frameRef, key, selector]);

  return box;
}
