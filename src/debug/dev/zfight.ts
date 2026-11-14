// Local, dev-server only. No sampler/frame callback: the owner takes a snapshot with one tap.
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  Raycaster,
  Vector2,
  Vector3,
  DoubleSide,
} from 'three/webgpu';
import { camera, scene } from '../../render/scene.ts';
import { defineKind, spawn, despawn, type GameEntity } from '../../entity/entity.ts';
import { sceneFaces } from '../../geometry/drawn-faces.ts';
import { findZfights, ZFIGHT } from '../../geometry/zfight.ts';
import { classifyZfights, className, type Finding } from '../../geometry/zfight-classify.ts';
import { el, note, command } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

defineKind('dev-zfight', {});
let overlay: GameEntity | null = null;
let latest: { at: number[]; faces: number; findings: Finding[]; counts: { a: number; b: number; c: number } } | null =
  null;
let output: HTMLElement | null = null;
function clear() {
  if (overlay) despawn(overlay);
  overlay = null;
}
function scan(args: Record<string, unknown>) {
  if (!import.meta.env.DEV) return no('Z-fighting inspection requires the dev server.');
  clear();
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  const ray = new Raycaster();
  ray.far = 40;
  ray.setFromCamera(new Vector2(), camera);
  const hit = ray.intersectObjects(scene.children, true).find(({ object }) => {
    for (let o = object; o; o = o.parent!) if (!o.visible || o.userData.zfightOverlay) return false;
    return (
      object instanceof Mesh &&
      (Array.isArray(object.material) ? object.material : [object.material]).every(
        (m) => m.visible && !m.transparent && m.opacity === 1,
      )
    );
  });
  const requested = args.at;
  if (
    requested !== undefined &&
    (!Array.isArray(requested) ||
      requested.length !== 3 ||
      !requested.every((n) => typeof n === 'number' && Number.isFinite(n)))
  )
    return no('at must contain three finite world coordinates.');
  const at = Array.isArray(requested)
    ? new Vector3(requested[0], requested[1], requested[2])
    : (hit?.point ?? camera.position.clone());
  const faces = sceneFaces(scene, at, 5);
  const groups = classifyZfights(findZfights(faces, { includeHidden: true }));
  const counts = { a: 0, b: 0, c: 0 };
  for (const g of groups) counts[g.class]++;
  const findings = args.all === true ? groups : groups.filter((f) => f.class === 'a');
  // Prefer a contact at the crosshair over a large one at the edge of the neighbourhood.
  findings.sort(
    (a, b) =>
      new Vector3(...a.position).distanceToSquared(at) - new Vector3(...b.position).distanceToSquared(at) ||
      b.area - a.area,
  );
  latest = { at: at.toArray(), faces: faces.length, findings, counts };
  const group = new Group();
  group.userData.zfightOverlay = true;
  const geometries: BufferGeometry[] = [];
  const materials: MeshBasicNodeMaterial[] = [];
  const selected = findings.slice(0, 3);
  const pieces = [...new Set(selected.flatMap((c) => c.members.flatMap((m) => [m.a, m.b])))];
  const colours = ['#00ffff', '#ff40cb', '#ffe34a', '#74ff68', '#8d93ff', '#ff9c50'];
  pieces.forEach((piece, i) => {
    const vertices: number[] = [];
    for (const f of faces)
      if (f.piece === piece)
        for (let k = 1; k + 1 < f.points.length; k++)
          vertices.push(...f.points[0]!, ...f.points[k]!, ...f.points[k + 1]!);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    const material = new MeshBasicNodeMaterial({
      color: colours[i % colours.length],
      transparent: true,
      opacity: 0.55,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.userData.zfightOverlay = true;
    mesh.renderOrder = 1000 + i;
    group.add(mesh);
    geometries.push(geometry);
    materials.push(material);
  });
  const banner = el('pre');
  banner.dataset.devUi = '';
  Object.assign(banner.style, {
    position: 'fixed',
    left: '12px',
    top: '80px',
    maxWidth: 'min(650px, 70vw)',
    whiteSpace: 'pre-wrap',
    background: '#111d',
    color: 'white',
    padding: '10px',
    pointerEvents: 'none',
    fontSize: '12px',
    zIndex: '100',
  });
  banner.textContent = selected.length
    ? selected
        .map(
          (c, i) =>
            `${i + 1}. [${c.class} ${className[c.class]}; ${c.count} rows] ${c.a}\n   ↔ ${c.b}\n   ${c.area.toFixed(4)} m²; ${(c.separation * 1000).toFixed(3)} mm; (${c.position.map((v) => v.toFixed(2)).join(', ')})`,
        )
        .join('\n')
    : 'No coplanar pair found within 5 m of the crosshair hit / camera.';
  document.body.append(banner);
  overlay = spawn({
    kind: 'dev-zfight',
    mesh: group,
    dispose() {
      banner.remove();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  });
  if (output) output.textContent = JSON.stringify(latest, null, 2);
  return ok(`a ${counts.a}, b ${counts.b}, c ${counts.c}; nearest three selected findings tinted.`, latest);
}
export const tool: Tool = {
  id: 'zfight',
  label: 'Z-fighting',
  scope: 'Local read-only drawn-geometry snapshot. No network, physics, material edits or continuous scan.',
  commands: ['scan', 'clear'],
  available: () => (import.meta.env.DEV ? null : 'Dev server only.'),
  run(name, args) {
    if (name === 'clear') {
      clear();
      return ok('Tints cleared.');
    }
    return scan(args);
  },
  snapshot: () => latest,
  mount(parent, context) {
    note(
      parent,
      `Aim at the flicker, then Scan. Compares opaque CPU triangles within 5 m of the hit (40 m ray), otherwise the camera. Same-facing planes ≤ ${ZFIGHT.separation * 1000} mm apart, ≥ ${ZFIGHT.minArea} m² overlap.`,
    );
    note(
      parent,
      'Tint colours identify pieces, drawn through occluders for diagnosis. Unnamed meshes use mesh/instance/component ids. Merged pieces sharing a whole edge may be joined; shader deformation, skins and transparent draws are excluded. This is local exterior exposure, not a camera-visibility proof.',
    );
    command(parent, context, 'zfight', 'Scan at crosshair', 'scan');
    command(parent, context, 'zfight', 'Scan including joints / hidden', 'scan', { all: true });
    command(parent, context, 'zfight', 'Clear tints', 'clear');
    output = el('pre', '', 'dev-output');
    parent.append(output);
    return () => {
      output = null;
      clear();
    };
  },
  dispose: clear,
};
