// Station boxes after the scarf (docs/plans/place-retirement.md, C1; docs/game-design/place.md, "Station boxes"): every
// stretch whose catalog row hands a crate down (Q2–Q6, as in Place) leaves one personal box beside its frame once it's
// laid. Eligibility is the server's accepted completion; what's in it is each player's own roll (owner question 3:
// different boxes for each friend), Personal Local in the wardrobe (../wardrobe/state.ts: `opened`, `dry`), recorded
// before the reveal. Late joiners and reloads find a box for every completion already reached and not yet opened.
// Walk into it (1.25 m, as Place) or press Open; the card goes through the railway's one reveal queue. Local only.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { playMark } from '../../proto/mark.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Got } from '../../render/reward-reveal.ts';
import { BOXES, boxGift, cosmetic, crateParts, type GiftId, type Tier } from '../../render/cosmetic-parts.ts';
import { createCrateShow } from '../../render/crate-show.ts';
import { job, qjob } from '../../sim/railway-rows.ts';
import { rewardSparkles } from '../../render/reward-particles.ts';
import { thump } from '../../render/machine-sfx.ts';
import { LINE1_STATIONS } from '../../sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../../sim/railway-line2-layout.ts';
import { wardrobe } from '../wardrobe/state.ts';
import { inReach } from './tools.ts';

/** Every stretch that hands a crate down, in order; each one's place in BOXES sets its tier. T1 and T2 are the
 * hat and scarf, reward.ts's claims, so the boxes here start at the third. */
export const STATION_BOXES = [
  ...LINE1_STATIONS.map((s, station) => ({ id: s.id as string, line: 0 as const, station, crate: s.crate })),
  ...LINE2_STATIONS.map((s, station) => ({ id: s.id as string, line: 1 as const, station, crate: s.crate })),
]
  .filter((s) => s.crate)
  .map(({ id, line, station }, k) => ({ id, line, station, tier: BOXES[Math.min(BOXES.length - 1, k)]! }))
  .slice(2);
const BUMP = 1.25;

type Seat = typeof import('./reward.ts').rewardSeat;

export async function createStationBoxes(
  adapter: RailwayAdapter,
  owner: OwnedView,
  youGot: (g: Got) => boolean,
  rewardSeat: Seat,
  machineFrom?: (out: THREE.Vector3) => void,
) {
  const [{ merged }, { softGlow }, { pop, knock }, { LINKS, railY }, { H }, { besideLine }, { dustRing }, { OUT }] =
    await Promise.all([
      import('../../render/part-geometry.ts'),
      import('../../place/look.ts'),
      import('../../render/fanfare.ts'),
      import('../../place/layout.ts'),
      import('../../place/land.ts'),
      import('./rail-kit.ts'),
      import('../../place/pieces.ts'),
      import('../../place/spatial-station.ts'),
    ]);
  const root = new THREE.Group();
  owner.root.add(root);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
  const tiers: Tier[] = ['common', 'rare', 'wonder'];
  const crateGeo = Object.fromEntries(tiers.map((t) => [t, merged(crateParts(t))])) as Record<
    Tier,
    THREE.BufferGeometry
  >;
  // A lid-height glimmer keeps a waiting box findable without drawing columns across the skyline (Place's).
  const glow = Object.fromEntries(
    tiers.map((t) => {
      const g = softGlow(t === 'wonder' ? '#ffb52e' : t === 'rare' ? '#4fa8ff' : '#ffe9b0', 0.16, 'up');
      g.mat.blending = THREE.NormalBlending;
      return [t, g];
    }),
  ) as Record<Tier, ReturnType<typeof softGlow>>;
  const GLOW_BASE: Record<Tier, number> = { common: 0.16, rare: 0.2, wonder: 0.24 };
  const beamGeo = new THREE.CylinderGeometry(0.38, 0.85, 1.8, 12, 1, true).translate(0, 2.2, 0);
  const giftGeos = new Map<GiftId, THREE.BufferGeometry>();
  const giftGeo = (id: GiftId) => {
    let g = giftGeos.get(id);
    if (!g) giftGeos.set(id, (g = merged(cosmetic(id)!.parts)));
    return g;
  };

  const boxes = STATION_BOXES.map((spec) => {
    // Line two's boxes stand across the track: the frame's own side has its depot rack, whose Take a box's Open
    // would otherwise beat (place-retirement C1, as built).
    const at = rewardSeat(LINKS[spec.line]!, besideLine, H, railY, OUT, spec.station, spec.line === 1);
    const mesh = new THREE.Mesh(crateGeo[spec.tier], material);
    mesh.castShadow = true;
    const beam = new THREE.Mesh(beamGeo, glow[spec.tier].mat);
    mesh.position.copy(at);
    beam.position.copy(at);
    mesh.visible = beam.visible = false;
    root.add(mesh, beam);
    return { spec, at, mesh, beam, from: at.clone(), flight: 1, previous: -1, target: at.clone().setY(at.y + 1.5) };
  });
  type Box = (typeof boxes)[number];

  // The show: one box at a time, as Place's (../../render/crate-show.ts, shared with the secret boxes).
  const show = createCrateShow(root, { floor: H, softGlow, youGot });
  let showing: GiftId | null = null;
  let flare = 0;
  let opened = 0;

  const completion = (box: Box) => {
    const w = adapter.read.world();
    return box.spec.line === 0 ? job(w, box.spec.station).completion : qjob(w, box.spec.station).completion;
  };
  /** Waiting for you: its stretch is laid and you haven't opened it (or it's rattling now). */
  const waiting = (box: Box) => {
    const mine = wardrobe();
    if (!mine || !adapter.read.ready() || !completion(box)) return false;
    return !mine.isOpened(box.spec.id) || (show.opening() === box.mesh && !show.burst());
  };
  const ready = (box: Box) => box.mesh.visible && box.flight === 1 && !show.busy();

  function open(box: Box) {
    const mine = wardrobe();
    if (!mine || show.busy() || !ready(box) || mine.isOpened(box.spec.id)) return;
    const { got, dry } = mine.inspect();
    const id = boxGift(2 + mine.boxesOpened(), box.spec.tier, got, dry);
    const gift = id ? cosmetic(id) : undefined;
    // Saved before the show: a reload mid-reveal keeps what you got and can't roll it again.
    if (!mine.openBox(box.spec.id, gift ? id : null, gift?.tier === 'wonder')) return;
    playMark('crate opened', { id: box.spec.id, gift: id ?? 'nothing' });
    opened++;
    if (!id || !gift) return; // nothing left to give: the box just goes
    showing = id;
    show.open({
      mesh: box.mesh,
      at: box.at,
      tier: gift.tier ?? 'common',
      name: gift.name,
      line: gift.line,
      model: new THREE.Mesh(giftGeo(id), material),
      done: () => {
        // Put away: on you if its slot's empty, and on the shelf.
        wardrobe()?.unbox(id);
        showing = null;
      },
    });
  }

  const api = {
    targets(): Interactable[] {
      let out: Interactable[] | null = null;
      for (const box of boxes)
        if (ready(box) && inReach(box.at))
          (out ??= []).push({
            id: `railway-${box.spec.id.toLowerCase()}-box`,
            verb: 'Open the crate',
            at: box.target,
            r: 3.4,
            run: () => open(box),
          });
      return out ?? NO_TARGETS;
    },
    update(dt: number, now: number) {
      flare = Math.max(0, flare - dt / 1.6);
      const p = me.body?.position;
      for (const box of boxes) {
        // Laid while you watched: the machine hands it down from its flatbed, as Place's handCrate did.
        if (adapter.read.ready()) {
          const c = completion(box);
          if (box.previous === 0 && c && machineFrom && !wardrobe()?.isOpened(box.spec.id)) {
            machineFrom(box.from);
            box.flight = 0;
          }
          box.previous = c;
        }
        const was = box.mesh.visible;
        box.mesh.visible = waiting(box);
        box.beam.visible = box.mesh.visible && !show.burst() && show.opening() !== box.mesh;
        if (!box.mesh.visible) continue;
        if (!was) box.mesh.scale.setScalar(1);
        if (box.flight < 1) {
          box.flight = Math.min(1, box.flight + dt / 0.7);
          box.mesh.position.lerpVectors(box.from, box.at, box.flight);
          box.mesh.position.y += Math.sin(box.flight * Math.PI) * 2.4;
          box.mesh.rotation.x = (1 - box.flight) * 3;
          if (box.flight === 1) {
            flare = 1;
            thump(box.at.x, box.at.z);
            knock(0.5, 0.9);
            dustRing(box.at.x, box.at.y + 0.1, box.at.z, 10, 2.4, 0.4);
            rewardSparkles(box.at.x, box.at.y + 0.6, box.at.z, 18, 3.4);
            pop(4, 0.6);
            box.mesh.rotation.x = 0;
          }
          continue;
        }
        if (show.opening() === box.mesh) continue;
        box.mesh.position.copy(box.at).y += Math.max(0, Math.sin(now * 0.004)) * 0.06;
        box.mesh.rotation.set(0, 0, Math.sin(now * 0.0035) * 0.02);
        if (Math.random() < dt * 3) rewardSparkles(box.at.x, box.at.y + 1.2, box.at.z, 1, 1.2);
        // Walking into it opens it; one up on a ledge isn't in reach from under it.
        if (p && ready(box) && Math.abs(p.y - box.at.y) <= 2.6 && Math.hypot(p.x - box.at.x, p.z - box.at.z) < BUMP)
          open(box);
      }
      for (const t of tiers) glow[t].strength.value = GLOW_BASE[t] + flare * flare * 0.4;
      show.update(dt);
    },
    inspect: () => {
      const mine = wardrobe();
      return {
        opened,
        showing,
        boxes: boxes.map((box) => ({
          station: box.spec.id,
          tier: box.spec.tier,
          visible: box.mesh.visible,
          opened: !!mine?.isOpened(box.spec.id),
          x: box.at.x,
          y: box.at.y,
          z: box.at.z,
        })),
      };
    },
  };
  owner.cleanup(() => {
    root.removeFromParent();
    show.dispose();
    for (const g of [...Object.values(crateGeo), ...giftGeos.values(), beamGeo]) g.dispose();
    for (const m of [material, ...tiers.map((t) => glow[t].mat)]) m.dispose();
  });
  return api;
}
