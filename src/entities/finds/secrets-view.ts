// The secrets on the production railway (docs/plans/place-retirement.md, F2; docs/game-design/place.md, "Secrets" and
// "Secrets in the live game"): ported from Place's tech.ts "what's hidden" and the data in tech-layout.ts (SECRETS).
// Each is a box with a cosmetic only it gives, on a path you've walked, with something that makes you look twice. Walk
// into it (1.25 m) or Open it, and its show and card are the station boxes' (../../render/crate-show.ts, the railway's
// one reveal queue); the gift goes into your wardrobe at once (`wardrobe.grant`), and on you if its slot's empty when
// you put the card away. Once you've gone on past one, its box turns up at the finders' bay too (`hubbed`), and opening
// either takes the other. The designer fit check (docs/agent-calls.md, 9 November) set what's here: nine of Place's ten
// (the jump course's "block" waits for job E); the two glide-only ones (the village balcony, Far Head's sea stack)
// wait at the bay only at the end of the run; in the world the balcony's stands once the room has the glider, the stack's
// always (a drop from stack-return reaches it, an accepted sequence break); each goes to the bay
// in the order production's abilities really come (`passed`). Hook and jump secrets are reached with production's
// abilities: their rings are the hook view's side rings (../railway/hook-path.ts HOOK_SIDE).
// What you've found and what's at the bay are ./state.ts's (Personal Local, written the moment it happens). Everything
// here is Local presentation: the ground, the boxes, their show and the clues are one merged mesh and three instanced
// ones. The cards are name-only: Place's secret gifts have no line.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { inReach } from '../../player/reach.ts';
import { playMark } from '../../proto/mark.ts';
import { getAudio } from '../../render/audio.ts';
import { cosmetic, crateParts, type GiftId, type Part, type Tier } from '../../render/cosmetic-parts.ts';
import { createCrateShow } from '../../render/crate-show.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { rewardSparkles } from '../../render/reward-particles.ts';
import { railwayWorldRead, railwayYouGot } from '../railway/state.ts';
import { rail } from '../../sim/railway-rows.ts';
import { line2Completed, line2Trains } from '../../sim/railway-queries-line2.ts';
import { pierLaid } from '../../sim/railway-line2-layout.ts';
import { townShelf } from '../town/state.ts';
import { wardrobe } from '../wardrobe/state.ts';
import type { FindsApi, FindsViewInspection } from './state.ts';

const STONE = '#917b5e',
  STONE2 = '#b6a080',
  BRASS = '#c79a3e';
// Both only up at the box's level: one on a ledge isn't in reach from the ground under it (src/player/reach.ts).
const BUMP = 1.25, // m: walking into a box opens it (Place's)
  REACH = 3.4, // m: Open the crate
  SPARKLE_NEAR = 60;
const TIERS: Tier[] = ['common', 'rare', 'wonder'];

export async function createSecretsView(owner: OwnedView, store: FindsApi) {
  const [tech, { ORIGIN }, { H, addStatic }, { merged }, { softGlow }] = await Promise.all([
    import('../../place/tech-layout.ts'),
    import('../../place/layout.ts'),
    import('../../place/land.ts'),
    import('../../render/part-geometry.ts'),
    import('../../place/look.ts'),
  ]);
  const { padById } = tech;
  // The jump course's cap ("block") moves to job E with the double jump's course (designer fit check, 9 November).
  // The tower's first box stands on t0's east edge, not its north one: that's where you walk off back down to p2, and
  // its plinth stood in the way (builder default, F2; docs/agent-calls.md). Both of t0's pulls leave from the west.
  const SECRETS = tech.SECRETS.filter((s) => s.id !== 'block').map((s) =>
    s.id === 'firstpull' ? { ...s, x: tech.padById('t0').x + 2.1, z: tech.padById('t0').z } : s,
  );
  const ox = ORIGIN.x;
  const root = new THREE.Group();
  root.name = 'secrets';
  owner.root.add(root);
  const yOf = (s: (typeof SECRETS)[number]) => (s.y === null ? H(s.x + ox, s.z) : s.y);

  // ---------------------------------------------------------------- the ground they stand on, and the clues
  // One merged mesh: the lookout's shelf, the loft's rock under its slab, the balcony's column and the sea stack, the
  // tower boxes' plinths, and each clue. Solid where it looks solid (Place's buildPads, buildChestStands, buildClues).
  // Not Place's jump course (job E) or its Far Head glide pad and ramp (cut: glider B's device is on Needle Bell).
  const parts: THREE.BufferGeometry[] = [];
  const m4 = new THREE.Matrix4(),
    q4 = new THREE.Quaternion(),
    one = new THREE.Vector3(1, 1, 1);
  /** Pale landing cap, warm stone body and four brass corner keys (Place's stonePad), centred on the origin. */
  const stonePad = (hx: number, hz: number, thick: number): Part[] => {
    const out: Part[] = [
      ['b', 0, -0.08, 0, hx * 2, thick - 0.16, hz * 2, STONE],
      ['b', 0, thick / 2 - 0.08, 0, hx * 2, 0.16, hz * 2, '#c6b28d'],
      ['b', 0, -thick / 2 + 0.06, 0, hx * 2 + 0.04, 0.12, hz * 2 + 0.04, '#6f604b'],
    ];
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) out.push(['b', sx * (hx - 0.34), -0.02, sz * hz, 0.18, thick - 0.24, 0.045, BRASS]);
    return out;
  };
  const put = (p: Part[], at: THREE.Vector3, q = q4.identity()) =>
    parts.push(merged(p).applyMatrix4(m4.compose(at, q, one)));
  const v = new THREE.Vector3();
  const THICK = 1.2;
  // The ledges no ring serves (the lookout's, the balcony's, the stack's): Place's pads, stone 1.2 m or wood 0.4 m.
  const lookout = padById('lookout'),
    balcony = padById('balcony'),
    stack = padById('stack');
  for (const b of [lookout, stack]) {
    put(stonePad(b.hx, b.hz, THICK), v.set(b.x + ox, b.top - THICK / 2, b.z));
    addStatic({ kind: 'box', hx: b.hx, hy: THICK / 2, hz: b.hz }, v, undefined, undefined, owner);
  }
  put(
    [['b', 0, 0, 0, balcony.hx * 2, 0.4, balcony.hz * 2, '#8a6238']],
    v.set(balcony.x + ox, balcony.top - 0.2, balcony.z),
  );
  addStatic({ kind: 'box', hx: balcony.hx, hy: 0.2, hz: balcony.hz }, v, undefined, undefined, owner);
  // Solid all the way down: what looks solid is solid.
  const block = (b: { x: number; z: number; hx: number; hz: number }, top: number) => {
    const base = H(b.x + ox, b.z) - 0.5,
      h = top - base;
    if (h <= 0) return;
    put([['b', 0, 0, 0, b.hx * 2 - 0.1, h, b.hz * 2 - 0.1, STONE]], v.set(b.x + ox, base + h / 2, b.z));
    addStatic({ kind: 'box', hx: b.hx - 0.05, hy: h / 2, hz: b.hz - 0.05 }, v, undefined, undefined, owner);
  };
  block(lookout, lookout.top - THICK);
  // The loft's rock: its slab is the hook view's (0.9 m, as every ring's slab).
  const loft = padById('loft');
  block(loft, loft.top - 0.9);
  // The balcony's column in the village and the sea stack: Place's seven-sided tapered columns.
  const column = (b: { x: number; z: number }, top: number, r0: number, r1: number) => {
    const base = Math.min(H(b.x + ox, b.z) - 0.5, top - 1),
      h = top - base;
    const g = new THREE.CylinderGeometry(r1, r0, h, 7);
    const n = g.getAttribute('position').count,
      c = new THREE.Color(STONE),
      col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g.translate(b.x + ox, base + h / 2, b.z));
    addStatic(
      { kind: 'cylinder', rTop: r1, rBottom: r0, h, segments: 7 },
      { x: b.x + ox, y: base + h / 2, z: b.z },
      undefined,
      undefined,
      owner,
    );
  };
  column(balcony, balcony.top - 0.4, 1.3, 1.1);
  column(stack, stack.top - THICK, 5.4, 3.4);
  // The tower's boxes stand a metre up on plinths.
  for (const s of SECRETS.filter((q) => q.area === 'tower')) {
    const y = yOf(s) - 0.5;
    put([['b', 0, 0, 0, 1.7, 1, 1.2, STONE2]], v.set(s.x + ox, y, s.z));
    addStatic({ kind: 'box', hx: 0.85, hy: 0.5, hz: 0.6 }, v, undefined, undefined, owner);
  }
  const prop = (p: Part[], x: number, y: number, z: number, yaw: number, solid = false) => {
    put(p, v.set(x + ox, y, z), new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw));
    if (solid)
      addStatic(
        { kind: 'box', hx: 0.15, hy: 1.2, hz: 0.15 },
        { x: x + ox, y: y + 1.2, z },
        undefined,
        undefined,
        owner,
      );
  };
  // The yard sits behind the cottage: laundry and its gift invite a detour, leaving the shore-to-town approach clear.
  // The fence keeps its opening on the east.
  const { anchor: yard, laundry, fences } = tech.YARD_DRESSING;
  const gy = H(yard.x + ox, yard.z);
  prop(
    [
      ['b', 0, 1.1, 0, 0.12, 2.2, 0.12, '#7f5630'],
      ['b', 3.2, 2.05, -0.8, 6.6, 0.03, 0.03, '#e8e0d0'],
      ['b', 1.4, 1.65, -0.4, 0.7, 0.75, 0.04, '#d8392b'],
      ['b', 2.6, 1.7, -0.7, 0.55, 0.65, 0.04, '#3f6fb0'],
      ['b', 4.0, 1.68, -1.0, 0.6, 0.7, 0.04, '#f2e6c8'],
    ],
    laundry.x,
    gy,
    laundry.z,
    laundry.yaw,
    true,
  );
  for (const { x, z, w, d } of fences) {
    put([['b', 0, 0, 0, w, 1, d, '#8a6238']], v.set(x + ox, gy + 0.5, z));
    addStatic({ kind: 'box', hx: w / 2, hy: 0.5, hz: d / 2 }, v, undefined, undefined, owner);
  }
  // The lookout: a scarf caught on a dead branch, over the shelf you'd pass under.
  prop(
    [
      ['c', 0, 1.8, 0, 0.13, 3.6, 0.13, '#5c4530'],
      ['b', 0.5, 3.1, 0, 1.1, 0.07, 0.07, '#5c4530'],
      ['b', 0.9, 2.6, 0, 0.14, 0.95, 0.03, '#5f8f3e'],
    ],
    lookout.x - 1.6,
    lookout.top,
    lookout.z + 1.6,
    0.6,
  );
  // The bell: a little bell under a bracket on the bank, under the trestle. You hear it as you cross the footbridge.
  const by = H(-36.4 + ox, -78);
  prop(
    [
      ['b', 0, 1.2, 0, 0.14, 2.4, 0.14, '#6e4c2a'],
      ['b', 0.4, 2.3, 0, 0.9, 0.1, 0.1, '#6e4c2a'],
      ['k', 0.75, 2.02, 0, 0.17, 0.34, 0.17, BRASS],
    ],
    -38.4,
    by,
    -76.5,
    0.8,
    true,
  );
  const bellAt = new THREE.Vector3(-36.4 + ox, by + 1, -78);
  // The loft: a yellow hard hat's worth of colour up on the rock.
  prop([['b', 0, 0.3, 0, 0.6, 0.6, 0.6, '#f2c81a']], loft.x + 1.5, loft.top, loft.z + 1.8, 0.3);
  // The balcony: a canopy-shaped weather vane, seen from the first steps of the game.
  prop(
    [
      ['b', 0, 2, 0, 0.1, 4, 0.1, '#3a302c'],
      ['s', 0, 4.1, 0, 1.2, 0.3, 0.46, '#2fb7a0'],
      ['b', 0, 3.8, 0, 2.4, 0.06, 0.06, BRASS],
    ],
    balcony.x - 2,
    balcony.top,
    balcony.z - 2,
    0.5,
    true,
  );
  // The stack: a bright flag, off the side of the sea trestle.
  prop(
    [
      ['b', 0, 2, 0, 0.1, 4, 0.1, '#3a302c'],
      ['b', 0.7, 3.6, 0, 1.3, 0.8, 0.04, '#f0752c'],
    ],
    stack.x + 2,
    stack.top,
    stack.z - 2,
    1,
  );
  const groundGeo = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  const partMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
  const ground = new THREE.Mesh(groundGeo, partMat);
  ground.castShadow = ground.receiveShadow = true;
  root.add(ground);

  // ---------------------------------------------------------------- the boxes
  // Three instanced meshes, one per tier, holding every waiting box: the secrets' in the world and their second boxes at
  // the bay. A box's pose is its own (the show rattles it); the meshes are refilled each frame.
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
  const crateGeo = Object.fromEntries(TIERS.map((t) => [t, merged(crateParts(t))])) as Record<
    Tier,
    THREE.BufferGeometry
  >;
  type Box = {
    id: string;
    gift: GiftId;
    tier: Tier;
    /** In the world, or its second box at the finders' bay. */
    bay: boolean;
    at: THREE.Vector3;
    pose: THREE.Object3D;
    waiting: boolean;
  };
  const boxes: Box[] = [];
  const secretOf = new Map<string, (typeof SECRETS)[number]>();
  SECRETS.forEach((s) => {
    const gift = cosmetic(s.gift);
    if (!gift) throw new Error(`secret ${s.id}: no gift ${s.gift}`);
    secretOf.set(s.id, s);
    const make = (bay: boolean, at: THREE.Vector3): Box => ({
      id: s.id,
      gift: gift.id,
      tier: gift.tier ?? 'common',
      bay,
      at,
      pose: new THREE.Object3D(),
      waiting: false,
    });
    boxes.push(make(false, new THREE.Vector3(s.x + ox, yOf(s), s.z)), make(true, new THREE.Vector3()));
  });
  const meshes: Record<Tier, THREE.InstancedMesh> = Object.fromEntries(
    TIERS.map((t) => {
      const mesh = new THREE.InstancedMesh(
        crateGeo[t],
        material,
        Math.max(1, boxes.filter((b) => b.tier === t).length),
      );
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.count = 0;
      mesh.visible = false;
      root.add(mesh);
      return [t, mesh];
    }),
  ) as Record<string, THREE.InstancedMesh>;
  // A stand-in for each tier so its material is compiled with the scene at boot (precompile switches hidden objects on).
  for (const t of TIERS) {
    const stand = new THREE.Mesh(crateGeo[t], material);
    stand.visible = false;
    root.add(stand);
  }
  const giftGeos = new Map<GiftId, THREE.BufferGeometry>();
  const giftGeo = (id: GiftId) => {
    let g = giftGeos.get(id);
    if (!g) giftGeos.set(id, (g = merged(cosmetic(id)!.parts)));
    return g;
  };
  const show = createCrateShow(root, { floor: H, softGlow, youGot: railwayYouGot });
  let opening: string | null = null;

  /** The room has the glider: the accepted `Rail.glide`, taken on Needle Bell's summit (glider B). Until then the
   * glide-only boxes stay away. */
  const glider = () => {
    const f = railwayWorldRead();
    return !!f && rail(f.world()).glide;
  };
  /** You've gone on past it (Place's `passed`), in the order production's abilities come (designer fit check, 9
   * November): the walks with the hook; the catwalk and the tower's first box with the glider; the nook and the loft
   * with trains; the lookout once the double jump is yours and the run is done (Place handed it out at the hook,
   * before you could reach it); the glide-only two at the end of the run. */
  function passed(s: (typeof SECRETS)[number]) {
    const f = railwayWorldRead();
    if (!f?.ready()) return false;
    const w = f.world(),
      row = rail(w);
    // The end of the run: the Pier laid (Q6; Ring Island's Q7 is past it, and R4a may move this).
    const ended = pierLaid(line2Completed(w));
    if (s.how === 'glide') return ended;
    if (s.how === 'jump') return row.jump && ended;
    if (s.after === 'hook') return row.hook;
    if (s.after === 'glide') return row.glide;
    return line2Trains(w);
  }
  /** Place's updateMissed: a box at the bay for each one you went on past without. Saved at once. */
  function updateMissed() {
    for (const s of SECRETS) {
      if (store.hasSecret(s.id) || store.isHubbed(s.id) || !passed(s)) continue;
      if (store.hubSecret(s.id)) playMark('secret at the hub', { id: s.id });
    }
  }

  function open(box: Box) {
    const mine = wardrobe();
    const s = secretOf.get(box.id)!;
    if (!mine || show.busy() || store.hasSecret(box.id)) return;
    const gift = cosmetic(box.gift)!;
    const hub = store.isHubbed(box.id);
    // Saved before the show: a reload mid-reveal keeps it, and neither box comes back.
    if (!store.takeSecret(box.id)) return;
    mine.grant(box.gift, { wear: false });
    // Whichever you opened, the other one's gone: it's one thing, in two places.
    playMark('secret found', { id: s.id, area: s.area, how: s.how, hub });
    chord(330, 0.45);
    opening = box.id;
    show.open({
      mesh: box.pose,
      at: box.at,
      tier: box.tier,
      name: gift.name,
      model: new THREE.Mesh(giftGeo(box.gift), material),
      done: () => {
        // Put away: on you if its slot's empty (it's on the shelf or the bay already).
        wardrobe()?.unbox(box.gift);
        if (opening === box.id) opening = null;
      },
    });
  }

  // Not the fanfare: an old bell, struck, with long overtones (Place's chord).
  function chord(rootHz: number, vol: number) {
    const au = getAudio();
    if (!au) return;
    const { ctx, out } = au;
    const t0 = ctx.currentTime + 0.01;
    [1, 2.01, 2.76, 4.07].forEach((m, k) => {
      const o = ctx.createOscillator();
      o.frequency.value = rootHz * m;
      const g = ctx.createGain();
      const peak = (vol * 0.28) / (k + 1);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4 / (k + 1));
      o.connect(g).connect(out);
      o.start(t0);
      o.stop(t0 + 2.6);
    });
  }
  // A quiet bell now and then, near where it hangs: the only thing telling you to look under the bridge.
  let bellT = 3;
  function updateBell(dt: number) {
    const b = me.body;
    if (!b || store.hasSecret('bell')) return;
    const d = Math.hypot(b.position.x - bellAt.x, b.position.y - bellAt.y, b.position.z - bellAt.z);
    if (d > 34) return;
    bellT -= dt;
    if (bellT > 0) return;
    bellT = 3.5 + Math.random() * 2;
    chord(880, 0.18 * (1 - d / 40));
  }

  function update(dt: number, now: number) {
    const shelf = townShelf();
    updateMissed();
    updateBell(dt);
    const p = me.body?.position;
    const counts: Record<Tier, number> = { common: 0, rare: 0, wonder: 0 };
    const gliding = glider();
    for (const [k, box] of boxes.entries()) {
      const rattling = show.opening() === box.pose && !show.burst();
      if (box.bay && shelf) shelf.bayPeg(SECRETS.indexOf(secretOf.get(box.id)!), box.at);
      // The stack's world box stands without the glider too: a double jump down from stack-return reaches it
      // (designer, 9 November, accepted). Its bay timing stays the glide-only end of the run (`passed`).
      const there = box.bay
        ? !!shelf && store.isHubbed(box.id)
        : gliding || box.id === 'stack' || secretOf.get(box.id)!.how !== 'glide';
      box.waiting = rattling || (!store.hasSecret(box.id) && there);
      if (!box.waiting) continue;
      if (!rattling) {
        box.pose.position.copy(box.at).y += Math.max(0, Math.sin(now * 0.004 + k)) * 0.06;
        box.pose.rotation.set(0, 0, Math.sin(now * 0.0035 + k) * 0.02);
        box.pose.scale.setScalar(1);
      } else box.pose.position.copy(box.at);
      box.pose.updateMatrix();
      meshes[box.tier].setMatrixAt(counts[box.tier]++, box.pose.matrix);
      if (rattling || !p) continue;
      const d = Math.hypot(p.x - box.at.x, p.z - box.at.z);
      if (d < SPARKLE_NEAR && Math.random() < dt * 3) rewardSparkles(box.at.x, box.at.y + 1.2, box.at.z, 1, 1.2);
      // The bay's crates stand a metre apart, so walking among them would open whichever you brushed: Open only there
      // (builder default, F2; docs/agent-calls.md).
      if (!box.bay && inReach(p, box.at, BUMP)) open(box);
    }
    for (const t of TIERS) {
      const mesh = meshes[t];
      mesh.count = counts[t];
      mesh.visible = counts[t] > 0;
      if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
    }
    show.update(dt);
  }

  const targetAt = new Map<Box, THREE.Vector3>();
  owner.cleanup(() => {
    show.dispose();
    root.removeFromParent();
    for (const g of [groundGeo, ...Object.values(crateGeo), ...giftGeos.values()]) g.dispose();
    for (const mat of [partMat, material]) mat.dispose();
    for (const mesh of Object.values(meshes)) mesh.dispose();
  });
  return {
    update,
    targets(): Interactable[] {
      const p = me.body?.position;
      if (!p || show.busy()) return NO_TARGETS;
      let out: Interactable[] | null = null;
      for (const box of boxes) {
        if (!box.waiting || !inReach(p, box.at, REACH)) continue;
        let at = targetAt.get(box);
        if (!at) targetAt.set(box, (at = new THREE.Vector3()));
        at.copy(box.at).y += 1.5;
        (out ??= []).push({
          id: `finds-secret-${box.id}${box.bay ? '-bay' : ''}`,
          verb: 'Open the crate',
          at,
          run: () => open(box),
        });
      }
      return out ?? NO_TARGETS;
    },
    inspect: (): Pick<FindsViewInspection, 'boxes' | 'opening'> => ({
      boxes: SECRETS.map((s) => {
        const world = boxes.find((b) => b.id === s.id && !b.bay)!;
        const bay = boxes.find((b) => b.id === s.id && b.bay)!;
        return {
          id: s.id,
          gift: s.gift,
          world: { x: world.at.x, y: world.at.y, z: world.at.z, waiting: world.waiting },
          bay: { x: bay.at.x, y: bay.at.y, z: bay.at.z, waiting: bay.waiting },
        };
      }),
      opening,
    }),
  };
}
