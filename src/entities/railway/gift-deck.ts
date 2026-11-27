// Presentation of the gifted part of a kit car's load.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { commitPieces } from '../../render/haul-pieces.ts';
import { logStackMesh, setStackLog, stackSlot, send } from '../../place/pieces.ts';
import { legKitHalt, legKitDrop, legRow, legsServed } from '../../sim/railway-queries-route.ts';
import { RAIL_LEGS, legFrame } from '../../sim/railway-route.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import type { ReadWorld } from '../../sim/railway-rows.ts';
import { TRAIN_PHASE, type RailTrain } from '../../sim/railway-train.ts';
import { reducedMotion } from '../../constants.ts';

// While a poured log is in flight, its bill still shows the previous count.
export const pourFlights = RAIL_LEGS.map((): (() => boolean)[] => []);
export function giftBundle(owner: OwnedView, lashMaterial: THREE.Material) {
  const bundle = new THREE.Group();
  const timber = logStackMesh(3, owner);
  const logAt = new THREE.Vector3();
  for (let i = 0; i < 3; i++) {
    stackSlot(i, 2, new THREE.Vector3(), Math.PI / 2, logAt);
    setStackLog(timber, i, logAt, Math.PI / 2);
  }
  commitPieces(timber, 3);
  bundle.add(timber);
  for (const z of [-0.4, 0.4]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.66, 0.09), lashMaterial);
    band.position.set(0, 0.33, z);
    owner.add(band);
    bundle.add(band);
  }
  bundle.visible = false;
  return bundle;
}
export function giftTrip(
  owner: OwnedView,
  w: ReadWorld,
  line: number,
  row: RailTrain,
  delta: number,
  bundle: THREE.Group,
  homeLogBin: THREE.Vector3,
) {
  if (delta && row.phase === TRAIN_PHASE.STAND && !reducedMotion) {
    const deck = bundle.getWorldPosition(new THREE.Vector3());
    let from = homeLogBin,
      to = deck;
    const k =
      delta < 0
        ? legsServed(w, line).find((i) => RAIL_LEGS[i]!.line === line && legKitDrop(w, line, i) === row.at)
        : undefined;
    if (k !== undefined) {
      const frame = legFrame(RAIL_LEGS[k]!, legRow(w, k).laid);
      from = deck;
      to = new THREE.Vector3(frame.x / 100, frame.y / 100 + 1, frame.z / 100);
    }
    if (k !== undefined || (delta > 0 && line === LINE2 && row.at === legKitHalt(line))) {
      for (let i = 0; i < Math.abs(delta); i++) {
        const active = send('log', from, to, { dur: 0.6, delay: i * 0.025, apex: 3 }, owner);
        if (k !== undefined) pourFlights[k]!.push(active);
      }
    }
  }
}
