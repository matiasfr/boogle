// The shop: Fine Prices. The Boogler's absurd prices are the gag; they stand on real tags and climb as the money on your HUD does,
// even while you watch, if a partner's busy outside. What you pay is on every tag too, and it's $0: nothing here touches the money,
// so nobody spends what someone else earned (DESIGN.md 6). Each thing goes through three presses you can feel: Try on (it's on you),
// Take it (it's yours), and after that Wear it or Take it off. The rail at the back swaps anything you own, boxes' finds included,
// with swapSlot. Walk out still trying something on and it's yours anyway: it was free. Local and personal: two people can shop at
// once, and neither takes the other's stock, because there's no stock.
// `createShop` mounts it in `rooms`' shop on an owner: the town entity's in the live game (src/entities/town/), with the
// wardrobe (src/entities/wardrobe/state.ts).
// Docs: docs/research/town-interiors.md, "A shop when money is a joke"; docs/research/cosmetic-rarity.md.
import * as THREE from 'three/webgpu';
import { dollars, paperMaterial } from '../../place/signs.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NO_TARGETS, interactTarget, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Got } from '../../render/reward-reveal.ts';
import { STOCK, cosmetic, type Stock } from '../../render/cosmetic-parts.ts';
import { CLOTHES_SLOTS, type ClothesSlot, type WardrobeApi } from '../wardrobe/state.ts';
import { playMark } from '../../proto/mark.ts';
import { merged } from '../../render/part-geometry.ts';
import {
  DOOR,
  addSolid,
  plate,
  plankFloor,
  roomMesh,
  roomToWorld,
  worldToRoom,
  type Part,
  type Rooms,
} from './rooms.ts';
import { BOARDS, SHOP, type Fact } from './town-lines.ts';

/** What the shop needs of the wardrobe. */
export type ShopWardrobe = Pick<
  WardrobeApi,
  'owned' | 'isOwned' | 'isWorn' | 'tried' | 'tryOn' | 'keepTried' | 'wearOwned' | 'takeOff' | 'swapLabel' | 'swapSlot'
>;
export type ShopEnv = {
  has(f: Fact): boolean;
  /** The money on your counter: production's score. Only the tags read it. */
  money(): number;
  /** The "You got" card, for what you take. */
  youGot(g: Got): boolean;
};
/** Who answers in the shop: Button, through the residents (T2), or nobody yet. */
export type ShopSay = (id: 'button', line: string) => void;

const OAK = '#8a4a2c',
  CREAM = '#fff3d6';
/** Where each thing stands, in the stock's order; the tag faces back into the room. */
const STANDS: { x: number; z: number; yaw: number }[] = [
  { x: 3.8, z: -1.9, yaw: -Math.PI / 2 },
  { x: 3.8, z: 0.2, yaw: -Math.PI / 2 },
  { x: 3.8, z: 2.3, yaw: -Math.PI / 2 },
  { x: -3.8, z: 0.2, yaw: Math.PI / 2 },
  { x: -3.8, z: 2.3, yaw: Math.PI / 2 },
];
const RAIL_X: Record<ClothesSlot, number> = { hat: -0.2, accessory: 0.65, outfit: 1.5 };

/** Fine Prices in `rooms`' shop, owned by `owner`. The caller registers `targets` and calls `update` each frame. */
export function createShop(owner: OwnedView, rooms: Rooms, env: ShopEnv, wardrobe: ShopWardrobe, say: ShopSay) {
  const r = rooms.rooms.shop;
  const { w, d } = r;
  const available = (s: Stock) => !s.after || env.has(s.after);
  /** The list price: it goes up as you earn. Funny, that. */
  const listPrice = (s: Stock) => s.price + Math.round(env.money()) * 1000;

  // ---------------------------------------------------------------- the room
  const fixtures = plankFloor(r, '#a57d51', '#b0875a');
  fixtures.push(
    // The counter and its till, with one enormous button.
    ['b', -3.0, 0.52, -2.45, 3.6, 1.04, 1.0, OAK],
    ['b', -3.0, 1.06, -2.45, 3.8, 0.08, 1.15, '#c9a86a'],
    ['b', -3.9, 1.3, -2.45, 0.8, 0.42, 0.6, '#3f4145'],
    ['c', -3.9, 1.55, -2.3, 0.2, 0.08, 0.2, '#d8392b'],
    // Button's step behind it.
    ['b', -3.0, 0.24, -3.3, 1.2, 0.48, 0.75, '#7f5630'],
    // A fitting rug, where a friend can see you.
    ['c', 0.5, 0.04, 0.5, 1.4, 0.03, 1.4, '#3f8ee0'],
    ['c', 0.5, 0.05, 0.5, 1.05, 0.03, 1.05, '#8fd0ff'],
    // The rail: anything you own.
    ['b', 1.0, 1.7, -3.45, 3.4, 0.08, 0.08, '#3f4145'],
    ['b', -0.65, 0.85, -3.45, 0.08, 1.7, 0.08, '#3f4145'],
    ['b', 2.65, 0.85, -3.45, 0.08, 1.7, 0.08, '#3f4145'],
    ['b', -0.2, 1.45, -3.45, 0.04, 0.5, 0.04, '#d9a23a'],
    ['b', 0.65, 1.45, -3.45, 0.04, 0.5, 0.04, '#d9a23a'],
    ['b', 1.5, 1.45, -3.45, 0.04, 0.5, 0.04, '#d9a23a'],
    ['b', 2.3, 1.45, -3.45, 0.04, 0.5, 0.04, '#d9a23a'],
    // Panelled counter, folded cloth and a receipt roll: a little haberdashery.
    ['b', -3, 0.52, -1.94, 3.3, 0.72, 0.03, '#b77a4c'],
    ['b', -3, 0.52, -1.91, 0.08, 0.78, 0.04, OAK],
    ['b', -2.05, 1.15, -2.55, 0.75, 0.12, 0.55, '#3f6fb0'],
    ['b', -2.02, 1.26, -2.55, 0.7, 0.1, 0.5, '#e4574a'],
    ['b', -2.02, 1.32, -2.55, 0.1, 0.025, 0.5, CREAM],
    ['c', -3.4, 1.28, -2.35, 0.1, 0.32, 0.1, CREAM, 0, Math.PI / 2],
  );
  for (const x of [-0.2, 0.65, 1.5, 2.3])
    fixtures.push(
      ['b', x - 0.11, 1.29, -3.45, 0.3, 0.035, 0.05, '#d9a23a', 0, 0.5],
      ['b', x + 0.11, 1.29, -3.45, 0.3, 0.035, 0.05, '#d9a23a', 0, -0.5],
      ['b', x, 1.22, -3.45, 0.5, 0.035, 0.05, '#d9a23a'],
    );
  for (const s of STANDS)
    fixtures.push(
      ['b', s.x, 0.45, s.z, 0.8, 0.9, 0.8, '#c9a86a'],
      ['b', s.x, 0.92, s.z, 0.9, 0.05, 0.9, OAK],
      // The tag's post, on the wall side.
      ['b', s.x + Math.sign(s.x) * 0.55, 1.0, s.z, 0.08, 2.0, 0.08, OAK],
    );
  addSolid(r, -3.0, -2.45, 1.9, 0.58, 1.1);
  addSolid(r, 1.0, -3.45, 1.7, 0.08, 1.75);
  for (const s of STANDS) addSolid(r, s.x, s.z, 0.45, 0.45, 1.0);
  const room = roomMesh(fixtures);
  r.near.add(room);

  // ---------------------------------------------------------------- what's on the stands: one mesh, remade when a sheet comes off
  const items = roomMesh([], true);
  r.near.add(items);
  let shownKey = '';
  function redrawItems() {
    const key = STOCK.map((s) => (available(s) ? 1 : 0)).join('');
    if (key === shownKey) return;
    shownKey = key;
    items.geometry.dispose();
    items.geometry = roomMesh(
      STOCK.flatMap((s, k) => {
        const at = STANDS[k]!;
        if (!available(s))
          return [
            ['k', at.x, 1.3, at.z, 0.38, 0.72, 0.38, '#ded5c2'] as Part,
            ['s', at.x, 1.72, at.z, 0.16, 0.14, 0.16, '#ded5c2'] as Part,
          ];
        // Everything's drawn at the height it sits on you; stood on a stand, it's lifted to the top.
        const parts = s.parts as Part[];
        const low = Math.min(...parts.map((p) => p[2] - p[5] / 2));
        return parts.map((p) => {
          const q = [...p] as Part;
          q[1] += at.x;
          q[2] += 0.96 - low;
          q[3] += at.z;
          return q;
        });
      }),
    ).geometry;
  }

  // ---------------------------------------------------------------- the tags: one canvas, one draw, redrawn when a number moves
  const COLS = 2,
    ROWS = 3,
    CW = 512,
    CH = 340;
  const canvas = document.createElement('canvas');
  canvas.width = CW * COLS;
  canvas.height = CH * ROWS;
  const g2 = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const tagGeo = mergeGeometries(
    STANDS.map((s, k) => {
      const g = new THREE.PlaneGeometry(1.3, 0.87);
      const u0 = (k % COLS) / COLS,
        v0 = 1 - (Math.floor(k / COLS) + 1) / ROWS;
      const uv = g.getAttribute('uv');
      for (let n = 0; n < uv.count; n++) uv.setXY(n, u0 + uv.getX(n) / COLS, v0 + uv.getY(n) / ROWS);
      g.rotateY(s.yaw);
      g.translate(s.x + Math.sign(s.x) * 0.5, 1.95, s.z);
      return g;
    }),
  )!;
  const tagMat = paperMaterial(tex);
  const priceTags = new THREE.Mesh(tagGeo, tagMat);
  priceTags.receiveShadow = true;
  r.near.add(priceTags);
  let tagKey = '';
  function redrawTags() {
    const key = `${Math.round(env.money())}|${STOCK.map((s) => `${available(s) ? 1 : 0}${wardrobe.isOwned(s.id) ? 1 : 0}`).join('')}`;
    if (key === tagKey) return;
    tagKey = key;
    g2.textAlign = 'center';
    g2.textBaseline = 'middle';
    STOCK.forEach((s, k) => {
      const x = (k % COLS) * CW,
        y = Math.floor(k / COLS) * CH;
      g2.fillStyle = CREAM;
      g2.fillRect(x, y, CW, CH);
      g2.strokeStyle = '#2a1c10';
      g2.lineWidth = 10;
      g2.strokeRect(x + 6, y + 6, CW - 12, CH - 12);
      const mid = x + CW / 2;
      if (!available(s)) {
        g2.fillStyle = '#7a6a58';
        g2.font = '900 54px Figtree, system-ui, sans-serif';
        g2.fillText(SHOP.covered[s.after!], mid, y + CH / 2, CW - 40);
        return;
      }
      g2.fillStyle = '#2a1c10';
      g2.font = '700 40px Figtree, system-ui, sans-serif';
      g2.fillText(s.name, mid, y + 62, CW - 40);
      g2.fillStyle = '#c4453a';
      g2.font = '900 62px Figtree, system-ui, sans-serif';
      g2.fillText(dollars(listPrice(s)), mid, y + 156, CW - 30);
      g2.fillStyle = '#2f8a4e';
      g2.font = '900 66px Figtree, system-ui, sans-serif';
      g2.fillText(wardrobe.isOwned(s.id) ? 'YOURS' : SHOP.today, mid, y + 262, CW - 30);
    });
    tex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- what you take: the "You got" card
  const gotMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
  /** It's yours now: the card, with the thing itself turning in it. */
  function got(id: string) {
    const g = cosmetic(id);
    if (g) env.youGot({ name: g.name, line: g.line, model: new THREE.Mesh(merged(g.parts), gotMat) });
  }

  // ---------------------------------------------------------------- the button
  let keptLine = 0;
  function take() {
    const id = wardrobe.keepTried();
    if (!id) return;
    got(id);
    playMark('shop kept', { what: id });
    say('button', SHOP.kept[keptLine++ % SHOP.kept.length]!);
  }
  const prompts = STOCK.map(() => new THREE.Vector3());
  const rail = new Map<ClothesSlot, THREE.Vector3>();
  const hangerHighlight = roomMesh([
    ['b', -0.11, 1.29, -3.4, 0.34, 0.07, 0.06, '#fff0a0', 0, 0.5],
    ['b', 0.11, 1.29, -3.4, 0.34, 0.07, 0.06, '#fff0a0', 0, -0.5],
    ['b', 0, 1.22, -3.4, 0.55, 0.07, 0.06, '#fff0a0'],
  ]);
  hangerHighlight.visible = false;
  r.near.add(hangerHighlight);
  function targets(): Interactable[] {
    const b = me.body;
    if (!b || !r.ready) return NO_TARGETS;
    const p = b.interpolatedPosition;
    const l = worldToRoom(r, p.x, p.z);
    if (Math.abs(l.x) > w / 2 + 0.5 || Math.abs(l.z) > d / 2 + 0.5 || Math.abs(p.y - r.y) > 3) return NO_TARGETS;
    let out: Interactable[] | null = null;
    STOCK.forEach((s, k) => {
      const at = STANDS[k]!;
      if (Math.hypot(l.x - at.x, l.z - at.z) > 2.2) return;
      const v = roomToWorld(r, at.x, 1.5, at.z, prompts[k]!);
      const id = `place-stock-${s.id}`;
      if (!available(s)) return void (out ??= []).push({ id, verb: s.name, at: v, blocked: SHOP.covered[s.after!] });
      if (wardrobe.tried() === s.id) return void (out ??= []).push({ id, verb: SHOP.keepVerb, at: v, run: take });
      if (wardrobe.isOwned(s.id)) {
        if (wardrobe.isWorn(s.id))
          (out ??= []).push({ id, verb: SHOP.offVerb, at: v, run: () => wardrobe.takeOff(s.id) });
        else (out ??= []).push({ id, verb: SHOP.wearVerb, at: v, run: () => wardrobe.wearOwned(s.id) });
        return;
      }
      (out ??= []).push({
        id,
        verb: SHOP.tryVerb,
        at: v,
        run: () => {
          wardrobe.tryOn(s.id);
          playMark('shop tried on', { what: s.id });
        },
      });
    });
    if (Math.hypot(l.x - 1, l.z + 3.45) < 2.4)
      for (const slot of CLOTHES_SLOTS) {
        if (!wardrobe.owned(slot).length) continue;
        let at = rail.get(slot);
        if (!at) rail.set(slot, (at = new THREE.Vector3()));
        roomToWorld(r, RAIL_X[slot], 1.55, -3.3, at);
        (out ??= []).push({
          id: `place-rail-${slot}`,
          verb: wardrobe.swapLabel(slot, SHOP.offVerb),
          at,
          run: () => {
            wardrobe.swapSlot(slot);
            playMark('shop swapped', { slot });
          },
        });
      }
    return out ?? NO_TARGETS;
  }
  rooms.onRoom((room, inside) => {
    if (room !== r || inside) return;
    // Out of the door wearing it: it was free.
    if (wardrobe.tried()) {
      const id = wardrobe.keepTried();
      if (id) got(id);
      playMark('shop kept', { what: id ?? '', walked: true });
      say('button', SHOP.walkedOut);
    }
  });
  function update() {
    if (!r.near.visible) return;
    const target = interactTarget()?.id;
    const slot = CLOTHES_SLOTS.find((s) => target === `place-rail-${s}`);
    hangerHighlight.visible = !!slot;
    if (slot) hangerHighlight.position.x = RAIL_X[slot];
    redrawItems();
    redrawTags();
  }

  // ---------------------------------------------------------------- what it looks like from the street
  const STRIPES = 8,
    AW = DOOR.w + 3.2;
  const awning: Part[] = [];
  for (let k = 0; k < STRIPES; k++)
    awning.push([
      'b',
      -AW / 2 + (k + 0.5) * (AW / STRIPES),
      2.72,
      d / 2 + 0.85,
      AW / STRIPES,
      0.08,
      1.8,
      k % 2 ? '#fff3d6' : '#c4453a',
      0.36,
    ]);
  // A scalloped valance makes the shop's silhouette readable from along the street.
  for (let k = 0; k < STRIPES; k++)
    awning.push([
      's',
      -AW / 2 + ((k + 0.5) * AW) / STRIPES,
      2.36,
      d / 2 + 1.7,
      AW / STRIPES / 2,
      0.18,
      0.055,
      k % 2 ? CREAM : '#c4453a',
    ]);
  const awningMesh = roomMesh(awning);
  r.over.add(awningMesh, plate(BOARDS.shop, 4.4, 0.72, 0, 3.42, d / 2 + 0.34));
  const front = roomMesh([
    // A table of things out front, as a shop has, with a tag bigger than any of them.
    ['b', -DOOR.w / 2 - 1.5, 0.45, d / 2 + 1.0, 1.7, 0.9, 0.9, OAK],
    ['s', -DOOR.w / 2 - 1.9, 1.02, d / 2 + 1.0, 0.2, 0.14, 0.2, '#f0c030'],
    ['s', -DOOR.w / 2 - 1.2, 1.02, d / 2 + 1.05, 0.2, 0.14, 0.2, '#3f8ee0'],
    ['b', DOOR.w / 2 + 1.4, 0.4, d / 2 + 1.0, 0.8, 0.8, 0.8, '#a9794c'],
    ['b', DOOR.w / 2 + 1.4, 1.05, d / 2 + 1.0, 0.1, 0.5, 0.1, '#7f5630'],
    ['b', DOOR.w / 2 + 1.4, 1.4, d / 2 + 1.05, 0.9, 0.5, 0.04, CREAM],
    ['b', DOOR.w / 2 + 1.4, 1.4, d / 2 + 1.08, 0.7, 0.14, 0.02, '#c4453a'],
  ]);
  r.outside.add(front);
  addSolid(r, -DOOR.w / 2 - 1.5, d / 2 + 1.0, 0.85, 0.45, 1.0);
  addSolid(r, DOOR.w / 2 + 1.4, d / 2 + 1.0, 0.45, 0.45, 1.7);

  // The rooms' groups were owned empty, so what's added to them here is released here.
  owner.cleanup(() => {
    for (const m of [room, items, priceTags, hangerHighlight, awningMesh, front]) m.geometry.dispose();
    tex.dispose();
    tagMat.dispose();
    gotMat.dispose();
  });
  return { targets, update };
}
export type Shop = ReturnType<typeof createShop>;
