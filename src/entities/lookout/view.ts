// The lookout: the brass telescope on the ridge and the line of orange buoys out from the pier, both pointing across the
// sea at Ring Island. Local: no state, no sync. Ported from Place's props.ts and telescope.ts, fixed view only (6 November).
// Every thing is a record (content/prefabs/lookout.ts), standing where content/levels/lookout.ts puts it.
import * as THREE from 'three/webgpu';
import { createOwnedView } from '../../render/owned-view.ts';
import { camera } from '../../render/scene.ts';
import { camConstraints, camForward, me } from '../../player/player.ts';
import { openModal, closeModal } from '../../player/modal.ts';
import type { Interactable } from '../../player/hands.ts';
import type { FrameCtx } from '../../loop.ts';
import { railwayWorldRead } from '../railway/state.ts';
import { aperture } from '../../sim/railway-rows.ts';
import { ringOpen } from '../../sim/railway-queries.ts';
import { buoyLifted } from '../railway/railhead-shape.ts';
import { splash } from '../../render/splash.ts';
import { SEA } from '../../constants.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import type { Placement, Vec3 } from '../../prefab/types.ts';
import level from '../../../content/built/levels/lookout.json' with { type: 'json' };
import './telescope.css';

/** The fixed view, from the eyepiece to `target` (world metres, degrees). It never pans; only the zoom changes. `ahead`
 * starts the view just past the barrel's end. */
const telescopeTuning = {
  // Ring Island left of centre, the buoys running from the pier's end (the right edge) towards it.
  target: new THREE.Vector3(1330, 0, -700),
  ahead: 2.5,
  fov: 48,
  minZoom: 1,
  maxZoom: 2,
};
const NONE: Interactable[] = [];
const point = (key: 'lookout.telescope' | 'lookout.buoy', name: string): Vec3 => {
  const a = definitions[key]?.attach?.[name];
  if (a?.kind !== 'point') throw new Error(`lookout: ${key} has no point ${name}`);
  return a.at;
};

export type LookoutView = Awaited<ReturnType<typeof createLookoutView>>;

export async function createLookoutView() {
  const owner = createOwnedView();
  const [layout, terrain, sites] = await Promise.all([
    import('../../place/layout.ts'),
    import('../../place/terrain.ts'),
    import('../../place/sites.ts'),
  ]);
  const { ORIGIN, FAR, LINES } = layout;
  const ring = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };
  const placements = loadLevelArtifact(level, definitions).placements;

  // ---------------------------------------------------------------- the telescope on the ridge's top
  const scope = placements.find((p) => p.prefab === 'lookout.telescope');
  if (!scope) throw new Error('lookout: no telescope placed');
  const SX = scope.pos[0] + ORIGIN.x,
    SZ = scope.pos[2],
    SY = terrain.H(SX, SZ) + scope.pos[1];
  const eyeAt = point('lookout.telescope', 'eye');
  const eye = new THREE.Vector3(SX + eyeAt[0], SY + eyeAt[1], SZ + eyeAt[2]);
  const aim = new THREE.Vector3().subVectors(telescopeTuning.target, eye);
  const telescope = instantiate(
    scope.prefab,
    { ...scope, pos: [SX, SY, SZ], params: { aim: Math.atan2(aim.x, aim.z) } },
    {
      owner,
      handlers: {
        'lookout.look': () => {
          const b = me.body;
          if (!b || open) return NONE;
          return Math.hypot(b.position.x - scopeAt.x, b.position.z - scopeAt.z) < 3.4 ? target : NONE;
        },
      },
    },
  );
  telescope.setEnabled(true);
  sites.addFoot(SX, SZ, 0, 0.8, 0.8, owner);
  const scopeAt = telescope.attach('eyepiece').at;
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
  // Each is a slot in two instanced draws (the cones, the white tops); the lookout bobs them every frame.
  const moorings = placements.filter((p) => p.prefab === 'lookout.buoy');
  const cones = createPrefabBatch('lookout.buoy', moorings.length, owner),
    tops = createPrefabBatch('lookout.buoy-top', moorings.length, owner);
  const buoys = cones.mesh,
    buoyTops = tops.mesh;
  const topUp = point('lookout.buoy', 'top')[1];
  const buoyAt: { x: number; y: number; z: number }[] = [];
  {
    const end = layout.lineAt(LINES.east, LINES.east.len, { x: 0, z: 0, ux: 0, uz: 1 });
    const x0 = end.x + ORIGIN.x,
      z0 = end.z + ORIGIN.z,
      dx = ring.x - x0,
      dz = ring.z - z0,
      d = Math.hypot(dx, dz);
    moorings.forEach((p, k) => {
      const { gaps, gap } = p.params ?? {};
      if (typeof gaps !== 'number' || typeof gap !== 'number') throw new Error(`lookout: ${p.id} has no mooring`);
      const u = gaps * gap;
      const q = { x: x0 + (dx / d) * u, y: p.pos[1], z: z0 + (dz / d) * u };
      buoyAt.push(q);
      const at: Placement = { id: p.id, prefab: p.prefab, pos: [q.x, q.y, q.z] };
      const top: Placement = { id: `${p.id}/top`, prefab: 'lookout.buoy-top', pos: [q.x, q.y + topUp, q.z] };
      instantiate(p.prefab, at, { owner, batch: { target: cones, index: k } }).setEnabled(true);
      instantiate(top.prefab, top, { owner, batch: { target: tops, index: k } }).setEnabled(true);
    });
  }
  const bo = new THREE.Object3D();
  /** Per buoy: 0 afloat, 1 lifted out and gone (ring-island-build1, R4b; RING_BUOYS): the bents stand where the first
   * ones float, so each is lifted off its mooring as the railhead reaches it, with a splash. Restored: gone at once. */
  const lift = buoyAt.map(() => 0);
  const lifted = buoyAt.map(() => false);
  let known = false;
  function readLifted(dt: number) {
    // The world is taken again every call: a published world is never written.
    const w = railwayWorldRead()?.world();
    const live = !!w;
    const head = w ? ringOpen(w).head : 0,
      joined = !!w && aperture(w).joined >= 0;
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
      bo.position.set(q.x, q.y + up + raised, q.z);
      bo.rotation.set(Math.sin(now * 0.0009 + k) * 0.08, 0, Math.cos(now * 0.0011 + k) * 0.08 + lift[k]! * 0.9);
      bo.updateMatrix();
      buoys.setMatrixAt(n, bo.matrix);
      bo.position.y += topUp;
      bo.updateMatrix();
      buoyTops.setMatrixAt(n++, bo.matrix);
    });
    buoys.count = buoyTops.count = n;
    buoys.instanceMatrix.needsUpdate = buoyTops.instanceMatrix.needsUpdate = true;
  }
  updateBuoys(0);

  return {
    root: owner.root,
    targets: () => telescope.targets(),
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
