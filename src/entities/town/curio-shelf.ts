// The curio shelf in the village: your wardrobe, stood up (docs/plans/place-retirement.md, C1a; docs/game-design/place.md,
// "Station boxes and the curio shelf"). What you own stands on it; what you don't is under a dust sheet, so it hints at
// itself (2 November). Swap a slot here as at the shop's rail, and the pet slot's stowaway (C2). Ported from Place's
// gifts.ts "the curio shelf"; Personal Local, read from the wardrobe (../wardrobe/state.ts).
// `shelfGroup` and `crystalPeg` are for K1's crystal row. F1's finds board beside it went with the owner's cut of the
// gold finds (9 November).
// Each gift stands on its board (its lowest point on the board's top), and the top board sits higher than Place's so the
// tall sheeted outfits fit under it: in Place they hung below the middle board, over the crystals' row.
// The finders' bay (F2), across the path: the secrets' gifts, under sheets until they're yours (Place's gifts.ts). It
// stands on its own but is drawn with the shelf: its frame is part of the shelf's frame, and what's on it is part of the
// shelf's two meshes, so it costs no draws. Where `bayPeg` says, missed secrets' boxes wait in front of it
// (../finds/view.ts).
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { GIFTS, type Gift, type GiftId, type Part } from '../../render/cosmetic-parts.ts';
import { WORN_SLOTS, type WardrobeApi, type WornSlot } from '../wardrobe/state.ts';

const COLS = 6,
  WIDE = 5.4,
  ROWS_Y = [1.32, 2.36],
  TOP_BOARD = ROWS_Y[1]! - 0.06,
  CRYSTAL_Y = 0.82,
  REACH = 4.4;
const SLOT_X: Record<WornSlot, number> = { hat: -2, accessory: -0.7, outfit: 0.7, pet: 2 };
/** What stands on it: the boxes' gifts, not the finds (the finders' bay) nor the shop's stock (its rail). */
const ON_SHELF = GIFTS.filter((g) => !g.area);
/** What stands on the finders' bay: the secrets' gifts, five to a board. Its boards are Place's (2.14 and 1.26 m). */
const ON_BAY = GIFTS.filter((g) => !!g.area);
const BAY_ROWS_Y = [1.31, 2.19];

export async function createCurioShelf(owner: OwnedView, wardrobe: WardrobeApi, offVerb: string) {
  const [{ merged }, { H, addStatic }, { SHELF, toWorld }, { addFoot }, { FINDERS }] = await Promise.all([
    import('../../proto/place/part-geometry.ts'),
    import('../../proto/place/land.ts'),
    import('../../proto/place/layout.ts'),
    import('../../proto/place/sites.ts'),
    import('../../proto/place/tech-layout.ts'),
  ]);
  const SX = toWorld(SHELF.x),
    SZ = SHELF.z,
    SY = SHELF.y ?? H(SX, SZ);
  const shelf = new THREE.Group();
  shelf.position.set(SX, SY, SZ);
  shelf.rotation.y = SHELF.yaw;
  owner.add(shelf); // empty now: what's added to it below is disposed here, not by the owner
  shelf.updateMatrixWorld(true);
  // The finders' bay faces the shelf across the path. Bay space to shelf space: what's on the bay is drawn there.
  const FX = toWorld(FINDERS.x),
    FZ = FINDERS.z,
    FY = H(FX, FZ);
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
  const frameGeo = (() => {
    const o = '#7f5630',
      b = '#a9794c',
      back = '#5c4530';
    const parts: Part[] = [
      ['b', 0, 1.65, -0.3, WIDE, 3.1, 0.1, back],
      ['b', -WIDE / 2, 1.65, 0, 0.18, 3.3, 0.7, o],
      ['b', WIDE / 2, 1.65, 0, 0.18, 3.3, 0.7, o],
      ['b', 0, 0.42, 0.04, WIDE, 0.1, 0.68, b],
      ['b', 0, 1.26, 0.04, WIDE, 0.1, 0.68, b],
      ['b', 0, TOP_BOARD, 0.04, WIDE, 0.1, 0.68, b],
      ['b', 0, 3.1, 0.04, WIDE + 0.5, 0.14, 1.1, o],
      ['b', 0, 3.3, 0, WIDE + 0.1, 0.34, 0.5, '#c4453a'],
      ['b', 0, 0.12, 0.04, WIDE, 0.22, 0.68, o],
    ];
    // The finders' bay's frame (Place's), in bay space, with its teal band.
    const bo = '#6a5a48',
      bb = '#8f7a60';
    const bay = merged([
      ['b', 0, 1.3, -0.3, WIDE, 2.4, 0.1, '#4c4238'],
      ['b', -WIDE / 2, 1.3, 0, 0.18, 2.6, 0.7, bo],
      ['b', WIDE / 2, 1.3, 0, 0.18, 2.6, 0.7, bo],
      ['b', 0, 1.26, 0.04, WIDE, 0.1, 0.68, bb],
      ['b', 0, 2.14, 0.04, WIDE, 0.1, 0.68, bb],
      ['b', 0, 2.62, 0.04, WIDE + 0.5, 0.14, 1.1, bo],
      ['b', 0, 2.76, 0, WIDE + 0.1, 0.16, 0.5, '#2fb7a0'],
    ]);
    return join(merged(parts), inBay(bay));
  })();
  const frame = new THREE.Mesh(frameGeo, giftMat);
  frame.castShadow = frame.receiveShadow = true;
  shelf.add(frame);
  addStatic(
    { kind: 'box', hx: WIDE / 2 + 0.1, hy: 1.7, hz: 0.4 },
    { x: SX, y: SY + 1.7, z: SZ },
    new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, SHELF.yaw),
    undefined,
    owner,
  );
  addFoot(SX, SZ, SHELF.yaw, WIDE / 2 + 0.3, 0.6, owner);
  const bayYaw = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, FINDERS.yaw);
  addStatic(
    { kind: 'box', hx: WIDE / 2 + 0.1, hy: 1.4, hz: 0.4 },
    { x: FX, y: FY + 1.4, z: FZ },
    bayYaw,
    undefined,
    owner,
  );
  addFoot(FX, FZ, FINDERS.yaw, WIDE / 2 + 0.3, 0.6, owner);

  // Two meshes, whatever's uncovered and whatever's still under its sheet, remade when a sheet comes off: two draws
  // however many shapes it holds, the bay's included. A bay slot is in bay space.
  const slots = new Map<GiftId, { x: number; y: number; bay: boolean }>();
  /** Lifted by however far its shape reaches below its origin, so it stands on the board rather than through it. */
  const lift = (g: Gift) => {
    const shape = merged(g.parts);
    shape.computeBoundingBox();
    const by = Math.max(0, -shape.boundingBox!.min.y);
    shape.dispose();
    return by;
  };
  ON_SHELF.forEach((g, k) => {
    const col = k % COLS,
      row = Math.floor(k / COLS);
    slots.set(g.id, { x: (col - (COLS - 1) / 2) * (WIDE / COLS), y: ROWS_Y[1 - row]! + lift(g), bay: false });
  });
  ON_BAY.forEach((g, k) => {
    const col = k % 5,
      row = Math.floor(k / 5);
    slots.set(g.id, { x: (col - 2) * (WIDE / 5), y: BAY_ROWS_Y[1 - row]! + lift(g), bay: true });
  });
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
    real.geometry = drawn(out, (g) => g.parts);
    // Under its sheet: the same shape, a little fuller, in cloth, with a skirt to the shelf.
    cover.geometry = drawn(covered, (g) => [...g.parts, ['k', 0, 0.2, 0, 0.36, 0.4, 0.36, '#fff']], 1.12);
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

  const spots = new Map<WornSlot, THREE.Vector3>();
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
    /** Where missed secret k's box waits in front of the finders' bay, in the world, on the ground (Place's hubSlot: two
     * rows on the village's side of the path; here split either side of the jump trophy's plinth, which stands where
     * Place's first boxes did). */
    bayPeg(k: number, out: THREE.Vector3) {
      const side = k % 2 ? 1 : -1,
        j = k >> 1;
      const x = FX + 1.5 + (j % 2) * 1.1,
        z = FZ + side * (1.5 + (j >> 1) * 1.15);
      return out.set(x, H(x, z), z);
    },
    /** Swap a slot you own something in, within reach of the shelf (Place's ids). */
    targets(): Interactable[] {
      const p = me.body?.position;
      if (!p || Math.hypot(p.x - SX, p.z - SZ) >= REACH) return NO_TARGETS;
      let out: Interactable[] | null = null;
      for (const slot of WORN_SLOTS) {
        if (!wardrobe.owned(slot).length) continue;
        let at = spots.get(slot);
        if (!at) spots.set(slot, (at = shelf.localToWorld(new THREE.Vector3(SLOT_X[slot], 1.8, 0.4))));
        (out ??= []).push({
          id: `place-swap-${slot}`,
          verb: wardrobe.swapLabel(slot, offVerb),
          at,
          run: () => wardrobe.swapSlot(slot),
        });
      }
      return out ?? NO_TARGETS;
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
