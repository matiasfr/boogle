// The lookout: the brass telescope on the ridge and the line of orange buoys out from the pier, both pointing across the
// sea at Ring Island. Local: no state, no sync. Ported from Place's props.ts and telescope.ts, fixed view only (6 November).
import * as THREE from 'three/webgpu';
import { createOwnedView } from '../../render/owned-view.ts';
import { camera } from '../../render/scene.ts';
import { camConstraints, camForward, me } from '../../player/player.ts';
import { openModal, closeModal } from '../../player/modal.ts';
import type { Interactable } from '../../player/hands.ts';
import type { FrameCtx } from '../../loop.ts';
import { railwayRead } from '../railway/state.ts';
import { buoyLifted } from '../railway/railhead-shape.ts';
import { splash } from '../../render/splash.ts';
import { SEA } from '../../constants.ts';
import './telescope.css';

/** Place's 12 buoys, cut to 7: the last five stood inside Ring Island's hills (land.ts buildFar, 340 m round the shard). The
 * seventh floats about 20 m off its waterline, so the line runs right up to the island. */
const BUOYS = { n: 7, gap: 62 };
/** Place's SCOPE (-30, -205) stood among the ridge-top pines, two of them within 5 m, and one 15 m off blocked the view.
 * Moved 15 m east, still on the ridge's top (about 49 m), where the slope north-east is open down to the sea. */
const SCOPE = { x: -15, z: -207 };
/** The fixed view, from the eyepiece to `target` (world metres, degrees). It never pans; only the zoom changes. `ahead`
 * starts the view just past the barrel's end. */
export const telescopeTuning = {
  // Ring Island left of centre, the buoys running from the pier's end (the right edge) towards it.
  target: new THREE.Vector3(1330, 0, -700),
  ahead: 2.5,
  fov: 48,
  minZoom: 1,
  maxZoom: 2,
};
const NONE: Interactable[] = [];

export type LookoutView = Awaited<ReturnType<typeof createLookoutView>>;

export async function createLookoutView() {
  const owner = createOwnedView();
  const [layout, land, sites, { flat }] = await Promise.all([
    import('../../place/layout.ts'),
    import('../../place/land.ts'),
    import('../../place/sites.ts'),
    import('../../render/flat.ts'),
  ]);
  const { ORIGIN, FAR, LINES } = layout;
  const ring = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };

  // ---------------------------------------------------------------- the telescope on the ridge's top
  const SX = SCOPE.x + ORIGIN.x,
    SZ = SCOPE.z,
    SY = land.H(SX, SZ);
  const eye = new THREE.Vector3(SX, SY + 2.57, SZ);
  const aim = new THREE.Vector3().subVectors(telescopeTuning.target, eye);
  {
    const g = new THREE.Group();
    g.position.set(SX, SY, SZ);
    const brass = flat('#d9a23a', 0.3);
    const leg = flat('#7f5630');
    for (const a of [0, 2.1, 4.2]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), leg);
      l.position.set(Math.sin(a) * 0.55, 1.15, Math.cos(a) * 0.55);
      l.rotation.set(Math.cos(a) * -0.42, 0, Math.sin(a) * 0.42);
      l.castShadow = true;
      g.add(l);
    }
    const tube = new THREE.Group();
    tube.position.y = 2.45;
    // The barrel points where the view looks, so what you see is what it's aimed at.
    tube.rotation.y = Math.atan2(aim.x, aim.z);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.8, 12).rotateX(Math.PI / 2), brass);
    barrel.rotation.x = -0.12;
    barrel.position.z = 0.5;
    barrel.castShadow = true;
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 10).rotateX(Math.PI / 2), flat('#3a3d44'));
    eye.position.set(0, 0.12, -1);
    tube.add(barrel, eye);
    g.add(tube);
    owner.add(g);
    land.addStatic(
      { kind: 'cylinder', rTop: 0.6, rBottom: 0.6, h: 2.6, segments: 6 },
      { x: SX, y: SY + 1.3, z: SZ },
      undefined,
      undefined,
      owner,
    );
    sites.addFoot(SX, SZ, 0, 0.8, 0.8, owner);
  }
  const scopeAt = new THREE.Vector3(SX, SY + 2.4, SZ);
  // ---------------------------------------------------------------- the view through it
  let open = false,
    zoom = 1,
    previousFov = 60,
    previousFocus: HTMLElement | null = null;
  const forward = new THREE.Vector3();
  function constrain(look: THREE.Vector3, pos: THREE.Vector3) {
    aim.subVectors(telescopeTuning.target, eye).normalize();
    pos.copy(eye).addScaledVector(aim, telescopeTuning.ahead);
    // The camera owner adds its ordinary eight-metre look offset after constraints.
    look.copy(pos).addScaledVector(aim, 100).addScaledVector(camForward(forward), -8);
    camera.fov = telescopeTuning.fov / zoom;
    camera.updateProjectionMatrix();
    return true;
  }
  const panel = document.createElement('div');
  panel.className = 'telescope-view';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Telescope');
  panel.setAttribute('aria-modal', 'true');
  const bar = document.createElement('div');
  panel.append(bar);
  function button(label: string, action: () => void) {
    const el = document.createElement('button');
    el.textContent = label;
    el.onclick = action;
    bar.append(el);
    return el;
  }
  const magnify = (delta: number) =>
    (zoom = Math.max(telescopeTuning.minZoom, Math.min(telescopeTuning.maxZoom, zoom + delta)));
  button('−', () => magnify(-0.1)).ariaLabel = 'Zoom out';
  button('+', () => magnify(0.1)).ariaLabel = 'Zoom in';
  const leave = button('Step back', stepBack);
  // Keep pointer/wheel input in the view, including the opening touch release.
  for (const event of ['pointerdown', 'pointerup', 'pointermove', 'wheel'])
    panel.addEventListener(event, (e) => e.stopPropagation());

  function stepBack() {
    if (!open) return;
    open = false;
    camConstraints.splice(camConstraints.indexOf(constrain), 1);
    camera.fov = previousFov;
    camera.updateProjectionMatrix();
    panel.remove();
    document.body.classList.remove('telescope-open');
    closeModal();
    previousFocus?.focus();
  }
  function command(key: string) {
    if (['Escape', 'KeyE', 'b', 'x', 'menu'].includes(key)) stepBack();
    if (['Equal', 'NumpadAdd', 'rb'].includes(key)) magnify(0.1);
    if (['Minus', 'NumpadSubtract', 'lb'].includes(key)) magnify(-0.1);
  }
  const slot = { back: 'b', interact: 'b', zoomIn: 'rb', zoomOut: 'lb' } as const;
  function lookThrough() {
    if (open) return;
    const opened = openModal({
      onKey: (e) => {
        e.preventDefault();
        if (e.key === 'tab') {
          const buttons = [...bar.querySelectorAll('button')];
          const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[(at + (e.shift ? -1 : 1) + buttons.length) % buttons.length]?.focus();
          return;
        }
        if (e.key === 'confirm') {
          if (!e.repeat && document.activeElement instanceof HTMLButtonElement) document.activeElement.click();
          return;
        }
        if (e.repeat && (e.key === 'back' || e.key === 'interact')) return;
        if (e.key && e.key in slot) command(slot[e.key as keyof typeof slot]);
      },
      onPad: command,
    });
    if (!opened) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousFov = camera.fov;
    zoom = 1;
    open = true;
    // Cut straight to the same composition every time, reduced motion included. Nothing drifts and nothing times out.
    camConstraints.unshift(constrain);
    document.body.classList.add('telescope-open');
    document.body.append(panel);
    leave.focus();
  }
  owner.cleanup(stepBack);
  const target: Interactable[] = [{ id: 'place-scope', verb: 'Look through it', at: scopeAt, run: lookThrough }];

  // ---------------------------------------------------------------- the buoys
  // A line of orange buoys out from the end of the pier, bobbing, straight at Ring Island. Plain as a pointing finger.
  const buoys = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 2.4, 7), flat('#ff7a1a', 0.5), BUOYS.n);
  const buoyTops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 8, 6), flat('#fff0c9', 0.5), BUOYS.n);
  buoys.castShadow = true;
  buoys.frustumCulled = buoyTops.frustumCulled = false;
  owner.add(buoys, buoyTops);
  const buoyAt: { x: number; z: number }[] = [];
  {
    const end = layout.lineAt(LINES.east, LINES.east.len, { x: 0, z: 0, ux: 0, uz: 1 });
    const x0 = end.x + ORIGIN.x,
      z0 = end.z + ORIGIN.z,
      dx = ring.x - x0,
      dz = ring.z - z0,
      d = Math.hypot(dx, dz);
    for (let k = 0; k < BUOYS.n; k++) {
      const u = (k + 0.6) * BUOYS.gap;
      buoyAt.push({ x: x0 + (dx / d) * u, z: z0 + (dz / d) * u });
    }
  }
  const bo = new THREE.Object3D();
  /** Per buoy: 0 afloat, 1 lifted out and gone (ring-island-build1, R4b; RING_BUOYS): the bents stand where the first
   * ones float, so each is lifted off its mooring as the railhead reaches it, with a splash. Restored: gone at once. */
  const lift = buoyAt.map(() => 0);
  const lifted = buoyAt.map(() => false);
  let known = false;
  function readLifted(dt: number) {
    const ring = railwayRead()?.ring;
    const head = ring?.head ?? 0,
      joined = !!ring && ring.joined >= 0;
    const live = !!ring;
    buoyAt.forEach((q, k) => {
      const want = live && buoyLifted(k, head, joined);
      if (want === lifted[k]) return;
      lifted[k] = want;
      if (!known) lift[k] = want ? 1 : 0;
      else if (want) splash(q.x, q.z, 1, SEA);
    });
    known ||= live;
    buoyAt.forEach((_, k) => {
      lift[k] = Math.max(0, Math.min(1, lift[k]! + (lifted[k] ? 1 : -1) * dt * 0.8));
    });
  }
  function updateBuoys(now: number, dt = 0) {
    readLifted(dt);
    let n = 0;
    buoyAt.forEach((q, k) => {
      if (lift[k]! >= 1) return;
      const up = Math.sin(now * 0.0012 + k * 1.3) * 0.25;
      const raised = lift[k]! * lift[k]! * 14;
      bo.position.set(q.x, 0.7 + up + raised, q.z);
      bo.rotation.set(Math.sin(now * 0.0009 + k) * 0.08, 0, Math.cos(now * 0.0011 + k) * 0.08 + lift[k]! * 0.9);
      bo.updateMatrix();
      buoys.setMatrixAt(n, bo.matrix);
      bo.position.y += 1.45;
      bo.updateMatrix();
      buoyTops.setMatrixAt(n++, bo.matrix);
    });
    buoys.count = buoyTops.count = n;
    buoys.instanceMatrix.needsUpdate = buoyTops.instanceMatrix.needsUpdate = true;
  }
  updateBuoys(0);

  return {
    root: owner.root,
    targets() {
      const b = me.body;
      if (!b || open) return NONE;
      return Math.hypot(b.position.x - scopeAt.x, b.position.z - scopeAt.z) < 3.4 ? target : NONE;
    },
    update(ctx: FrameCtx) {
      updateBuoys(ctx.now, ctx.dt);
    },
    inspect: () => ({
      open,
      zoom,
      buoys: buoyAt.length - lifted.filter(Boolean).length,
      lifted: lifted.filter(Boolean).length,
      scope: { x: SX, y: SY, z: SZ },
    }),
    dispose: () => owner.dispose(),
  };
}
