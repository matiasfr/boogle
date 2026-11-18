// Capture the current builders' static tech meshes, rather than the retired prototype's pad catalogue.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import * as tech from '../../src/place/tech-layout.ts';
import * as layout from '../../src/place/layout.ts';
import { H } from '../../src/place/terrain.ts';
import { flat } from '../../src/render/flat.ts';
import { merged } from '../../src/render/part-geometry.ts';
import { hookRings } from '../../src/entities/railway/hook-path.ts';
import { geometryFaces, materialSurface } from '../../src/geometry/drawn-faces.ts';
import type { Face } from '../../src/geometry/zfight.ts';
import { sourceModule } from './source.ts';
import { compiled } from '../../src/prefab/catalogue.ts';
import type { Transform } from '../../src/prefab/types.ts';
import { loadLevelArtifact } from '../../src/prefab/validate.ts';
import { builders } from '../../src/prefab/builders.ts';
import '../../src/prefab/builders/secrets.ts';
import { placeSecretThing } from '../../src/entities/finds/secrets-place.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const transform = (p: Transform) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...p.pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rot?.[1] ?? 0, p.rot?.[0] ?? 0, p.rot?.[2] ?? 0, 'YXZ')),
    new THREE.Vector3(...(p.scale ?? [1, 1, 1])),
  );
/** A piece in its one colour, as the secrets view draws it. */
function colour(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color),
    col = new Float32Array(g.getAttribute('position').count * 3);
  for (let k = 0; k < col.length; k += 3) col.set([c.r, c.g, c.b], k);
  return g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** Fail closed if either source-owned geometry boundary moves. No copied dimensions or pad keep/exclude list. */
function runSection(file: string, start: string, end: string, bindings: Record<string, unknown>) {
  const source = fs.readFileSync(file, 'utf8');
  const a = source.indexOf(start),
    b = source.indexOf(end, a);
  if (a < 0 || b <= a || source.indexOf(start, a + start.length) !== -1)
    throw new Error(`Tech geometry boundary changed: ${file}`);
  sourceModule<{ capture: () => void }>(`export function capture() {${source.slice(a, b)}}`, bindings).capture();
}

export function collectTechGeometry(): Face[] {
  const faces: Face[] = [];
  const capture = (mesh: THREE.Mesh, id: string) => {
    mesh.updateMatrixWorld(true);
    const mat = mesh.material as THREE.Material;
    faces.push(
      ...geometryFaces(
        mesh.geometry,
        mesh.matrixWorld,
        id,
        false,
        materialSurface(mat, mesh.castShadow, mesh.receiveShadow),
      ),
    );
    mesh.geometry.dispose();
  };
  const meshes: THREE.Mesh[] = [];
  const land = { H, addStatic() {}, addStatics() {} };
  runSection('src/entities/railway/tools.ts', '  const pillar = tech.PILLARS[0]!;', '  let lip: THREE.Mesh | null', {
    THREE,
    tech,
    layout,
    land,
    owner: {},
    flat: { flat },
    mesh: (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      meshes.push(mesh);
      return mesh;
    },
  });
  meshes.forEach((mesh, i) => capture(mesh, `tech/tools/${i}`));
  meshes.length = 0;
  let i = 0;
  runSection('src/entities/railway/hook-view.ts', '  for (const { pad: p } of rings.slice(1))', '  const ringMesh =', {
    THREE,
    rings: hookRings(tech.PADS, tech.ringAt, layout.ORIGIN.x),
    ox: layout.ORIGIN.x,
    shapes: { merged },
    flatMod: { flat },
    land,
    owner: {},
    partMat: new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true }),
    glow: new THREE.MeshStandardNodeMaterial(),
    add: (mesh: THREE.Mesh) => {
      meshes.push(mesh);
      return mesh;
    },
  });
  for (const mesh of meshes) capture(mesh, `tech/hook/${i++}`);
  meshes.length = 0;
  const partMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
  runSection('src/entities/railway/line2-view.ts', '  const stonePad =', '  const hook = tech.DEVICES.hook;', {
    THREE,
    tech,
    ox: layout.ORIGIN.x,
    land,
    owner: {},
    shapes: { merged },
    flat,
    STONE: '#917b5e',
    mesh: (geometry: THREE.BufferGeometry, material = partMat) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      meshes.push(mesh);
      return mesh;
    },
  });
  meshes.forEach((mesh, i) => capture(mesh, `tech/line2/${i}`));
  // The secrets' ledges and what holds them up, and the helmet's ladder: their records where content/levels/secrets.ts
  // puts them (the clues and plinths are not in the census). Each ledge or support is one piece, its pieces merged.
  const secretsLevel = loadLevelArtifact(
    JSON.parse(fs.readFileSync('content/built/levels/secrets.json', 'utf8')) as unknown,
    compiled.prefabs,
  );
  const frame = {
    ox: layout.ORIGIN.x,
    H,
    pad: tech.padById,
    secret: (id: string) => tech.SECRETS.find((s) => s.id === id)!,
  };
  const CENSUS = new Set([
    'secrets.stone-pad',
    'secrets.ledge',
    'secrets.support',
    'secrets.balcony-column',
    'secrets.stack-column',
  ]);
  let secret = 0;
  for (const placed of secretsLevel.placements) {
    const at = placeSecretThing(placed, frame);
    if (!at) continue;
    const def = compiled.prefabs[at.prefab]!;
    if (!('builder' in def.visual)) throw new Error('Tech census: expected a built record');
    const local = transform(at);
    if (at.prefab === 'railway.sea-ladder') {
      if (def.visual.builder !== 'greybox.box') throw new Error('Tech census: expected box prefab');
      for (const [i, part] of def.visual.instances!.entries()) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), flat(String(def.visual.params.colour)));
        mesh.applyMatrix4(local.clone().multiply(transform(part)));
        capture(mesh, `tech/${at.id}/${i}`);
      }
      continue;
    }
    if (!CENSUS.has(at.prefab)) continue;
    const built = builders.get(def.visual.builder)!({ ...def.visual.params, ...at.params }, undefined, at);
    if (!('pieces' in built)) throw new Error('Tech census: expected pieces');
    const geometry = mergeGeometries(
      built.pieces.map((p) => colour(p.geometry.applyMatrix4(local.clone().multiply(p.matrix)), p.color)),
    )!;
    const mesh = new THREE.Mesh(geometry, partMat);
    mesh.castShadow = mesh.receiveShadow = true;
    capture(mesh, `tech/secrets/${secret++}`);
  }
  return faces;
}
