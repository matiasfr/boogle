// The finds you walk into on the production railway, drawn: K1's seven crystals and F1's gold finds
// (docs/game-design/place.md, "Crystals" and "Gold finds").
// Each stands at a spot worth stopping at, the same blue as the far island's shard, slowly turning and bobbing, with a
// sparkle now and then once you're within 40 m. Walk within 4.2 m and it comes to you, slowly then all at once (0.34 s),
// and lands with a chime and a burst, and a dull stub on the curio shelf's bottom row lights up. Ported from Place's
// crystals.ts. What you found is ./state.ts's; where it stands, the flight and the shelf row are Local.
// The gold finds (Place's props.ts): a brass disc with a crossed stamp, three along each path and three on Far Head, turning
// where they lie. Walk within 2.2 m (and 3 m of its height) and it's yours: a clank, a ring of sparks, and it's pinned on
// the finds board beside the shelf. They're one instanced mesh in the world and one on the board.
// The shelf belongs to the town (../town/state.ts `townShelf`): the row and the pins go on it whenever one is mounted.
// When pillars come (open question 19's crystals), these get a distinct name or look (place-retirement designer finding
// 4); nothing here names them beyond this entity.
import * as THREE from 'three/webgpu';
import {
  attribute,
  color,
  materialColor,
  materialEmissive,
  materialMetalness,
  materialRoughness,
  mix,
} from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FrameCtx } from '../../loop.ts';
import { me } from '../../player/player.ts';
import { playMark } from '../../proto/mark.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { emit } from '../../render/particles.ts';
import { readableGlow, readableIntensity } from '../../render/readable-unlit.ts';
import { townShelf } from '../town/state.ts';
import { CRYSTAL_SPOTS, CRYSTALS, type FindsApi, type FindsViewInspection } from './state.ts';

const BLUE = '#7fd0ff',
  GLOW = '#58c8ff';
const MAGNET = 4.2, // m at which it starts to come to you
  FLY = 0.34, // s
  SPARKLE_NEAR = 40;
const FIND_REACH = 2.2, // m: a gold find is yours within this, and 3 m of its height
  FIND_HEIGHT = 3,
  PIN_SCALE = 0.42;

/** A gold find: a brass disc with a raised crossed stamp, which reads as worked brass rather than another crystal. One
 * geometry and one material (the stamp's colour and dull finish come from its `glow` attribute being 0), so the finds
 * are one draw wherever they are. Place's trinket(). */
function trinketGeometry() {
  const part = (g: THREE.BufferGeometry, glow: number) => {
    const flat = g.toNonIndexed();
    flat.deleteAttribute('uv');
    const n = flat.getAttribute('position').count;
    return flat.setAttribute('glow', new THREE.Float32BufferAttribute(new Float32Array(n).fill(glow), 1));
  };
  const disc = part(new THREE.CylinderGeometry(0.42, 0.42, 0.09, 8).rotateX(Math.PI / 2), 1);
  const stamps = [-0.6, 0.6].map((angle) =>
    part(new THREE.BoxGeometry(0.12, 0.48, 0.025).rotateZ(angle).translate(0, 0, 0.055), 0),
  );
  return mergeGeometries([disc, ...stamps])!;
}
function trinketMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({
    color: '#ffcf33',
    roughness: 0.35,
    metalness: 0.4,
    emissive: '#7a5a08',
  });
  const glow = attribute('glow', 'float');
  m.colorNode = mix(color('#79501e'), materialColor, glow);
  m.roughnessNode = mix(0.95, materialRoughness, glow);
  m.metalnessNode = materialMetalness.mul(glow);
  m.emissiveNode = materialEmissive.mul(glow);
  return readableGlow(m);
}

export async function createFindsView(store: FindsApi) {
  const owner = createOwnedView();
  owner.root.name = 'finds';
  const [{ H, PATH_SAMPLES }, { toWorld }, { pop }, { clank }] = await Promise.all([
    import('../../proto/place/land.ts'),
    import('../../proto/place/layout.ts'),
    import('../../proto/minis/common.ts'),
    import('../../render/machine-sfx.ts'),
  ]);
  const shape = () => new THREE.OctahedronGeometry(1, 0).scale(0.28, 0.62, 0.28);
  const glowMat = readableGlow(
    new THREE.MeshStandardNodeMaterial({
      color: BLUE,
      emissive: GLOW,
      emissiveIntensity: 1.5,
      roughness: 0.25,
      flatShading: true,
    }),
  );
  const dullMat = new THREE.MeshStandardNodeMaterial({ color: '#2d3a48', roughness: 0.5, flatShading: true });
  const world = new THREE.InstancedMesh(shape(), glowMat, CRYSTALS);
  world.frustumCulled = false;
  world.castShadow = true;
  owner.add(world);
  // The shelf's row: dull stubs on their pegs from the start, lit once found. Ours, on the town's shelf.
  const stubGeo = shape().scale(0.8, 0.55, 0.8);
  const row = new THREE.InstancedMesh(stubGeo, dullMat, CRYSTALS);
  const lit = new THREE.InstancedMesh(stubGeo, glowMat, CRYSTALS);
  row.frustumCulled = lit.frustumCulled = false;
  lit.count = 0;
  // The stubs join the shelf after the boot's compile: a hidden stand-in here gets their dull material compiled with the
  // scene (precompile switches hidden objects on for it; the glow is the world crystals').
  const stand = new THREE.Mesh(stubGeo, dullMat);
  stand.visible = false;
  owner.add(stand);
  let shelf: ReturnType<typeof townShelf> = null;

  // The gold finds: Place's FIND_SPOTS, along each path a little to one side, then three on Far Head.
  const gold = [
    ...PATH_SAMPLES.flatMap((path, n) =>
      [0.2, 0.47, 0.82].map((f, k) => {
        const p = path[Math.floor(path.length * f)]!,
          side = k % 2 ? 4.5 : -4.5;
        const x = toWorld(p[0] + side),
          z = p[1] + (k % 2 ? 1 : -1);
        return { id: n * 10 + k, x, z, y: H(x, z) + 1 };
      }),
    ),
    // On Far Head: something for the long way out.
    ...[
      [350, -150],
      [420, -160],
      [392, -226],
    ].map(([x, z], k) => ({ id: 50 + k, x: toWorld(x!), z: z!, y: H(toWorld(x!), z!) + 1 })),
  ];
  const trinketGeo = trinketGeometry(),
    trinketMat = trinketMaterial();
  const golds = new THREE.InstancedMesh(trinketGeo, trinketMat, gold.length);
  golds.frustumCulled = false;
  golds.castShadow = true;
  owner.add(golds);
  // Their pins on the finds board, in the order of Place's spots: each find has its own place on the board.
  const pins = new THREE.InstancedMesh(trinketGeo, trinketMat, gold.length);
  pins.frustumCulled = false;
  const pinned = () => gold.filter((f) => store.hasFind(f.id)).length;

  const m = new THREE.Matrix4(),
    v = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    sparkle = new THREE.Color('#bfe9ff');
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const items = CRYSTAL_SPOTS.map(([x, z], k) => {
    const wx = toWorld(x);
    return {
      x: wx,
      z,
      y: H(wx, z) + 1.05,
      state: (store.hasCrystal(k) ? 2 : 0) as 0 | 1 | 2,
      t: 0,
      fx: 0,
      fy: 0,
      fz: 0,
    };
  });
  /** Lit stubs: what's found and has landed (one still flying lights when it arrives). */
  const landed = () => items.filter((c) => c.state === 2).length;

  function drawRow() {
    if (!shelf) return;
    lit.count = landed();
    for (let k = 0; k < CRYSTALS; k++) {
      const peg = m.makeTranslation(shelf.crystalPeg(k, CRYSTALS, v));
      if (k < lit.count) lit.setMatrixAt(k, peg);
      row.setMatrixAt(k, k < lit.count ? ZERO : peg);
    }
    lit.instanceMatrix.needsUpdate = row.instanceMatrix.needsUpdate = true;
  }
  /** Puts the row on whichever shelf the town has mounted now (it loads after us, and a new town is a new shelf). */
  function drawPins() {
    if (!shelf) return;
    for (const [k, f] of gold.entries())
      pins.setMatrixAt(
        k,
        store.hasFind(f.id) ? m.compose(shelf.findPeg(k, v), q.identity(), s.setScalar(PIN_SCALE)) : ZERO,
      );
    pins.instanceMatrix.needsUpdate = true;
  }
  function followShelf() {
    const now = townShelf();
    if (now === shelf) return;
    row.removeFromParent();
    lit.removeFromParent();
    pins.removeFromParent();
    shelf = now;
    if (!shelf) return;
    shelf.shelfGroup.add(row, lit, pins);
    drawRow();
    drawPins();
  }
  // Another tab of this player found one, a reload, or a find taken from outside the view: take what the store says,
  // without the show. One already flying lands as it would.
  owner.cleanup(
    store.onFinds(() => {
      for (const [k, c] of items.entries()) if (c.state !== 1) c.state = store.hasCrystal(k) ? 2 : 0;
      drawRow();
      drawPins();
    }),
  );

  function chime(n: number) {
    pop(2 + n, 0.75);
    setTimeout(() => pop(4 + n, 0.7), 70);
    setTimeout(() => pop(7, 0.8), 150);
  }
  function sparkleAt(x: number, y: number, z: number, n: number, sp: number) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      emit({
        x,
        y,
        z,
        vx: Math.cos(a) * sp,
        vy: (Math.random() - 0.2) * sp * 1.4,
        vz: Math.sin(a) * sp,
        life: 0.7 + Math.random() * 0.5,
        size: 0.15,
        color: sparkle,
        intensity: readableIntensity(),
        drag: 1,
        gravity: 2,
        shrink: 0.5,
      });
    }
  }

  const brass = new THREE.Color('#ffe08a');
  /** Place's updateFinds: each find turns where it lies until you walk into it, and is saved the moment you do. */
  function updateGold(now: number, b: typeof me.body) {
    for (const [k, f] of gold.entries()) {
      if (store.hasFind(f.id)) {
        golds.setMatrixAt(k, ZERO);
        continue;
      }
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, now * 0.002 + k);
      golds.setMatrixAt(k, m.compose(v.set(f.x, f.y, f.z), q, s.setScalar(1)));
      if (!b || Math.hypot(b.position.x - f.x, b.position.z - f.z) > FIND_REACH) continue;
      if (Math.abs(b.position.y - f.y) > FIND_HEIGHT || !store.takeFind(f.id)) continue;
      golds.setMatrixAt(k, ZERO);
      clank(f.x, f.z);
      playMark('find found', { id: f.id, n: store.finds().length });
      for (let n = 0; n < 14; n++) {
        const a = (n / 14) * Math.PI * 2;
        emit({
          x: f.x,
          y: f.y,
          z: f.z,
          vx: Math.cos(a) * 3.2,
          vy: 3 + (n % 3),
          vz: Math.sin(a) * 3.2,
          life: 0.8,
          size: 0.3,
          color: brass,
          intensity: readableIntensity(),
          gravity: 7,
          shrink: 0.4,
        });
      }
    }
    golds.instanceMatrix.needsUpdate = true;
  }

  function update({ dt, now }: FrameCtx) {
    followShelf();
    const b = me.body;
    updateGold(now, b);
    for (const [k, c] of items.entries()) {
      if (c.state === 2) {
        world.setMatrixAt(k, ZERO);
        continue;
      }
      let x = c.x,
        y = c.y + Math.sin(now * 0.002 + k) * 0.12,
        z = c.z,
        scale = 1;
      if (c.state === 0 && b) {
        const d = Math.hypot(b.position.x - c.x, b.position.z - c.z);
        if (d < SPARKLE_NEAR && Math.random() < dt * 1.5) sparkleAt(c.x, c.y, c.z, 1, 0.7);
        // Found the moment it starts to come (saved before the show; flying first, so the store's echo leaves it be).
        if (d < MAGNET && Math.abs(b.position.y - c.y) < 4 && !store.hasCrystal(k)) {
          c.state = 1;
          c.t = 0;
          c.fx = c.x;
          c.fy = y;
          c.fz = c.z;
          store.takeCrystal(k);
          pop(1, 0.5);
          playMark('crystal found', { k, n: store.crystals().length });
        }
      } else if (c.state === 1 && b) {
        // Slowly, then all at once.
        c.t += dt / FLY;
        const u = Math.min(1, c.t),
          e = u * u * u;
        const p = b.interpolatedPosition;
        x = c.fx + (p.x - c.fx) * e;
        y = c.fy + (p.y + 0.5 - c.fy) * e + Math.sin(u * Math.PI) * 0.9;
        z = c.fz + (p.z - c.fz) * e;
        scale = 1 - e * 0.5;
        if (Math.random() < 0.6) sparkleAt(x, y, z, 1, 0.5);
        if (u >= 1) {
          c.state = 2;
          drawRow();
          chime(landed());
          sparkleAt(p.x, p.y + 0.6, p.z, 26, 3.6);
          world.setMatrixAt(k, ZERO);
          continue;
        }
      }
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, now * 0.0011 + k + (c.state === 1 ? c.t * 9 : 0));
      world.setMatrixAt(k, m.compose(v.set(x, y, z), q, s.setScalar(scale)));
    }
    world.instanceMatrix.needsUpdate = true;
  }

  owner.cleanup(() => {
    row.removeFromParent();
    lit.removeFromParent();
    pins.removeFromParent();
    row.dispose();
    lit.dispose();
    pins.dispose();
    stubGeo.dispose();
    trinketGeo.dispose();
    trinketMat.dispose();
    glowMat.dispose();
    dullMat.dispose();
  });
  return {
    root: owner.root,
    update,
    inspect: (): FindsViewInspection => ({
      spots: items.map((c) => ({ x: c.x, y: c.y, z: c.z, state: c.state })),
      lit: shelf ? lit.count : 0,
      onShelf: !!shelf,
      gold: gold.map((f) => ({ id: f.id, x: f.x, y: f.y, z: f.z, found: store.hasFind(f.id) })),
      pinned: shelf ? pinned() : 0,
    }),
    dispose: () => owner.dispose(),
  };
}
export type FindsView = Awaited<ReturnType<typeof createFindsView>>;
