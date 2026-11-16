// Q4's shot (owner, 15 November: "Q4 can get camera shot yeah"; decisions-controls.md): as Q4 is laid live the sea
// gate's control seats on the far jamb, and every page's camera goes to the jamb for it. Authored from the jamb's
// landing, so it moves with the gate: close on the cradle from the side the strips and the ring face while the drum
// drops, then back and down the jamb as the lights wipe to its foot, with the pennant over it. Pure (layout only),
// for tests; line2-view.ts plays it and sea-gate-view.ts times the drop to it.
import { LINE2_SEA } from '../../sim/railway-line2-layout.ts';

type Point = { x: number; y: number; z: number };
type Offset = readonly [number, number, number];
/** Seconds. `drop`: into the shot when the drum starts down, once the blend from the follow camera has landed. `lead`:
 * held close on the cradle, until the drum has seated (the drop takes 1.3 s). `travel`: the move back and down the
 * jamb, under the lights' 0.9 s wipe. `seconds`: the whole shot, its 0.55 s blend home included. `hold`: the longest
 * the drop waits for a shot queued behind a reward card, so the control is never withheld by a card left open. */
export const SEA_INSTALL_SHOT = { drop: 0.8, lead: 2.2, travel: 1.6, seconds: 5, hold: 12 } as const;
/** Metres from the jamb's landing (the socket's foot, 38 m): the camera close on the cradle and where it looks, then
 * where it ends and what it looks at (down the jamb, the gate's slab and the machine beside it in frame). Both stand
 * on the jamb's west and track side, which the two lit strips and the hook ring face. */
const VIEW = {
  from: [-12, 3.5, 9],
  atFrom: [0, 3.4, 0],
  to: [-27, -2, 17],
  at: [1, -2.5, 0],
} as const satisfies Record<string, Offset>;

const foot = (): Point => ({ x: LINE2_SEA.x / 100, y: LINE2_SEA.y / 100, z: LINE2_SEA.z / 100 });
const off = (o: Offset): Point => {
  const p = foot();
  return { x: p.x + o[0], y: p.y + o[1], z: p.z + o[2] };
};
/** The shot as `createCameraPullOut.play` takes it: from, to and the final look, the seconds, the travel's seconds,
 * and the shape's `lead` and `atFrom`. */
export function seaInstallShot() {
  const { lead, travel, seconds } = SEA_INSTALL_SHOT;
  return { from: off(VIEW.from), to: off(VIEW.to), at: off(VIEW.at), atFrom: off(VIEW.atFrom), lead, travel, seconds };
}
