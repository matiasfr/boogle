// Buddy held in frame, turned to face you: the reward reveal's camera shot (src/render/reward-reveal.ts) and the pause
// view's You page (src/entities/wardrobe/menu.ts) share it. A camConstraint calls frameBuddy with a weight that eases
// 0..1; `offset` slides Buddy off the screen's centre (a panel covers one side). Local and cosmetic.
// Also the one list of who has the camera: a reveal or a pull-out holds it, and the You page waits its turn.
import * as THREE from 'three/webgpu';
import { cam, camForward, me } from '../player/player.ts';
import { modalOpen } from '../player/modal.ts';
import { camera } from './scene.ts';

/** Where Buddy sits on screen, as a fraction of half the view from its centre: x to the right, y up. `fill` is the share
 * of the view's height he may use (1 when missing): a sheet over the lower half leaves less, so he stands further off. */
export type ScreenOffset = { x: number; y: number; fill?: number };

const focus = new THREE.Vector3(),
  shot = new THREE.Vector3(),
  forward = new THREE.Vector3();

/** Turns Buddy to look at the camera. */
export function faceCamera() {
  me.yaw = cam.yaw + Math.PI;
}

/** Pulls the follow camera towards a shot of Buddy from his feet to `topY`, `weight` of the way (0 leaves it alone). */
export function frameBuddy(
  look: THREE.Vector3,
  pos: THREE.Vector3,
  weight: number,
  topY: number,
  offset?: ScreenOffset,
) {
  if (weight <= 0 || !me.body) return;
  const p = me.body.interpolatedPosition;
  const middle = Math.max(p.y + 1.1, (p.y - 0.45 + topY) / 2);
  const height = topY - (p.y - 0.45);
  const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
  const distance = Math.max(3.8, height / (2 * tanHalf * 0.7 * Math.min(1, offset?.fill ?? 1)));
  focus.set(p.x, middle, p.z);
  shot.set(p.x + Math.sin(cam.yaw) * distance, middle + 1, p.z + Math.cos(cam.yaw) * distance);
  if (offset) {
    // Look off to the opposite side, so Buddy lands where the offset says.
    const reach = shot.distanceTo(focus) * tanHalf;
    focus.x -= Math.cos(cam.yaw) * offset.x * reach * camera.aspect;
    focus.z += Math.sin(cam.yaw) * offset.x * reach * camera.aspect;
    focus.y -= offset.y * reach;
  }
  camForward(forward);
  pos.lerp(shot, weight);
  look.addScaledVector(forward, 8).lerp(focus, weight).addScaledVector(forward, -8);
}

// Who holds the camera and the screen right now (a reveal's card, a pull-out's shot, a banner, each its own key), and for
// how long: `secondsLeft` is how long its moment has to go (Infinity until released; 0 for a camera easing home that
// no longer has the screen).
const holders = new Map<object, number>(); // owner -> performance.now() ms when its moment ends
export function holdCamera(owner: object, on: boolean, secondsLeft = Infinity) {
  if (on) holders.set(owner, performance.now() + secondsLeft * 1000);
  else holders.delete(owner);
}
export const cameraHeld = () => holders.size > 0;
/** Something full-screen is showing and has more than `slackS` seconds to go, or the pause view is open. The act card
 * asks it before it comes up (src/features/acts.ts), so two full-screen moments never stack. */
export function momentBusy(slackS = 0) {
  if (modalOpen()) return true;
  const edge = performance.now() + slackS * 1000;
  for (const end of holders.values()) if (end > edge) return true;
  return false;
}
