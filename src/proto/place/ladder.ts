// The efficiency ladder of ?proto=place: each rung is earned and physical, and arrives as you start wanting it. "It was that
// the only thing asked of me was to just chop 1 or 2 trees, so I wasn't feeling hungry for more efficiency yet."
//   0. The multi-axe: when the machine first wakes, you can chop trees and break rocks (./run.ts).
//   1. A proper axe: Station 3's 40 logs earn the chest, before its great beam.
//   2. A pack frame: a chest by the forge, when its frame is up. You can see you carry more.
//   3. The depot: when line 2's first stretch is laid, the camp starts sending a cart of logs to a rack by the next frame
//      (./depot.ts). You still do the last carry; rails stay yours to fetch, so the distance is felt.
//   4. Trains (./cargo.ts): a boiler from the forge wakes the old train.
// `job.rung` is where you are on it. To add a rung: a field in `Rungs`, a chest or an event here, and what it changes.
import * as THREE from 'three/webgpu';
import { playMark } from '../mark.ts';
import { H, addStatic } from './land.ts';
import { job, type ChestId, type Rungs } from './job.ts';
import { LINKS, ORIGIN, toWorld } from './layout.ts';
import { frameBesideLine } from './spatial-station.ts';
import { scene } from '../../render/scene.ts';
import { flat } from '../../render/flat.ts';
import { deliver, dropChest, prizeHooks, showChestPrize } from './gifts.ts';
import { makeAxeModel, type AxeTier } from '../../render/axe-models.ts';
import { rememberGot, youGot } from './got.ts';
import { coop, coopWire } from './coop.ts';
import { MULTI_AXE_REWARD } from '../../render/t1-reward-parts.ts';

const timber = LINKS[0]!;
const station3 = frameBesideLine(timber.stations[2]!, timber.line, timber.dir);
const axeStand = { x: station3.x + station3.lx * 3.4, z: station3.z + station3.lz * 3.4 };
const standY = H(axeStand.x, axeStand.z);
const stand = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 2.2), flat('#c3ae83'));
stand.position.set(axeStand.x, standY + 0.35, axeStand.z);
stand.castShadow = stand.receiveShadow = true;
scene.add(stand);
addStatic({ kind: 'box', hx: 1.1, hy: 0.35, hz: 1.1 }, stand.position);
/** The axe waits on the approach-facing stand beside Station 3. */
const CHEST_AT: Record<ChestId, { x: number; z: number }> = {
  axe: { x: axeStand.x - ORIGIN.x, z: axeStand.z },
  pack: { x: -86, z: -9 },
};
const sky = new THREE.Vector3();
/** A chest lands where it waits: the rung is yours to open. */
export function grantChest(id: ChestId, quiet = false) {
  if (job.rung[id]) {
    if (job.chest === id) job.chest = null;
    dropChest(id);
    return;
  }
  job.chest = id;
  const q = CHEST_AT[id];
  const x = toWorld(q.x),
    y = H(x, q.z) + (id === 'axe' ? 0.7 : 0);
  sky.set(x, y + 22, q.z);
  dropChest(id);
  deliver(x, y, q.z, quiet ? null : sky, id);
}
/** The machine's awake: chopping starts here. Every tab in the room gets it as the machine wakes there. */
export function grantMultiAxe() {
  if (job.rung.multi) return;
  job.rung.multi = true;
  playMark('rung earned', { rung: 'multi' });
  showMultiAxe();
}
const multiModels = new Map<AxeTier, THREE.Group>();
function showMultiAxe() {
  const tier = job.rung.axe ? 'proper-multi' : 'multi';
  let model = multiModels.get(tier);
  if (!model) multiModels.set(tier, (model = makeAxeModel(tier)));
  youGot({
    key: MULTI_AXE_REWARD.key,
    name: MULTI_AXE_REWARD.name,
    line: MULTI_AXE_REWARD.line,
    model: model.clone(true),
  });
}
/** As the state says: for a reload, a Start over, or taking a partner's state. */
export function snapChest() {
  dropChest('axe');
  dropChest('pack');
  if (job.chest) grantChest(job.chest, true);
}
function applyRung(id: ChestId) {
  job.chest = null;
  if (id === 'axe') job.rung.axe = 1;
  else job.rung.pack = 1;
}
/** Someone else opened it. */
export function rungFromPeer(id: unknown) {
  if (id !== 'axe' && id !== 'pack') return;
  const had = job.rung[id] > 0;
  applyRung(id);
  dropChest(id);
  if (!had) showChestPrize(id);
}

/** Snapshot-before-message still presents the newly accepted tool exactly once. */
coopWire.rungsChanged = (before: Rungs, quiet) => {
  if (quiet) {
    for (const id of ['multi', 'axe', 'pack'] as const) if (job.rung[id]) rememberGot(id);
    return;
  }
  if (!before.multi && job.rung.multi) showMultiAxe();
  for (const id of ['axe', 'pack'] as const) if (!before[id] && job.rung[id]) showChestPrize(id);
};

prizeHooks.opened = (c) => {
  playMark('crate opened', { kind: c });
  if (c === 'axe' || c === 'pack') {
    playMark('rung earned', { rung: c });
    applyRung(c);
    coop.rung(c);
  }
};
