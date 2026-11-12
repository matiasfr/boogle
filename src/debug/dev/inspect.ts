import { Group, Mesh, BoxGeometry, SphereGeometry, MeshBasicNodeMaterial, Vector3, Quaternion } from 'three/webgpu';
import { inspect } from '../../entity/inspect.ts';
import { defineKind, spawn, despawn, type GameEntity } from '../../entity/entity.ts';
import { forEachStatic } from '../../physics/engine.ts';
import { waterField } from '../../physics/water-field.ts';
import { waterRuntime } from '../../render/water-render.ts';
import { me } from '../../player/state.ts';
import { productionRailway } from '../../proto/flags.ts';
import { inspectRailway, railwayWorldRead } from '../../entities/railway/state.ts';
import { el, command, note, more } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

/** The railway as the dev dump shows it: the view's inspection (scene walk and session scalars) and the rows as stored,
 * `world.snapshot()`, generic over the components. Built per call; null until the railway is mounted. */
export function railwayDump() {
  const view = inspectRailway();
  const read = railwayWorldRead();
  return view && read ? { ...view, rows: read.world().snapshot() } : null;
}

let overlay: GameEntity | null = null;
let mounted = false;
let latest: unknown = null;
defineKind('dev-inspect', { update: 10 });
defineKind('dev-colliders', {});
export async function inspectSummary() {
  const entities = inspect();
  const p = me.body?.position;
  return {
    entities: {
      frames: entities.frames,
      frame: entities.frame,
      kinds: entities.kinds.map((k) => ({ kind: k.kind, count: k.count, ms: k.ms })),
    },
    player: p ? { x: p.x, y: p.y, z: p.z, swimming: me.swimming } : null,
    water: p ? waterField.nearby(p) : null,
    waterRuntime: waterRuntime.inspect(),
    place: productionRailway ? railwayDump() : null,
    queryNote: 'Synchronous nearby water query only; no new GPU readback requested.',
  };
}
function clearOverlay() {
  if (overlay) despawn(overlay);
  overlay = null;
}
function showOverlay() {
  if (!mounted || !me.body) return no('Open Inspect first.');
  clearOverlay();
  const group = new Group();
  const material = new MeshBasicNodeMaterial({
    color: 0x86ffd8,
    wireframe: true,
    depthTest: false,
    transparent: true,
    opacity: 0.65,
  });
  const geometries: (BoxGeometry | SphereGeometry)[] = [];
  let count = 0;
  const p = me.body.position;
  forEachStatic(-1, (body, shapes) => {
    if (count >= 64) return;
    for (const shape of shapes) {
      if (count >= 64) break;
      const at = new Vector3(shape.offset?.x ?? 0, shape.offset?.y ?? 0, shape.offset?.z ?? 0)
        .applyQuaternion(body.quaternion)
        .add(body.position);
      const { x, y, z } = at;
      if (Math.hypot(x - p.x, y - p.y, z - p.z) > 30 || (shape.kind !== 'box' && shape.kind !== 'sphere')) continue;
      const geometry =
        shape.kind === 'box'
          ? new BoxGeometry(shape.hx * 2, shape.hy * 2, shape.hz * 2)
          : new SphereGeometry(shape.r, 8, 6);
      geometries.push(geometry);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.quaternion.copy(body.quaternion);
      if (shape.rotation)
        mesh.quaternion.multiply(
          new Quaternion(shape.rotation.x, shape.rotation.y, shape.rotation.z, shape.rotation.w),
        );
      group.add(mesh);
      count++;
    }
  });
  overlay = spawn({
    kind: 'dev-colliders',
    mesh: group,
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      material.dispose();
    },
  });
  return ok(
    `Showing ${count} nearby box/sphere colliders and static decks (30 m, cap 64). Heightfields and moving platforms are reported, not outlined.`,
    { count },
  );
}
export const tool: Tool = {
  id: 'inspect',
  label: 'Inspect and overlays',
  scope: 'Read-only Local inspection. Sampling and outlines stop when this page closes.',
  commands: ['read', 'overlay', 'clear'],
  available: () => null,
  async run(name) {
    if (name === 'overlay') return showOverlay();
    if (name === 'clear') {
      clearOverlay();
      return ok('Outlines removed.');
    }
    latest = await inspectSummary();
    return ok('Inspection sampled.', latest);
  },
  snapshot: () => latest,
  mount(parent, ctx) {
    mounted = true;
    const details = more(parent, 'Snapshot / details');
    note(
      details,
      'Water body, validity and sample age are shown separately. Nearby fallback is not a fresh GPU sample.',
    );
    command(parent, ctx, 'inspect', 'Refresh inspection', 'read');
    command(parent, ctx, 'inspect', 'Show nearby colliders / decks', 'overlay');
    command(parent, ctx, 'inspect', 'Hide overlays', 'clear');
    const output = el('pre', '', 'dev-output');
    details.append(output);
    parent.append(details);
    let elapsed = 0,
      busy = false,
      alive = true;
    const sample = async () => {
      if (busy) return;
      busy = true;
      try {
        latest = await inspectSummary();
        if (alive) output.textContent = JSON.stringify(latest, null, 2);
      } finally {
        busy = false;
      }
    };
    void sample();
    const sampler = spawn({
      kind: 'dev-inspect',
      update({ dt }) {
        elapsed += dt;
        if (elapsed >= 0.5) {
          elapsed = 0;
          void sample();
        }
      },
    });
    return () => {
      alive = false;
      mounted = false;
      despawn(sampler);
      clearOverlay();
    };
  },
};
