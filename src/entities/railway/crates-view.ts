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
import {
  BOXES,
  REVEAL_SHAKE,
  TIER_COLOR,
  TIER_MARKS,
  boxGift,
  cosmetic,
  crateParts,
  type GiftId,
  type Tier,
} from '../../render/cosmetic-parts.ts';
import { confettiBurst, rewardDust, rewardSparkles } from '../../render/reward-particles.ts';
import { placeSound } from '../../render/place-sfx.ts';
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
      import('../../proto/place/part-geometry.ts'),
      import('../../proto/place/look.ts'),
      import('../../proto/minis/common.ts'),
      import('../../proto/place/layout.ts'),
      import('../../proto/place/land.ts'),
      import('../../proto/place/rail.ts'),
      import('../../proto/place/pieces.ts'),
      import('../../proto/place/spatial-station.ts'),
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

  // The show: one box at a time, as Place's. Boards fly, a flash and a shaft of light; then the card.
  const boardMaterial = new THREE.MeshStandardNodeMaterial({ color: '#b57f44', roughness: 0.9 });
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(0.72, 0.07, 0.22), boardMaterial, 14);
  boards.count = 0;
  boards.frustumCulled = false;
  boards.castShadow = true;
  const flashGlow = softGlow('#fff0c0', 1);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), flashGlow.mat);
  const shaftGlow = softGlow('#ffe08a', 0.8, true);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 2.1, 40, 14, 1, true).translate(0, 20, 0),
    shaftGlow.mat,
  );
  flash.visible = shaft.visible = false;
  root.add(boards, flash, shaft);
  const boardPose = new THREE.Object3D();
  const flying: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    a: number;
    va: number;
    t: number;
  }[] = [];
  let show: { box: Box; id: GiftId; tier: Tier; t: number; boomed: boolean; carded: boolean } | null = null;
  let flare = 0;
  let opened = 0;

  const completion = (box: Box) => {
    const s = adapter.inspect();
    return box.spec.line === 0
      ? (s.stations[box.spec.station]?.completion ?? 0)
      : (s.line2.stations[box.spec.station]?.completion ?? 0);
  };
  /** Waiting for you: its stretch is laid and you haven't opened it (or it's rattling now). */
  const waiting = (box: Box) => {
    const mine = wardrobe();
    if (!mine || !adapter.inspect().ready || !completion(box)) return false;
    return !mine.isOpened(box.spec.id) || (show?.box === box && !show.boomed);
  };
  const ready = (box: Box) => box.mesh.visible && box.flight === 1 && !show;

  function open(box: Box) {
    const mine = wardrobe();
    if (!mine || show || !ready(box) || mine.isOpened(box.spec.id)) return;
    const { got, dry } = mine.inspect();
    const id = boxGift(2 + mine.boxesOpened(), box.spec.tier, got, dry);
    const gift = id ? cosmetic(id) : undefined;
    // Saved before the show: a reload mid-reveal keeps what you got and can't roll it again.
    if (!mine.openBox(box.spec.id, gift ? id : null, gift?.tier === 'wonder')) return;
    playMark('crate opened', { id: box.spec.id, gift: id ?? 'nothing' });
    opened++;
    if (!id || !gift) return; // nothing left to give: the box just goes
    show = { box, id, tier: gift.tier ?? 'common', t: 0, boomed: false, carded: false };
  }

  function boom(s: NonNullable<typeof show>) {
    const { at } = s.box;
    s.boomed = true;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2,
        speed = 3 + Math.random() * 3.5;
      flying[k] = {
        x: at.x,
        y: at.y + 0.5,
        z: at.z,
        vx: Math.cos(a) * speed,
        vy: 4 + Math.random() * 5,
        vz: Math.sin(a) * speed,
        a: Math.random() * 6,
        va: 6 + Math.random() * 9,
        t: 0,
      };
    }
    confettiBurst(at.x, at.y + 0.8, at.z);
    rewardSparkles(at.x, at.y + 0.8, at.z, 34, 6);
    rewardDust(at.x, at.y + 0.1, at.z);
    placeSound(s.tier === 'wonder' ? 'boxWonder' : s.tier === 'rare' ? 'boxRare' : 'boxCommon', at.x, at.z);
    flash.position.copy(at).y += 0.9;
    shaft.position.copy(at);
    const gift = cosmetic(s.id)!;
    youGot({
      name: gift.name,
      line: gift.line,
      rarity: TIER_MARKS[s.tier],
      color: TIER_COLOR[s.tier],
      model: new THREE.Mesh(giftGeo(s.id), material),
      from: at.clone().setY(at.y + 0.9),
      done: () => {
        // Put away: on you if its slot's empty, and on the shelf.
        wardrobe()?.unbox(s.id);
        if (show === s) show = null;
      },
    });
  }

  function updateShow(dt: number) {
    const s = show;
    if (!s || s.carded) return;
    s.t += dt;
    const shake = REVEAL_SHAKE[s.tier];
    const { mesh } = s.box;
    if (!s.boomed) {
      const w = Math.sin(s.t * 60) * 0.06 * (0.4 + s.t / shake);
      mesh.rotation.set(w, 0, -w);
      mesh.scale.setScalar(1 + (s.t / shake) * 0.14);
      if (s.t >= shake) boom(s);
      return;
    }
    const u = s.t - shake,
      fb = Math.min(1, u / 0.42),
      fs = Math.min(1, u / 0.8);
    flash.visible = fb < 1;
    flash.scale.setScalar(0.6 + fb * 6);
    flashGlow.strength.value = (1 - fb) * 1.1;
    shaft.visible = fs < 1;
    shaft.scale.set(1 + fs * 0.3, 1, 1 + fs * 0.3);
    shaftGlow.strength.value = 0.7 * (1 - fs * fs);
    if (fb >= 1 && fs >= 1) s.carded = true; // the card has it now
  }

  function updateBoards(dt: number) {
    for (let i = 0; i < flying.length; i++) {
      const f = flying[i]!;
      f.t += dt;
      f.vy -= 14 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.z += f.vz * dt;
      f.a += f.va * dt;
      const floor = H(f.x, f.z) + 0.05;
      if (f.y < floor) {
        f.y = floor;
        f.vy *= -0.3;
        f.vx *= 0.6;
        f.vz *= 0.6;
        f.va *= 0.5;
      }
      boardPose.position.set(f.x, f.y, f.z);
      boardPose.rotation.set(f.a, f.a * 0.6, 0);
      boardPose.updateMatrix();
      boards.setMatrixAt(i, boardPose.matrix);
    }
    if (flying[0] && flying[0].t > 2.4) flying.length = 0;
    boards.count = flying.length;
    if (boards.count) boards.instanceMatrix.needsUpdate = true;
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
      const state = adapter.inspect();
      flare = Math.max(0, flare - dt / 1.6);
      const p = me.body?.position;
      for (const box of boxes) {
        // Laid while you watched: the machine hands it down from its flatbed, as Place's handCrate did.
        if (state.ready) {
          const c = completion(box);
          if (box.previous === 0 && c && machineFrom && !wardrobe()?.isOpened(box.spec.id)) {
            machineFrom(box.from);
            box.flight = 0;
          }
          box.previous = c;
        }
        const was = box.mesh.visible;
        box.mesh.visible = waiting(box);
        box.beam.visible = box.mesh.visible && !show?.boomed && show?.box !== box;
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
        if (show?.box === box) continue;
        box.mesh.position.copy(box.at).y += Math.max(0, Math.sin(now * 0.004)) * 0.06;
        box.mesh.rotation.set(0, 0, Math.sin(now * 0.0035) * 0.02);
        if (Math.random() < dt * 3) rewardSparkles(box.at.x, box.at.y + 1.2, box.at.z, 1, 1.2);
        // Walking into it opens it; one up on a ledge isn't in reach from under it.
        if (p && ready(box) && Math.abs(p.y - box.at.y) <= 2.6 && Math.hypot(p.x - box.at.x, p.z - box.at.z) < BUMP)
          open(box);
      }
      for (const t of tiers) glow[t].strength.value = GLOW_BASE[t] + flare * flare * 0.4;
      updateShow(dt);
      updateBoards(dt);
    },
    inspect: () => {
      const mine = wardrobe();
      return {
        opened,
        showing: show?.id ?? null,
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
    for (const g of [...Object.values(crateGeo), ...giftGeos.values(), beamGeo, boards.geometry]) g.dispose();
    for (const g of [flash.geometry, shaft.geometry]) g.dispose();
    for (const m of [material, boardMaterial, flashGlow.mat, shaftGlow.mat, ...tiers.map((t) => glow[t].mat)])
      m.dispose();
    boards.dispose();
  });
  return api;
}
