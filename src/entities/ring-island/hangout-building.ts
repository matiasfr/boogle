import * as THREE from 'three/webgpu';
import { instantiate } from '../../prefab/instantiate.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { createGhostOutlines } from '../../render/ghost-outline.ts';
import { ringAt, RING_HANGOUT } from '../../sim/railway-ring-layout.ts';
import { frameOccupied, standWhenClear } from '../railway/frame-occupied.ts';
import { liftOrWait } from '../../prefab/instantiate.ts';
import { me } from '../../player/state.ts';
import type { IslandGround } from './ground.ts';

export const floor = RING_HANGOUT.floor / 100;
export const yaw = -Math.atan(0.0272);
export function hangoutPoint(u: number, lat: number, y: number) {
  const at = ringAt(RING_HANGOUT.u + Math.round(u * 100), RING_HANGOUT.lat + Math.round(lat * 100));
  return new THREE.Vector3(at.x / 100, floor + y, at.z / 100);
}

/** Floor, shell and exterior stairs are made from the near island's solid box kit.
 * Offsets are in the Ring frame. The longer approach meets the slope at the ramp end. */
export function createHangoutBuilding(
  owner: OwnedView,
  ground: Pick<IslandGround, 'islandH'>,
  tower: boolean,
  site = { point: hangoutPoint, floor, yaw, deck: 6, flat: false },
) {
  const records: ReturnType<typeof instantiate>[] = [];
  const cutaway = new Set<number>();
  const ghost = createGhostOutlines(owner, 2048, 0.32, 0.14, 0.09);
  const timber = '#975934',
    cream = '#f1d99c',
    teal = '#247e80';
  function box(
    id: string,
    u: number,
    l: number,
    y: number,
    length: number,
    width: number,
    height: number,
    color: string,
    hides = false,
    pitch = 0,
  ) {
    const p = site.point(u, l, y);
    const r = instantiate(
      'ring.box',
      {
        id: 'hangout.' + id,
        prefab: 'ring.box',
        pos: [p.x, p.y, p.z],
        rot: [site.yaw, pitch, 0],
        scale: [width, height, length],
        params: { color },
      },
      { owner },
    );
    r.setEnabled(false);
    records.push(r);
    if (hides) cutaway.add(records.length - 1);
    ghost.box(p.x, p.y, p.z, width, height, length, site.yaw, pitch);
  }
  box('floor', 0, 0, -0.7, 5.4, 4.4, 1.4, timber);
  box('porch', 0, 3.1, -0.15, 5.4, 1.8, 0.3, timber);
  const toe = site.point(-8, 3.1, 0);
  const rise = site.floor - ground.islandH(toe.x, toe.z);
  const run = 5.3;
  if (!site.flat)
    box(
      'approach',
      -2.7 - run / 2,
      3.1,
      -rise / 2 - 0.08,
      Math.hypot(run, rise),
      1.65,
      0.16,
      timber,
      false,
      Math.atan2(rise, run),
    );
  box('back', 0, -2.12, 1.45, 5.4, 0.16, 2.9, cream);
  for (const side of [-1, 1]) {
    box('end' + side, side * 2.62, 0, 1.45, 0.16, 4.4, 2.9, cream, true);
    box('door' + side, side * 1.88, 2.12, 1.45, 1.64, 0.16, 2.9, cream, true);
  }
  box('lintel', 0, 2.12, 2.65, 2.14, 0.16, 0.5, timber, true);
  box('roof', 0, 0, 2.98, 5.6, 4.6, 0.16, teal, true);
  for (const u of [-2.2, 2.2])
    for (const l of [-1.7, 1.7]) box('post' + u + l, u, l, 4.45, 0.22, 0.22, 2.9, timber, true);
  if (tower) {
    box('deck', 0, 0, site.deck - 0.1, 5.6, 4.6, 0.2, teal, true);
    // Four parallel flights with a shared landing between each pair.
    for (let flight = 0; flight < 4; flight++) {
      const outward = flight % 2 === 0,
        l = 2.15 - flight * 1.1;
      for (let i = 0; i < 10; i++) {
        const u = 3.32 + (outward ? i : 9 - i) * 0.32;
        box(
          'step' + flight + '-' + i,
          site.flat ? -u : u,
          l,
          ((flight + (i + 1) / 10) * site.deck) / 4 - 0.08,
          0.34,
          1.12,
          0.16,
          timber,
        );
      }
      box(
        'landing' + flight,
        (outward ? 6.76 : 2.95) * (site.flat ? -1 : 1),
        l - (flight === 3 ? 0 : 0.55),
        ((flight + 1) * site.deck) / 4 - 0.08,
        outward ? 0.82 : 0.72,
        flight === 3 ? 1.12 : 2.22,
        0.16,
        teal,
      );
    }
    box('foot', site.flat ? -2.95 : 2.95, 2.4, -0.1, 0.72, 1.7, 0.2, timber);
  } else {
    box('belfry', 0, 0, 5.93, 5.0, 3.9, 0.25, teal, true);
    box('beam', 0, 0, 5.55, 0.24, 3.6, 0.26, timber, true);
  }
  // The perch's splash landing is in the same clearance-checked set as its porch.
  if (site.flat && tower) box('raft', -6.5, 30.5, 0.15 - site.floor, 2.4, 3.2, 0.32, timber);
  ghost.commit();
  ghost.mesh.visible = false;
  const poles = [-2.85, 2.85].flatMap((u) =>
    [-2.45, 2.45].map((l) => {
      const p = site.point(u, l, 2.0);
      return instantiate(
        'ring.box',
        {
          id: 'ring.scaffold.' + u + '.' + l,
          prefab: 'ring.box',
          pos: [p.x, p.y, p.z],
          rot: [site.yaw, 0, 0],
          scale: [0.12, 4.0, 0.12],
          params: { color: '#c99d62' },
        },
        { owner },
      );
    }),
  );
  const poleShapes = poles.flatMap((p) => p.solids);
  // ring.box emits mergeable pieces. The near terrain merges its permanent ones;
  // these need a single draw with independently visible construction/cutaway slots.
  const pieces = [...records, ...poles].map((record) => record.pieces[0]!);
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.88 });
  const geometry = new THREE.BoxGeometry();
  const mesh = new THREE.InstancedMesh(geometry, material, pieces.length);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  pieces.forEach((piece, i) => {
    mesh.setMatrixAt(i, piece.matrix);
    mesh.setColorAt(i, new THREE.Color(piece.color));
  });
  mesh.computeBoundingSphere();
  mesh.castShadow = mesh.receiveShadow = true;
  owner.add(mesh);
  owner.cleanup(() => {
    geometry.dispose();
    material.dispose();
  });
  mesh.visible = false;
  let insideRoom = false;
  function draw() {
    mesh.visible = count > 0 || polesUp;
    if (!mesh.visible) return;
    pieces.forEach((piece, i) => {
      const visible = i < records.length ? i < count && !(insideRoom && cutaway.has(i)) : polesUp;
      mesh.setMatrixAt(i, visible ? piece.matrix : hidden);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  for (const pole of poles) pole.setEnabled(false);
  let polesUp = false,
    count = 0;
  function construction(fraction: number) {
    const previousCount = count,
      previousPoles = polesUp;
    const wanted =
      fraction < 0 ? 0 : Math.floor(records.length * Math.max(0, Math.min(1, (fraction - 0.08) / 0.92 + 1e-9)));
    if (fraction >= 0 && fraction < 1 && !polesUp) {
      if (
        !standWhenClear(poleShapes, () => {
          for (const p of poles) p.setEnabled(true);
          polesUp = true;
        })
      )
        return false;
    }
    if (count < wanted) {
      const next = records.slice(count, wanted);
      standWhenClear(
        next.flatMap((r) => r.solids),
        () => {
          for (const r of next) r.setEnabled(true);
          count = wanted;
        },
      );
    } else if (count > wanted) {
      for (const r of records.slice(wanted, count)) r.setEnabled(false);
      count = wanted;
    }
    if (
      polesUp &&
      (fraction < 0 || count === records.length) &&
      (fraction < 0 ||
        liftOrWait([{ shapes: poleShapes, on() {} }], me.body, { lift: false, occupied: frameOccupied }).kind !==
          'wait')
    ) {
      for (const p of poles) p.setEnabled(false);
      polesUp = false;
    }
    if (previousCount !== count || previousPoles !== polesUp) draw();
    return count === records.length;
  }
  return {
    construction,
    preview(on: boolean) {
      ghost.mesh.visible = on;
    },
    interior(inside: boolean) {
      if (insideRoom !== inside) {
        insideRoom = inside;
        draw();
      }
    },
  };
}
