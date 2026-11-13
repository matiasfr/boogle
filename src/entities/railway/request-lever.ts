// A platform's request lever (docs/plans/works-late-game.md, step 1; generic-lines, v26): a cast frame with one handle
// for that platform's way, on an enamel plaque naming the end it goes to, and a lamp on the frame. A pulled handle
// stays over while its request stands and springs back when a train stops for it. A lever whose platform no train
// stands at yet (Far Head's up one, until the pier is laid) hangs chained and padlocked at rest. Local: it draws the
// request state the server holds; the press itself is the halt view's.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';

const IRON = '#30333a',
  RED = '#d23a2a',
  PAPER = '#f4ecd8',
  INK = '#1f3a6b',
  LAMP_OFF = '#4a3a20',
  LAMP_ON = '#ffb02e';
/** Handle tilt (rad about the frame's across axis): upright-ish at rest, over when pulled. */
const REST = -0.35,
  OVER = 0.75,
  SWING_S = 0.12;
const HANDLE_GAP = 0.26;

function plaqueTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, 256, 96);
  g.strokeStyle = INK;
  g.lineWidth = 8;
  g.strokeRect(4, 4, 248, 88);
  g.fillStyle = INK;
  g.font = 'bold 46px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 50, 232);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** `side` is +1 when the frame's local +x points at the rails; the plaques face the other way, onto the platform.
 * `plaque` scales the plaque (24 by 9 cm at 1): a stack head's two levers stand side by side on one platform and are
 * told apart by their plaques from across it, so theirs are twice the size. */
export function createRequestLever(owner: OwnedView, handles: number, side: number, plaque = 1) {
  const group = new THREE.Group();
  const iron = new THREE.MeshStandardNodeMaterial({ color: IRON, roughness: 0.6, metalness: 0.4 });
  const red = new THREE.MeshStandardNodeMaterial({ color: RED, roughness: 0.5 });
  const lampMat = new THREE.MeshBasicNodeMaterial({ color: LAMP_OFF });
  const box = (w: number, h: number, d: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true;
    return m;
  };
  const width = 0.3 + HANDLE_GAP * handles;
  // The frame: a low cast plinth, two cheeks and a quadrant along the top the handles throw across.
  const plinth = box(0.34, 0.12, width + 0.1, iron);
  plinth.position.y = 0.06;
  group.add(plinth);
  const body = box(0.22, 0.62, width, iron);
  body.position.y = 0.43;
  group.add(body);
  const lamp = box(0.14, 0.14, 0.14, lampMat);
  lamp.position.set(0, 0.84, width / 2 - 0.05);
  group.add(lamp);
  const plaques: { mesh: THREE.Mesh; map: THREE.CanvasTexture | null; text: string }[] = [];
  const arms = Array.from({ length: handles }, (_, i) => {
    const z = (i - (handles - 1) / 2) * HANDLE_GAP;
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.74, z);
    const rod = box(0.05, 0.62, 0.05, iron);
    rod.position.y = 0.31;
    const knob = box(0.09, 0.12, 0.09, red);
    knob.position.y = 0.64;
    pivot.add(rod, knob);
    pivot.rotation.x = REST;
    group.add(pivot);
    const plaqueMat = new THREE.MeshBasicNodeMaterial({ color: '#ffffff' });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.24 * plaque, 0.09 * plaque), plaqueMat);
    face.position.set(-side * 0.115, 0.5, z);
    face.rotation.y = -side * (Math.PI / 2);
    group.add(face);
    plaques.push({ mesh: face, map: null, text: '' });
    return { pivot, angle: REST };
  });
  // The chain: links from the first handle's rod down to the plinth, and a padlock on it. Hidden unless chained.
  const chain = new THREE.Group();
  const linkMat = new THREE.MeshStandardNodeMaterial({ color: '#8b8f96', roughness: 0.45, metalness: 0.7 });
  const brass = new THREE.MeshStandardNodeMaterial({ color: '#c79a3e', roughness: 0.4, metalness: 0.6 });
  {
    const z0 = arms.length ? -((handles - 1) / 2) * HANDLE_GAP : 0;
    const top = new THREE.Vector3(-side * 0.05, 1.0, z0),
      foot = new THREE.Vector3(-side * 0.2, 0.12, z0 + 0.12);
    const LINKS = 7;
    for (let i = 0; i < LINKS; i++) {
      const link = box(0.035, 0.1, i % 2 ? 0.06 : 0.02, linkMat);
      link.position.lerpVectors(top, foot, (i + 0.5) / LINKS);
      link.rotation.z = side * 0.18;
      chain.add(link);
    }
    const lock = box(0.08, 0.1, 0.05, brass);
    lock.position.lerpVectors(top, foot, 0.55).add(new THREE.Vector3(-side * 0.04, 0, 0));
    chain.add(lock);
  }
  chain.visible = false;
  group.add(chain);
  owner.add(group);
  owner.cleanup(() => {
    linkMat.dispose();
    brass.dispose();
    iron.dispose();
    red.dispose();
    lampMat.dispose();
    for (const p of plaques) {
      p.map?.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
  });
  const knobAt = new THREE.Vector3();
  return {
    group,
    /** Handle `i`'s plaque: the end its way goes to (empty hides it). */
    label(i: number, text: string) {
      const p = plaques[i];
      if (!p || p.text === text) return;
      p.text = text;
      p.map?.dispose();
      p.map = text ? plaqueTexture(text) : null;
      const mat = p.mesh.material as THREE.MeshBasicNodeMaterial;
      mat.map = p.map;
      mat.needsUpdate = true;
      p.mesh.visible = !!text;
    },
    /** Whether handle `i` is there at all (Far Head's way out to the pier, before Q6). */
    shown(i: number, on: boolean) {
      const a = arms[i];
      if (a) a.pivot.visible = on;
      const p = plaques[i];
      if (p) p.mesh.visible = on && !!p.text;
    },
    /** Chained and padlocked at rest: no train stands at this platform yet. */
    chained(on: boolean) {
      chain.visible = on;
    },
    /** Each handle over or back, and the lamp lit while any is over; eased unless `snap`. A chained lever stays back. */
    update(dt: number, over: readonly boolean[], snap = false) {
      arms.forEach((a, i) => {
        const want = over[i] && !chain.visible ? OVER : REST;
        a.angle = snap
          ? want
          : a.angle + Math.sign(want - a.angle) * Math.min(Math.abs(want - a.angle), (dt / SWING_S) * (OVER - REST));
        a.pivot.rotation.x = a.angle;
      });
      lampMat.color.set(over.some(Boolean) ? LAMP_ON : LAMP_OFF);
    },
    /** World position of handle `i`'s knob (the Interact target). */
    knob(i: number, out = knobAt) {
      const a = arms[i]!;
      out.set(0, 0.64, 0);
      return a.pivot.localToWorld(out);
    },
  };
}
export type RequestLever = ReturnType<typeof createRequestLever>;
