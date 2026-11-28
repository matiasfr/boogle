// Presentation of the gifted part of a kit car's load.
import * as THREE from 'three/webgpu';
import { material } from '../../render/materials.ts';
import { WORKS_KILN } from '../../sim/railway-works-layout.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { commitPieces } from '../../render/haul-pieces.ts';
import { logStackMesh, setStackLog, stackSlot, send } from '../../place/pieces.ts';
import { giftAtFrame, legKitHalt, legKitDrop, legRow, legsServed } from '../../sim/railway-queries-route.ts';
import { RAIL_LEGS, legFrame } from '../../sim/railway-route.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import type { ReadWorld } from '../../sim/railway-rows.ts';
import { TRAIN_PHASE, type RailTrain } from '../../sim/railway-train.ts';
import { reducedMotion } from '../../constants.ts';
import { RING_STEEL_WORKS } from '../../sim/railway-ring-layout.ts';

import { LINE2_STATIONS } from '../../sim/railway-line2-layout.ts';

export function workGiftTrip(
  owner: OwnedView,
  row: RailTrain,
  delta: number,
  stone: boolean,
  casting: boolean,
  bundle: THREE.Group,
  home: THREE.Vector3,
  quarry: () => THREE.Vector3,
  depot: (k: number, out: THREE.Vector3) => THREE.Vector3,
) {
  if (
    row.phase !== TRAIN_PHASE.STAND ||
    reducedMotion ||
    (delta > 0 && row.at !== 0 && !(row.at === 1 && row.workStop === 3))
  )
    return;
  const deck = bundle.getWorldPosition(new THREE.Vector3());
  const rack =
    row.at === 0
      ? home
      : row.at === 1
        ? casting
          ? new THREE.Vector3(WORKS_KILN.x / 100, WORKS_KILN.y / 100 + 1, WORKS_KILN.z / 100)
          : quarry()
        : row.at === 5
          ? new THREE.Vector3(RING_STEEL_WORKS.x / 100, RING_STEEL_WORKS.y / 100 + 1, RING_STEEL_WORKS.z / 100)
          : depot(row.at + 3, new THREE.Vector3());
  if (row.at === 2 || row.at === 3) {
    const frame = LINE2_STATIONS[row.at + 3]!;
    rack.x = frame.x / 100;
    rack.z = frame.z / 100;
  }
  for (let i = 0; i < Math.abs(delta); i++)
    send(
      stone ? 'stone' : 'log',
      delta > 0 ? rack : deck,
      delta > 0 ? deck : rack,
      { dur: 0.6, delay: i * 0.025, apex: 3 },
      owner,
    );
}

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
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.22), material('stone'), 3);
  const position = new THREE.Matrix4();
  for (let i = 0; i < 3; i++) stones.setMatrixAt(i, position.makeTranslation((i - 1) * 0.22, 0.2, (i % 2) * 0.19));
  stones.visible = false;
  owner.add(stones);
  bundle.add(stones);
  bundle.visible = false;
  return { bundle, timber, stones };
}
export function giftTrip(
  owner: OwnedView,
  w: ReadWorld,
  line: number,
  row: RailTrain,
  delta: number,
  bundle: THREE.Group,
  homeLogBin: THREE.Vector3,
  flights: readonly { poured: (() => boolean)[] }[],
  kind: 'log' | 'rail' = 'log',
) {
  if (delta && row.phase === TRAIN_PHASE.STAND && !reducedMotion) {
    const deck = bundle.getWorldPosition(new THREE.Vector3());
    let from = homeLogBin,
      to = deck;
    const k =
      delta < 0
        ? legsServed(w, line).find((i) => giftAtFrame(w, line, i) && legKitDrop(w, line, i) === row.at)
        : undefined;
    if (k !== undefined) {
      const frame = legFrame(RAIL_LEGS[k]!, legRow(w, k).laid);
      from = deck;
      to = new THREE.Vector3(frame.x / 100, frame.y / 100 + 1, frame.z / 100);
    }
    if (k !== undefined || (delta > 0 && line === LINE2 && row.at === legKitHalt(line))) {
      for (let i = 0; i < Math.abs(delta); i++) {
        const active = send(kind, from, to, { dur: 0.6, delay: i * 0.025, apex: 3 }, owner);
        if (k !== undefined) flights[k]!.poured.push(active);
      }
    }
  }
}
