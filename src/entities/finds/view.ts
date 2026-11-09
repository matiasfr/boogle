// The finds you walk into on the production railway, drawn: K1's seven crystals (docs/game-design/place.md, "Crystals").
// Each stands at a spot worth stopping at, the same blue as the far island's shard, slowly turning and bobbing, with a
// sparkle now and then once you're within 40 m. Walk within 4.2 m and it comes to you, slowly then all at once (0.34 s),
// and lands with a chime and a burst, and a dull stub on the curio shelf's bottom row lights up. Ported from Place's
// crystals.ts. What you found is ./state.ts's; where it stands, the flight and the shelf row are Local.
// The shelf belongs to the town (../town/state.ts `townShelf`): the row goes on it whenever one is mounted.
// When pillars come (open question 19's crystals), these get a distinct name or look (place-retirement designer finding
// 4); nothing here names them beyond this entity.
import * as THREE from 'three/webgpu';
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

export async function createFindsView(store: FindsApi) {
  const owner = createOwnedView();
  owner.root.name = 'finds';
  const [{ H }, { toWorld }, { pop }] = await Promise.all([
    import('../../proto/place/land.ts'),
    import('../../proto/place/layout.ts'),
    import('../../proto/minis/common.ts'),
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
  function followShelf() {
    const now = townShelf();
    if (now === shelf) return;
    row.removeFromParent();
    lit.removeFromParent();
    shelf = now;
    if (!shelf) return;
    shelf.shelfGroup.add(row, lit);
    drawRow();
  }
  // Another tab of this player found one, a reload, or a find taken from outside the view: take what the store says,
  // without the show. One already flying lands as it would.
  owner.cleanup(
    store.onFinds(() => {
      for (const [k, c] of items.entries()) if (c.state !== 1) c.state = store.hasCrystal(k) ? 2 : 0;
      drawRow();
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

  function update({ dt, now }: FrameCtx) {
    followShelf();
    const b = me.body;
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
    row.dispose();
    lit.dispose();
    stubGeo.dispose();
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
    }),
    dispose: () => owner.dispose(),
  };
}
export type FindsView = Awaited<ReturnType<typeof createFindsView>>;
