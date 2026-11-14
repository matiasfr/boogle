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
import { plate, roomMesh, roomToWorld, worldToRoom, type Part, type Rooms } from './rooms.ts';
import { BOARDS, SHOP, type Fact } from './town-lines.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact, loadPrefabArtifact } from '../../prefab/validate.ts';
import artifact from '../../../content/built/prefabs.json' with { type: 'json' };
import level from '../../../content/built/levels/shop.json' with { type: 'json' };
const definitions = loadPrefabArtifact(artifact).prefabs;
const placements = loadLevelArtifact(level, definitions).placements;

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

const CREAM = '#fff3d6';
/** Stock order and authored headings come from the same records as the stands' parts and solids. */
const STANDS = placements
  .filter((p) => p.id.startsWith('shop-stand-'))
  .map((p) => {
    const def = definitions[p.prefab]!;
    if (!('builder' in def.visual)) throw new Error('shop: expected stand builder');
    const { x, z, headingDegrees } = def.visual.params;
    if (typeof x !== 'number' || typeof z !== 'number' || typeof headingDegrees !== 'number')
      throw new Error('shop: expected stand coordinates');
    return { x, z, yaw: (headingDegrees / 180) * Math.PI };
  });
const RAIL_X: Record<ClothesSlot, number> = { hat: -0.2, accessory: 0.65, outfit: 1.5 };

/** Fine Prices in `rooms`' shop, owned by `owner`. The caller registers `targets` and calls `update` each frame. */
export function createShop(owner: OwnedView, rooms: Rooms, env: ShopEnv, wardrobe: ShopWardrobe, say: ShopSay) {
  const r = rooms.rooms.shop;
  const { w, d } = r;
  const available = (s: Stock) => !s.after || env.has(s.after);
  /** The list price: it goes up as you earn. Funny, that. */
  const listPrice = (s: Stock) => s.price + Math.round(env.money()) * 1000;

  // ---------------------------------------------------------------- the room
  if (w !== 10 || d !== 8) throw new Error('shop: room dimensions differ from authored records');
  const fixtureOwner = createOwnedView();
  r.near.add(fixtureOwner.root);
  owner.cleanup(fixtureOwner.dispose);
  const pieces = placements.map((p) => {
    const instance = instantiate(p.prefab, p, {
      owner: fixtureOwner,
      makeLabel: (a, key) => {
        if (key !== 'shop') throw new Error('shop: unknown sign reference');
        return plate(BOARDS.shop, a.w, a.h, a.at[0], a.at[1], a.at[2]);
      },
      handlers: {
        'town.shop-stock': (at) => {
          const stock = STOCK[Number(at.id.slice('shop-stand-'.length))]!;
          return targets().filter((t) => t.id === `place-stock-${stock.id}`);
        },
        'town.shop-rail': () => targets().filter((t) => t.id.startsWith('place-rail-')),
      },
    });
    r.furnishings.push(instance);
    if (p.id === 'shop-sign') r.over.add(instance.root);
    return { id: p.id, instance };
  });
  const parts = (...ids: string[]) => pieces.filter((p) => ids.includes(p.id)).flatMap((p) => p.instance.parts);
  const fixtures = parts(
    'shop-floor',
    'shop-counter',
    'shop-step',
    'shop-rug',
    'shop-rail',
    'shop-counter-detail',
    'shop-hangers',
    ...STANDS.map((_, k) => `shop-stand-${k}`),
  );
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
  const hangerHighlight = roomMesh(parts('shop-highlight'));
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
  const awningMesh = roomMesh(parts('shop-awning'));
  r.over.add(awningMesh);
  const front = roomMesh(parts('shop-front-table', 'shop-front-box'));
  r.outside.add(front);

  // The rooms' groups were owned empty, so what's added to them here is released here.
  owner.cleanup(() => {
    for (const m of [room, items, priceTags, hangerHighlight, awningMesh, front]) m.geometry.dispose();
    tex.dispose();
    tagMat.dispose();
    gotMat.dispose();
  });
  return {
    targets: () =>
      [...pieces.filter((p) => p.id.startsWith('shop-stand-')), ...pieces.filter((p) => p.id === 'shop-rail')].flatMap(
        (p) => p.instance.targets(),
      ),
    update,
  };
}
export type Shop = ReturnType<typeof createShop>;
