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
// here is Local presentation: the ground and the clues are records (content/prefabs/secrets.ts, placed by
// content/levels/secrets.ts) drawn as one merged mesh; the boxes, their show and their cards are this view's, three
// instanced meshes. The cards are name-only: Place's secret gifts have no line.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { inReach } from '../../player/reach.ts';
import { playMark } from '../../proto/mark.ts';
import { getAudio } from '../../render/audio.ts';
import { cosmetic, crateParts, type GiftId, type Tier } from '../../render/cosmetic-parts.ts';
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
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { placeSecretThing } from './secrets-place.ts';
import level from '../../../content/built/levels/secrets.json' with { type: 'json' };

/** A record's piece in the one ground colour it is drawn in. */
function coloured(g: THREE.BufferGeometry, color: string) {
  const n = g.getAttribute('position').count,
    c = new THREE.Color(color),
    col = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3);
  return g.setAttribute('color', new THREE.BufferAttribute(col, 3));
} // Both only up at the box's level: one on a ledge isn't in reach from the ground under it, nor from the top of one jump
// beside it (src/player/reach.ts; G27, docs/plans/grant-c8-batch.md).
const BUMP = 1.25, // m: walking into a box opens it (Place's)
  REACH = 3.4, // m: Open the crate
  SPARKLE_NEAR = 60;
const TIERS: Tier[] = ['common', 'rare', 'wonder'];

export async function createSecretsView(owner: OwnedView, store: FindsApi) {
  const [tech, { ORIGIN }, { H }, { merged }, { softGlow }] = await Promise.all([
    import('../../place/tech-layout.ts'),
    import('../../place/layout.ts'),
    import('../../place/terrain.ts'),
    import('../../render/part-geometry.ts'),
    import('../../place/look.ts'),
  ]);
  // The jump course's cap ("block") moves to job E with the double jump's course (designer fit check, 9 November).
  const SECRETS = tech.SECRETS.filter((s) => s.id !== 'block');
  const ox = ORIGIN.x;
  const root = new THREE.Group();
  root.name = 'secrets';
  owner.root.add(root);
  const yOf = (s: (typeof SECRETS)[number]) => (s.y === null ? H(s.x + ox, s.z) : s.y);

  // ---------------------------------------------------------------- the ground they stand on, and the clues
  // Records (content/prefabs/secrets.ts), standing where content/levels/secrets.ts puts them: the lookout's shelf, the
  // loft's rock under its slab, the balcony's column and the sea stack, the tower boxes' plinths, and each clue. Solid
  // where it looks solid (Place's buildPads, buildChestStands, buildClues), and drawn as one merged mesh. The helmet's
  // ladder down the stack is its own batch. Not Place's jump course (job E) or its Far Head glide pad and ramp (cut:
  // glider B's device is on Needle Bell).
  const frame = { ox, H, pad: tech.padById, secret: (id: string) => tech.SECRETS.find((s) => s.id === id)! };
  const parts: THREE.BufferGeometry[] = [];
  /** Where a box stands on a record (a tower box on its plinth), by secret id, and the foot of that record: the slab
   * you open it from. */
  const standsOn = new Map<string, { at: THREE.Vector3; foot: number }>();
  for (const placed of loadLevelArtifact(level, definitions).placements) {
    const at = placeSecretThing(placed, frame);
    if (!at) continue;
    const visual = definitions[at.prefab]!.visual;
    const batch =
      'builder' in visual && visual.batch
        ? { target: createPrefabBatch(at.prefab, visual.instances?.length ?? 1, owner), index: 0 }
        : undefined;
    const thing = instantiate(at.prefab, at, { owner, ...(batch ? { batch } : {}) });
    thing.setEnabled(true);
    let foot = Infinity;
    for (const piece of thing.pieces) {
      const g = piece.geometry.applyMatrix4(piece.matrix);
      g.computeBoundingBox();
      foot = Math.min(foot, g.boundingBox!.min.y);
      parts.push(coloured(g, piece.color));
    }
    if (typeof at.params?.holds === 'string') standsOn.set(at.params.holds, { at: thing.attach('box').at, foot });
  }
  const groundGeo = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  const partMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
  const ground = new THREE.Mesh(groundGeo, partMat);
  ground.castShadow = ground.receiveShadow = true;
  root.add(ground);
  // The bell under its bracket (the level's bell post reaches over it): heard, not drawn.
  const bell = tech.SECRETS.find((s) => s.id === 'bell')!;
  const bellAt = new THREE.Vector3(bell.x + ox, H(bell.x + ox, bell.z) + 1, bell.z);

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
    /** Up on a ledge: the height you open it from (src/player/reach.ts `ledge`); undefined on the ground or at the bay. */
    ledge: number | undefined;
    pose: THREE.Object3D;
    waiting: boolean;
  };
  const boxes: Box[] = [];
  const secretOf = new Map<string, (typeof SECRETS)[number]>();
  SECRETS.forEach((s) => {
    const gift = cosmetic(s.gift);
    if (!gift) throw new Error(`secret ${s.id}: no gift ${s.gift}`);
    secretOf.set(s.id, s);
    const make = (bay: boolean, at: THREE.Vector3, ledge?: number): Box => ({
      id: s.id,
      gift: gift.id,
      tier: gift.tier ?? 'common',
      bay,
      at,
      ledge,
      pose: new THREE.Object3D(),
      waiting: false,
    });
    // A raised box (SECRETS `y`) is opened from its own ledge, or a tower box from the slab its plinth stands on.
    const on = standsOn.get(s.id),
      at = on?.at.clone() ?? new THREE.Vector3(s.x + ox, yOf(s), s.z);
    boxes.push(make(false, at, s.y === null ? undefined : (on?.foot ?? at.y)), make(true, new THREE.Vector3()));
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
      if (!box.bay && inReach(p, box.at, BUMP, box.ledge)) open(box);
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
        if (!box.waiting || !inReach(p, box.at, REACH, box.ledge)) continue;
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
    /** Each raised world box's ledge, the height it is opened from (src/player/reach.ts), by secret id. */
    ledges: (): FindsViewInspection['ledges'] =>
      Object.fromEntries(boxes.flatMap((b) => (b.bay || b.ledge === undefined ? [] : [[b.id, b.ledge]]))),
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
