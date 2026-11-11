// Line two, part two's small Local views over accepted state (docs/plans/line2-part2-greybox.md, B2): the rails shelf
// beside a `shelf` stretch's depot rack, which the depot cart fills from the forge rack (Q4 on), and the survey stake
// where that stretch will end (Q4's at the rim). Nothing here transfers material: a take is the adapter's, shown on
// the press from the prediction and sent back on a correction.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { LINE2_STATIONS, Q7 } from '../../sim/railway-line2-layout.ts';
import { q7Spot } from './q7-site.ts';
import { stockSign } from './stock-sign.ts';
import { waitsForTrain } from './forge-offer.ts';
import { line2Active } from '../../sim/railway-queries-line2.ts';
import { freeCarryIgnoringBig } from '../../sim/railway-queries-line1.ts';
import { account, rail } from '../../sim/railway-rows.ts';

const MAX_RAILS = Math.max(...LINE2_STATIONS.map((station) => station.bill[1]));
const REACH = 3.2;

export async function createRailwayShelf(
  adapter: RailwayAdapter,
  owner: OwnedView,
  /** Where pid's carried bundle is, holding `count` (sources.ts). */
  bundleOrigin: (pid: string, count: number, out: THREE.Vector3) => boolean,
) {
  const [layout, land, pieces, flatMod, look, kit, sounds] = await Promise.all([
    import('../../place/layout.ts'),
    import('../../place/land.ts'),
    import('../../place/pieces.ts'),
    import('../../render/flat.ts'),
    import('../../place/look.ts'),
    import('../../place/look-kit.ts'),
    import('../../render/fanfare.ts'),
  ]);
  const { flat } = flatMod;
  const quarry = layout.LINKS[1]!;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // ---------------------------------------------------------------- the shelf: a low trestle, rails laid across it
  const shelf = new THREE.Group();
  owner.add(shelf);
  shelf.visible = false;
  const sign = stockSign(owner, 'rails');
  sign.board.visible = false;
  const plankGeo = new THREE.BoxGeometry(2.6, 0.12, 3.4),
    legGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16);
  geometries.push(plankGeo, legGeo);
  const wood = flat('#a98249', 0.9);
  const plank = new THREE.Mesh(plankGeo, wood);
  plank.position.y = 0.56;
  plank.castShadow = plank.receiveShadow = true;
  shelf.add(plank);
  for (const [x, z] of [
    [-1.15, -1.5],
    [1.15, -1.5],
    [-1.15, 1.5],
    [1.15, 1.5],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, wood);
    leg.position.set(x, 0.25, z);
    leg.castShadow = true;
    shelf.add(leg);
  }
  const rails = look.LOOK.kit
    ? kit.kitBatch('rail', look.STEEL, MAX_RAILS, owner)
    : new THREE.InstancedMesh(
        new THREE.BoxGeometry(pieces.RAIL_SIZE.x, pieces.RAIL_SIZE.y, pieces.RAIL_SIZE.z),
        flat('#4c5058', 0.6),
        MAX_RAILS,
      );
  // kitBatch only swaps in the kit's geometry; the shelf carries it, so its rails turn with it.
  rails.removeFromParent();
  shelf.add(rails);
  rails.castShadow = true;
  rails.frustumCulled = false;
  rails.count = 0;
  // Eight across, a second layer above: the forge rack's spacing.
  const slot = (k: number, out: THREE.Vector3) => out.set(-1 + (k % 8) * 0.285, 0.7 + Math.floor(k / 8) * 0.19, 0);
  const m4 = new THREE.Matrix4();
  const tmp = new THREE.Vector3();
  const at = new THREE.Vector3(); // the shelf's centre, on the ground
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  let drawn = '';
  /** Beside the frame's forward outer corner, clear of its posts and within the existing server pickup reach. */
  const deck = { x: 0, y: 0, z: 0, yaw: 0 };
  function place(k: number) {
    if (k === Q7) {
      // Q7's shelf stands on the Pier's piled deck (q7-site.ts), not on the ground (the sea floor there).
      q7Spot('shelf', deck);
      at.set(deck.x, deck.y, deck.z);
      shelf.position.copy(at);
      shelf.rotation.y = deck.yaw + Math.PI / 2;
      return;
    }
    const spec = LINE2_STATIONS[k]!;
    const p = layout.lineAt(quarry.line, spec.fromCm / 100 - 1.5, { x: 0, z: 0, ux: 0, uz: 1 });
    const side = quarry.stations[k]!.side;
    // Its centre is 3.36 m from the authoritative frame; even the far side of the 3.2 m prompt zone is in reach.
    at.set(spec.x / 100 + p.ux * 3 - p.uz * side * 1.5, 0, spec.z / 100 + p.uz * 3 + p.ux * side * 1.5);
    at.y = land.H(at.x, at.z);
    shelf.position.copy(at);
    shelf.rotation.y = Math.atan2(p.ux, p.uz) + Math.PI / 2;
  }
  // Station 6 before trains (waitsForTrain): its kit is the train's, so the shelf offers no take and shows no count;
  // the rack's sign shows the train (line2-view.ts).
  function draw(k: number, n: number, owed: boolean) {
    const key = `${k}:${n}:${owed}`;
    if (key === drawn) return;
    drawn = key;
    const spec = LINE2_STATIONS[k];
    shelf.visible = !!spec?.shelf;
    sign.board.visible = shelf.visible && !owed;
    if (!spec?.shelf) return;
    place(k);
    // On its own post beside the shelf's end, facing along the line toward the approach.
    sign.board.position.set(1.45, 0, 2.05).applyAxisAngle(THREE.Object3D.DEFAULT_UP, shelf.rotation.y).add(at);
    sign.board.position.y = k === Q7 ? at.y : land.H(sign.board.position.x, sign.board.position.z);
    sign.board.rotation.y = shelf.rotation.y + Math.PI / 2;
    sign.set(n);
    rails.count = Math.min(MAX_RAILS, n);
    for (let i = 0; i < rails.count; i++) rails.setMatrixAt(i, m4.makeTranslation(slot(i, tmp)));
    rails.instanceMatrix.needsUpdate = true;
  }
  /** World position of the top rail on the shelf (where a take flies from). */
  const top = (n: number, out: THREE.Vector3) => shelf.localToWorld(slot(Math.max(0, n - 1), out));

  // ---------------------------------------------------------------- the survey stake at the stretch's far end
  const stakeGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6),
    flagGeo = new THREE.BoxGeometry(0.04, 0.5, 0.8);
  geometries.push(stakeGeo, flagGeo);
  const teal = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: '#39e6c6' }));
  materials.push(teal);
  const stake = new THREE.Mesh(stakeGeo, flat('#e6dcc4', 0.9));
  stake.castShadow = true;
  const flag = new THREE.Mesh(flagGeo, teal);
  flag.position.set(0, 1.3, 0.42);
  stake.add(flag);
  owner.add(stake);
  stake.visible = false;
  let staked = -1;
  function drawStake(k: number) {
    const spec = LINE2_STATIONS[k];
    stake.visible = !!spec?.shelf;
    if (!spec?.shelf || staked === k) return;
    staked = k;
    if (k === Q7) {
      q7Spot('stake', deck);
      stake.position.set(deck.x, deck.y + 1.5, deck.z);
      return;
    }
    // A metre off the end of the stretch, on the frame's side, so the laying machine never runs into it.
    const p = layout.lineAt(quarry.line, spec.toCm / 100, { x: 0, z: 0, ux: 0, uz: 1 });
    const side = quarry.stations[k]?.side ?? -1;
    const x = p.x + layout.ORIGIN.x - p.uz * side * 3.2,
      z = p.z + p.ux * side * 3.2;
    stake.position.set(x, land.H(x, z) + 1.5, z);
  }

  // ---------------------------------------------------------------- effects: on the press (predicted), returns
  function accepted(event: RailwayAccepted) {
    if (event.op !== 'rail.depotRailTake') return;
    const w = adapter.read.world();
    const depotRails = rail(w).depotRails,
      carried = account(w, adapter.read.pid)?.rails ?? 0;
    const n = event.accepted - (event.returned ?? 0);
    for (let i = 0; i < n; i++) {
      top(depotRails + n - i, from);
      pieces.send(
        'rail',
        from,
        from,
        {
          dur: 0.3,
          apex: 0.9,
          aim: (out) => void bundleOrigin(event.pid, carried, out),
          land: () => sounds.pop(3, 0.4),
        },
        owner,
      );
    }
  }
  function corrected(c: RailwayCorrection) {
    if (c.event.op !== 'rail.depotRailTake') return;
    const w = adapter.read.world();
    const k = line2Active(w);
    if (k < 0) return;
    place(k);
    const carried = account(w, adapter.read.pid)?.rails ?? 0,
      depotRails = rail(w).depotRails;
    for (let i = 0; i < c.lost; i++) {
      if (!bundleOrigin(adapter.read.pid, carried + c.lost - i - 1, from)) continue;
      top(depotRails + i + 1, to);
      pieces.send('rail', from, to.clone(), { dur: 0.3, apex: 0.8, land: () => sounds.knock(0.3, 0.6) }, owner);
    }
  }
  const offAccepted = adapter.onAccepted(accepted);
  const offCorrected = adapter.onCorrected(corrected);
  owner.cleanup(() => {
    offAccepted();
    offCorrected();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  });

  let inFlight = () => ({ rails: 0 });
  return {
    railSlot(k: number, n: number, out: THREE.Vector3) {
      place(k);
      shelf.updateMatrixWorld(true);
      return shelf.localToWorld(slot(n, out));
    },
    /** Rails the cart is heaving onto the shelf (cart-view.ts): shown once they land. */
    holdRails(fn: () => { rails: number }) {
      inFlight = fn;
    },
    update() {
      const w = adapter.read.world();
      const k = line2Active(w);
      draw(k, k >= 0 ? Math.max(0, rail(w).depotRails - inFlight().rails) : 0, waitsForTrain(w, k));
      drawStake(k);
    },
    targets(): Interactable[] {
      const w = adapter.read.world(),
        p = me.body?.position;
      const k = line2Active(w);
      if (!adapter.read.ready() || !p || k < 0 || !LINE2_STATIONS[k]!.shelf || rail(w).depotRails <= 0) return [];
      if (waitsForTrain(w, k)) return [];
      place(k);
      if (Math.hypot(p.x - at.x, p.z - at.z) > REACH) return [];
      return [
        {
          id: 'railway-depot-rails',
          verb: 'Take rails',
          at: at.clone().setY(at.y + 1.4),
          run: () => void adapter.depotRailTake(),
          ...(freeCarryIgnoringBig(w, adapter.read.pid) <= 0 ? { blocked: 'Your back is full' } : {}),
        },
      ];
    },
    inspect: () => {
      const k = line2Active(adapter.read.world());
      if (k >= 0 && LINE2_STATIONS[k]!.shelf) place(k);
      return {
        shelf: shelf.visible ? { x: at.x, y: at.y, z: at.z, shown: rails.count } : null,
        stake: stake.visible ? { x: stake.position.x, y: stake.position.y, z: stake.position.z } : null,
      };
    },
  };
}
export type RailwayShelf = Awaited<ReturnType<typeof createRailwayShelf>>;
