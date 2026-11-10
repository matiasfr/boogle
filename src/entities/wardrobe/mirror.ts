// The You page's mirror: while it is open Buddy turns to face the camera and the camera eases in, with Buddy off to the
// side the panel leaves free. Local and cosmetic (nothing is sent; partners see you turn, as they would in the world).
// It swings only when standing on foot, yields to any reveal or cinematic (src/render/buddy-frame.ts), and after an
// alt-tab waits for your first change. The follow camera is handed back on close, over the reveal's return blend.
import { camConstraints, me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { guest } from '../../guest/state.ts';
import { reducedMotion } from '../../constants.ts';
import { headwearTop } from '../../render/head-clearance.ts';
import { cameraHeld, faceCamera, frameBuddy, type ScreenOffset } from '../../render/buddy-frame.ts';

const EASE = 7; // per second, the reveal's return blend: about 0.4 s to settle
const MARGIN = 0.4; // m of air above the hat

/** Where the panel leaves the most room, as the centre of that room on screen (fractions of half the view). */
export function freeCentre(panel: DOMRect, width: number, height: number): ScreenOffset {
  const left = panel.left * height,
    right = (width - panel.right) * height,
    above = panel.top * width;
  const best = Math.max(left, right, above);
  const [cx, cy] =
    best === above
      ? [width / 2, panel.top / 2]
      : best === right
        ? [(panel.right + width) / 2, height / 2]
        : [panel.left / 2, height / 2];
  return {
    x: (cx - width / 2) / (width / 2),
    y: (height / 2 - cy) / (height / 2),
    fill: best === above ? panel.top / height : 1,
  };
}

/** Standing on foot: not seated (a cab and every vehicle seat), swimming, in the air (falling, gliding, on a rope),
 * knocked down, or the guest. */
export const onFoot = () =>
  me.entered && !!me.body && me.coyote > 0 && !me.swimming && !me.down && !inputState.seated && !guest.active;

// What the swing is doing, for the look and scenario harness (page code imports this).
const shown = { weight: 0, armed: false, turned: false, held: false };
export const inspectMirror = () => ({ ...shown });

let lastBlur = -1e9;
addEventListener('blur', () => (lastBlur = performance.now()));

export function createMirror() {
  let panel: (() => DOMRect | null) | null = null;
  let armed = false;
  let weight = 0;
  let top = 0;
  let turned = false;
  const offset: ScreenOffset = { x: 0, y: 0 };

  const constraint: (typeof camConstraints)[number] = (look, pos) => {
    if (weight > 0) frameBuddy(look, pos, weight, top, offset);
    return false; // keep the ordinary ground safety constraint
  };
  camConstraints.push(constraint);

  return {
    /** The page is open. A page that opened because the window lost focus waits for the first change. */
    open(area: () => DOMRect | null) {
      panel = area;
      armed = document.hasFocus() && performance.now() - lastBlur > 1500;
      turned = false;
    },
    /** One of the rows changed: the swing starts if it was waiting. */
    changed() {
      armed = true;
    },
    close() {
      panel = null;
    },
    update(dt: number) {
      const want = panel !== null && armed && onFoot() && !cameraHeld();
      if (want) {
        if (!turned) {
          faceCamera();
          turned = true;
        }
        const rect = panel?.();
        if (rect) Object.assign(offset, freeCentre(rect, innerWidth, innerHeight));
        const crown = (me.avatar ? headwearTop(me.avatar) : (me.body?.interpolatedPosition.y ?? 0) + 1.2) + MARGIN;
        top = top === 0 ? crown : top + (crown - top) * (1 - Math.exp(-dt * 10));
      } else if (cameraHeld()) weight = 0; // a shot has it: don't fight
      if (reducedMotion) weight = want ? 1 : 0;
      else weight += ((want ? 1 : 0) - weight) * (1 - Math.exp(-dt * EASE));
      shown.weight = weight;
      shown.armed = armed;
      shown.turned = turned;
      shown.held = cameraHeld();
      if (weight < 0.001) {
        weight = 0;
        if (!want) top = 0;
      }
    },
    inspect: () => ({ weight, armed, turned, offset: { ...offset } }),
    dispose() {
      const index = camConstraints.indexOf(constraint);
      if (index >= 0) camConstraints.splice(index, 1);
    },
  };
}
