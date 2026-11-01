// The ghost: your best run of the soapbox course, replayed as a see-through cart beside you on the next one, on the run
// clock (Trackmania's ghost; docs/research/minigames-and-physics-minigames.md, shortlist #1). Recorded at 20 Hz while
// the clock runs, kept in localStorage for this browser only, replaced whenever a run beats it. Local and cosmetic:
// never synced, never read by the cart.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { makeCart, poseCart, type Cart } from './cart-mesh.ts';

const KEY = 'boogle.soapbox.ghost';
const HZ = 20;
const W = 8; // numbers per frame: x, y, z, qx, qy, qz, qw, front wheel angle

type Saved = { v: 1; time: number; f: number[] };
function load(): Saved | null {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null;
    return g?.v === 1 && Number.isFinite(g.time) && Array.isArray(g.f) && g.f.length >= W * 2 ? g : null;
  } catch {
    return null;
  }
}

const ghostMat = new THREE.MeshStandardMaterial({
  color: '#bfe6ff',
  emissive: '#5aa8e0',
  emissiveIntensity: 0.35,
  roughness: 0.6,
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
});

export function createGhost() {
  let best = load();
  let rec: number[] = [];
  let mesh: Cart | null = null;
  const pa = new THREE.Vector3(),
    qa = new THREE.Quaternion(),
    qb = new THREE.Quaternion();
  let lastX = 0,
    lastZ = 0;

  function ensureMesh() {
    if (mesh) return mesh;
    mesh = makeCart();
    mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = ghostMat;
        m.castShadow = m.receiveShadow = false;
      }
    });
    mesh.renderOrder = 2;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  return {
    /** The saved best run's time (s), or 0 without one. */
    get time() {
      return best?.time ?? 0;
    },
    /** A run's clock started: recording from frame 0. */
    begin() {
      rec = [];
    },
    /** Each frame while the clock runs: keep a pose per 1/20 s of run time. */
    record(t: number, p: THREE.Vector3, q: THREE.Quaternion, wheel: number) {
      if (rec.length / W > t * HZ) return;
      const r = (x: number, k: number) => Math.round(x * k) / k;
      rec.push(
        r(p.x, 100),
        r(p.y, 100),
        r(p.z, 100),
        r(q.x, 1e3),
        r(q.y, 1e3),
        r(q.z, 1e3),
        r(q.w, 1e3),
        r(wheel, 100),
      );
    },
    /** The run finished in `t` s: returns the split against the ghost (s, + is slower; null without one) and keeps
     * this run as the ghost if it is the new best. */
    finish(t: number) {
      const split = best ? t - best.time : null;
      if ((!best || t < best.time) && rec.length >= W * 2) {
        best = { v: 1, time: Math.round(t * 1000) / 1000, f: rec };
        try {
          localStorage.setItem(KEY, JSON.stringify(best));
        } catch {
          // storage unavailable: the ghost lasts this visit
        }
      }
      rec = [];
      return split;
    },
    /** Each frame: show the ghost at run time `t` (null hides it). It waits at its first frame until the clock
     * starts, and is gone a second after its own finish. */
    show(t: number | null, dt: number) {
      if (!best || t === null) {
        if (mesh) mesh.visible = false;
        return;
      }
      const g = ensureMesh();
      const f = best.f,
        n = f.length / W;
      const x = Math.max(0, t * HZ);
      if (x > n - 1 + HZ) {
        g.visible = false; // a second past its finish: gone
        return;
      }
      const i = Math.min(Math.floor(x), n - 1),
        j = Math.min(i + 1, n - 1),
        u = Math.min(1, x - i);
      const a = i * W,
        b = j * W;
      pa.set(f[a] + (f[b] - f[a]) * u, f[a + 1] + (f[b + 1] - f[a + 1]) * u, f[a + 2] + (f[b + 2] - f[a + 2]) * u);
      qa.set(f[a + 3], f[a + 4], f[a + 5], f[a + 6]).normalize();
      qb.set(f[b + 3], f[b + 4], f[b + 5], f[b + 6]).normalize();
      g.position.copy(pa);
      g.quaternion.slerpQuaternions(qa, qb, u);
      const moved = g.visible ? Math.hypot(pa.x - lastX, pa.z - lastZ) : 0;
      lastX = pa.x;
      lastZ = pa.z;
      poseCart(g, f[a + 7] + (f[b + 7] - f[a + 7]) * u, dt > 0 ? moved : 0);
      g.visible = true;
    },
  };
}
