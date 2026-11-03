// The efficiency ladder of ?proto=place: each rung is earned and physical, and arrives as you start wanting it. "It was that
// the only thing asked of me was to just chop 1 or 2 trees, so I wasn't feeling hungry for more efficiency yet."
//   1. A proper axe: a chest at the village end of the first path. Tangible from the first swing, on the old oak beside it.
//   2. A pack frame: a chest by the forge, when its frame is up. You can see you carry more.
//   3. The depot: when line 2's first stretch is laid, the camp starts sending a cart of logs to a rack by the next frame
//      (./depot.ts). You still do the last carry; rails stay yours to fetch, so the distance is felt.
//   4. Trains (./cargo.ts): a boiler from the forge wakes the old train.
// `job.rung` is where you are on it. To add a rung: a field in `Rungs`, a chest or an event here, and what it changes.
import * as THREE from 'three/webgpu';
import { fanfare } from '../minis/common.ts';
import { playMark } from '../mark.ts';
import { H } from './land.ts';
import { job, type ChestId } from './job.ts';
import { OAK, toWorld } from './layout.ts';
import { deliver, dropChest, giftState, prizeHooks } from './gifts.ts';
import { showBanner } from './celebrate.ts';
import { coop } from './coop.ts';

/** Where each chest waits. The axe's stands by the oak you'll try it on. */
const CHEST_AT: Record<ChestId, { x: number; z: number }> = {
  axe: { x: OAK.x + 3.4, z: OAK.z + 5 },
  pack: { x: -82.5, z: -12.5 },
};
const sky = new THREE.Vector3();
/** A chest lands where it waits: the rung is yours to open. */
export function grantChest(id: ChestId, quiet = false) {
  job.chest = id;
  const q = CHEST_AT[id];
  const x = toWorld(q.x),
    y = H(x, q.z);
  sky.set(x, y + 22, q.z);
  dropChest(id);
  deliver(x, y, q.z, quiet ? null : sky, id);
}
/** As the state says: for a reload, a Start over, or taking a partner's state. */
export function snapChest() {
  dropChest('axe');
  dropChest('pack');
  if (job.chest) grantChest(job.chest, true);
}
const CHESTS: ChestId[] = ['axe', 'pack'];
function applyRung(id: ChestId) {
  job.chest = null;
  if (id === 'axe') job.rung.axe = 1;
  else job.rung.pack = 1;
}
/** Someone else opened it. */
export function rungFromPeer(id: unknown) {
  if (id !== 'axe' && id !== 'pack') return;
  applyRung(id);
  dropChest(id);
  fanfare(false);
  showBanner(id === 'axe' ? 'A proper axe' : 'A pack frame', '', 2.4);
}

prizeHooks.opened = (c) => {
  playMark('crate opened', { kind: c });
  if (c === 'axe' || c === 'pack') {
    playMark('rung earned', { rung: c });
    applyRung(c);
    coop.rung(c);
  }
};
export const isChestWaiting = () => giftState.crates().some((c) => CHESTS.includes(c.content as ChestId));
