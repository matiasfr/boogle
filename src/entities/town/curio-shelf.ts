// The curio shelf in the village: your wardrobe, stood up (docs/plans/place-retirement.md, C1a; docs/game-design/place.md,
// "Station boxes and the curio shelf"). What you own stands on it; what you don't is under a dust sheet, so it hints at
// itself (2 November). Display only: Pause's You page dresses you now (10 November, docs/brainstorms/pause-wardrobe.md); the
// shelf's Swap prompts went. The pet slot's stowaway (C2) stands here too. Ported from Place's
// gifts.ts "the curio shelf"; Personal Local, read from the wardrobe (../wardrobe/state.ts).
// `shelfGroup` and `crystalPeg` are for K1's crystal row. F1's finds board beside it went with the owner's cut of the
// gold finds (9 November).
// Each gift stands on its board (its lowest point on the board's top), and the top board sits higher than Place's so the
// tall sheeted outfits fit under it: in Place they hung below the middle board, over the crystals' row.
// The finders' bay (F2), beside the shelf at the hall's south end (FINDERS_B): the secrets' gifts, under sheets until they're yours (Place's gifts.ts). It
// stands on its own but is drawn with the shelf: its frame is part of the shelf's frame, and what's on it is part of the
// shelf's two meshes, so it costs no draws. Where `bayPeg` says, missed secrets' boxes wait in front of it
// (../finds/view.ts).
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { me } from '../../player/player.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { GIFTS, type Gift, type GiftId, type Part } from '../../render/cosmetic-parts.ts';
import type { WardrobeApi } from '../wardrobe/state.ts';

const WIDE = 5.4,
  CRYSTAL_Y = 0.82;
/** What stands on it: the boxes' gifts, not the finds (the finders' bay) nor the shop's stock (its rail). */
const ON_SHELF = GIFTS.filter((g) => !g.area);
/** What stands on the finders' bay: the secrets' gifts, five to a board. Its boards are Place's (2.14 and 1.26 m). */
const ON_BAY = GIFTS.filter((g) => !!g.area);

export async function createCurioShelf(owner: OwnedView, wardrobe: WardrobeApi) {
  const [{ merged }, { H }, { SHELF, toWorld }, { addFoot }, { FINDERS_B: FINDERS, bayBoxPoint }, { instantiate }] =
    await Promise.all([
      import('../../render/part-geometry.ts'),
      import('../../place/land.ts'),
      import('../../place/layout.ts'),
      import('../../place/sites.ts'),
      import('../../place/home-station.ts'),
      import('../../prefab/instantiate.ts'),
    ]);
  const SX = toWorld(SHELF.x),
    SZ = SHELF.z,
    SY = SHELF.y ?? H(SX, SZ);
  const shelf = new THREE.Group();
  shelf.position.set(SX, SY, SZ);
  shelf.rotation.y = SHELF.yaw;
  owner.add(shelf); // empty now: what's added to it below is disposed here, not by the owner
  shelf.updateMatrixWorld(true);
  // The finders' bay stands beside the shelf. Bay space to shelf space: what's on the bay is drawn there.
  const FX = toWorld(FINDERS.x),
    FZ = FINDERS.z,
    FY = FINDERS.y ?? H(FX, FZ);
  const bayToShelf = shelf.matrix
    .clone()
    .invert()
    .multiply(
      new THREE.Matrix4().compose(
        new THREE.Vector3(FX, FY, FZ),
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, FINDERS.yaw),
        new THREE.Vector3(1, 1, 1),
      ),
    );
  const inBay = (g: THREE.BufferGeometry) => g.applyMatrix4(bayToShelf);
  const join = (a: THREE.BufferGeometry, b: THREE.BufferGeometry) => {
    const out = mergeGeometries([a, b])!;
    a.dispose();
    b.dispose();
    return out;
  };
  const giftMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
  const sheetMat = new THREE.MeshStandardNodeMaterial({ color: '#ded5c2', roughness: 1, flatShading: true });
  // Identity-local records return parts for the original three merged draws. Their owners supply world frames.
  const shelfOwner = createOwnedView(),
    bayOwner = createOwnedView();
  shelfOwner.root.position.set(SX, SY, SZ);
  shelfOwner.root.rotation.y = SHELF.yaw;
  bayOwner.root.position.set(FX, FY, FZ);
  bayOwner.root.rotation.y = FINDERS.yaw;
  owner.add(shelfOwner.root, bayOwner.root);
  owner.cleanup(() => {
    shelfOwner.dispose();
    bayOwner.dispose();
  });
  const build = (name: string, view = shelfOwner) => {
    const key = `town.curio-${name}` as const;
    return instantiate(key, { id: `curio-${name}`, prefab: key, pos: [0, 0, 0] }, { owner: view });
  };
  const shelfPiece = build('shelf'),
    bayPiece = build('bay', bayOwner);
  const bayGeo = merged(bayPiece.parts);
  const frameGeo = join(merged(shelfPiece.parts), inBay(bayGeo));
  const frame = new THREE.Mesh(frameGeo, giftMat);
  frame.castShadow = frame.receiveShadow = true;
  shelf.add(frame);
  const foot = (name: 'shelf' | 'bay', x: number, z: number, yaw: number) => {
    const def = definitions[`town.curio-${name}`]!;
    if (!('builder' in def.visual)) throw new Error('curio: expected frame recipe');
    const half = def.visual.params.footHalf;
    if (!Array.isArray(half) || typeof half[0] !== 'number' || typeof half[1] !== 'number')
      throw new Error('curio: expected footprint');
    addFoot(x, z, yaw, half[0], half[1], owner);
  };
  shelfPiece.setEnabled(true);
  foot('shelf', SX, SZ, SHELF.yaw);
  bayPiece.setEnabled(true);
  foot('bay', FX, FZ, FINDERS.yaw);
  const giftParts = new Map([...ON_SHELF, ...ON_BAY].map((g) => [g.id, build(`gift-${g.id}`).parts]));
  const dustSkirt = build('dust-skirt').parts;

  // Two meshes, whatever's uncovered and whatever's still under its sheet, remade when a sheet comes off: two draws
  // however many shapes it holds, the bay's included. A bay slot is in bay space.
  const slots = new Map<GiftId, { x: number; y: number; bay: boolean }>();
  /** Lifted by however far its shape reaches below its origin, so it stands on the board rather than through it. */
  const lift = (g: Gift) => {
    const shape = merged(giftParts.get(g.id)!);
    shape.computeBoundingBox();
    const by = Math.max(0, -shape.boundingBox!.min.y);
    shape.dispose();
    return by;
  };
  for (const g of [...ON_SHELF, ...ON_BAY]) {
    const def = definitions[`town.curio-gift-${g.id}`]!;
    if (!('builder' in def.visual)) throw new Error('curio: expected gift recipe');
    const { x, boardY, bay } = def.visual.params;
    if (typeof x !== 'number' || typeof boardY !== 'number' || typeof bay !== 'boolean')
      throw new Error('curio: expected gift slot');
    slots.set(g.id, { x, y: boardY + lift(g), bay });
  }
  const placed = (g: Gift, parts: Part[]): Part[] => {
    const at = slots.get(g.id)!;
    return parts.map((p) => {
      const q = [...p] as Part;
      q[1] += at.x;
      q[2] += at.y;
      q[3] += 0.08;
      return q;
    });
  };
  const real = new THREE.Mesh(new THREE.BufferGeometry(), giftMat);
  const cover = new THREE.Mesh(new THREE.BufferGeometry(), sheetMat);
  shelf.add(real, cover);
  // Null until the first draw: owning nothing ('') still has every shape to put under its sheet.
  let shown: string | null = null;
  /** One mesh's geometry for these gifts: the shelf's in shelf space, the bay's moved there from bay space. */
  function drawn(list: Gift[], parts: (g: Gift) => Part[], grow = 1) {
    const here = list.filter((g) => !slots.get(g.id)!.bay),
      there = list.filter((g) => slots.get(g.id)!.bay);
    const shelfGeo = here.length
        ? merged(
            here.flatMap((g) => placed(g, parts(g))),
            grow,
          )
        : null,
      bayGeo = there.length
        ? inBay(
            merged(
              there.flatMap((g) => placed(g, parts(g))),
              grow,
            ),
          )
        : null;
    return shelfGeo && bayGeo ? join(shelfGeo, bayGeo) : (shelfGeo ?? bayGeo ?? new THREE.BufferGeometry());
  }
  function redraw() {
    const all = [...ON_SHELF, ...ON_BAY];
    const out = all.filter((g) => wardrobe.isOwned(g.id));
    const key = out.map((g) => g.id).join();
    if (key === shown) return;
    shown = key;
    const covered = all.filter((g) => !wardrobe.isOwned(g.id));
    real.geometry.dispose();
    cover.geometry.dispose();
    real.geometry = drawn(out, (g) => giftParts.get(g.id)!);
    // Under its sheet: the same shape, a little fuller, in cloth, with a skirt to the shelf.
    cover.geometry = drawn(covered, (g) => [...giftParts.get(g.id)!, ...dustSkirt], 1.12);
    real.visible = out.length > 0;
    cover.visible = covered.length > 0;
  }
  redraw();

  // A sheet comes off where you can see it: a puff of cloth and a glint.
  const sheet = new THREE.Color('#ded5c2'),
    glint = new THREE.Color('#ffe9a8'),
    v = new THREE.Vector3();
  function puff(id: GiftId) {
    const q = slots.get(id);
    const p = me.body?.position;
    if (!q) return;
    v.set(q.x, q.y, 0.08);
    if (q.bay) v.applyMatrix4(bayToShelf);
    shelf.localToWorld(v);
    if (!p || Math.hypot(p.x - v.x, p.z - v.z) > 40) return;
    for (let k = 0; k < 18; k++) {
      const a = Math.random() * Math.PI * 2;
      emit({
        x: v.x,
        y: v.y + 0.3,
        z: v.z,
        vx: Math.cos(a) * 1.5,
        vy: 1 + Math.random() * 2,
        vz: Math.sin(a) * 1.5,
        life: 1,
        size: 0.14,
        color: k % 3 ? sheet : glint,
        intensity: k % 3 ? 1 : readableIntensity(),
        gravity: 3,
        shrink: 0.4,
      });
    }
  }
  owner.cleanup(
    wardrobe.onWardrobe((e) => {
      const before = shown;
      redraw();
      if (e.kind === 'grant' && e.id && before !== shown) puff(e.id as GiftId);
    }),
  );

  owner.cleanup(() => {
    for (const g of [frameGeo, real.geometry, cover.geometry]) g.dispose();
    giftMat.dispose();
    sheetMat.dispose();
  });
  return {
    /** Shelf space, for what K1 stands on it. */
    shelfGroup: shelf,
    /** The crystals' row, in shelf space: one peg per crystal, along the bottom board. */
    crystalPeg: (k: number, n: number, out: THREE.Vector3) =>
      out.set(((k + 0.5) / n - 0.5) * (WIDE - 0.4), CRYSTAL_Y, 0.08),
    /** Where missed secret k (0–8, its index among the nine ported secrets) waits in front of the finders' bay, in the
     * world, on the ground: three by three in the bay's own frame, 1.5 to 3.7 m out and within ±1.1 m across, between
     * the bay and the jump trophy's plinth (`bayBoxPoint`). Filled in order, the row nearest the bay first, middle
     * first. */
    bayPeg(k: number, out: THREE.Vector3) {
      const p = bayBoxPoint(k),
        x = toWorld(p.x);
      return out.set(x, H(x, p.z), p.z);
    },
    inspect: () => ({
      x: SX,
      y: SY,
      z: SZ,
      yaw: SHELF.yaw,
      uncovered: ON_SHELF.filter((g) => wardrobe.isOwned(g.id)).map((g) => g.id),
      covered: ON_SHELF.filter((g) => !wardrobe.isOwned(g.id)).length,
      bay: {
        x: FX,
        y: FY,
        z: FZ,
        yaw: FINDERS.yaw,
        uncovered: ON_BAY.filter((g) => wardrobe.isOwned(g.id)).map((g) => g.id),
        covered: ON_BAY.filter((g) => !wardrobe.isOwned(g.id)).length,
      },
    }),
  };
}
export type CurioShelf = Awaited<ReturnType<typeof createCurioShelf>>;
