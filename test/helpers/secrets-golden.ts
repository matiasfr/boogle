// The secrets' world output (src/entities/finds/secrets-view.ts), headless: every primitive merged into the ground
// mesh (its kind, full-precision world matrix and colour), every other mesh's world pose and material, the sea ladder's
// instance matrices, every collider's world shape in build order, where each box stands, and a frame of the boxes
// (their instance matrices) with the Open target from beside the tower's first box.
// A primitive is printed in one form however it was drawn: a part of a part list (render/part-geometry.ts) or a
// box or cylinder geometry, as its unit shape under its world matrix times its size, so a box drawn at its size and one
// scaled from a unit box read the same. Matrices are full precision, before Float32 vertex quantization.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sourceFunction, sourceModule } from '../../dev/level/source.ts';
import { merged as mergedParts } from '../../src/render/part-geometry.ts';
import { cosmetic, crateParts, type Part } from '../../src/render/cosmetic-parts.ts';
import { inReach } from '../../src/player/reach.ts';
import { H } from '../../src/place/terrain.ts';
import { material } from '../../src/render/materials.ts';
import { placeSecretThing } from '../../src/entities/finds/secrets-place.ts';
import { worldColliders } from './poi-golden.ts';
import { recordMatrices } from './prefab-golden.ts';
const { GROUP } = await import('../../src/physics/physics.ts');

type V3 = { x: number; y: number; z: number };
type Q = { x: number; y: number; z: number; w: number };
type BodySpec = Parameters<typeof worldColliders>[0][number] & { material?: unknown };
type Prim = { prim: string; matrix: number[]; color: string };

const partMatrix = ([, x, y, z, sx, sy, sz, , rx, rz]: Part) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx ?? 0, 0, rz ?? 0)),
    new THREE.Vector3(sx, sy, sz),
  );
const PART_PRIM: Record<string, string> = { b: 'box', c: 'cylinder 1 1 12', k: 'cone 10', s: 'sphere 10 8' };

/** Patch the prototype while the view builds: each geometry remembers the transforms applied to it, and a part list's
 * merged geometry (`merged`, bound into the view or builder) remembers its parts, so a merge can list its primitives. */
function recordPrims() {
  const proto = THREE.BufferGeometry.prototype;
  const apply = proto.applyMatrix4;
  const marks = new WeakMap<THREE.BufferGeometry, THREE.Matrix4>();
  const parts = new WeakMap<THREE.BufferGeometry, Part[]>();
  proto.applyMatrix4 = function (this: THREE.BufferGeometry, m: THREE.Matrix4) {
    let mark = marks.get(this);
    if (!mark) marks.set(this, (mark = new THREE.Matrix4()));
    mark.premultiply(m);
    return apply.call(this, m);
  };
  const merged = (list: Part[], grow?: number) => {
    if (grow !== undefined && grow !== 1) throw new Error('secrets golden: unexpected grow');
    const g = mergedParts(list);
    parts.set(g, list);
    return g;
  };
  const colourOf = (g: THREE.BufferGeometry) => {
    const c = g.getAttribute('color');
    return c ? '#' + new THREE.Color(c.getX(0), c.getY(0), c.getZ(0)).getHexString() : '';
  };
  const prims = new WeakMap<THREE.BufferGeometry, Prim[]>();
  const merge = (list: THREE.BufferGeometry[]) => {
    const out: Prim[] = list.flatMap((g): Prim[] => {
      const m = marks.get(g) ?? new THREE.Matrix4();
      const own = parts.get(g);
      if (own)
        return own.map((p) => ({
          prim: PART_PRIM[p[0]] ?? p[0],
          matrix: m.clone().multiply(partMatrix(p)).toArray(),
          color: '#' + new THREE.Color(p[7]).getHexString(),
        }));
      const params = (g as unknown as { parameters: Record<string, number> }).parameters;
      if (g.type === 'BoxGeometry')
        return [
          {
            prim: 'box',
            matrix: m
              .clone()
              .multiply(new THREE.Matrix4().makeScale(params.width!, params.height!, params.depth!))
              .toArray(),
            color: colourOf(g),
          },
        ];
      if (g.type === 'CylinderGeometry')
        return [
          {
            prim: `cylinder ${params.radiusTop} ${params.radiusBottom} ${params.radialSegments}`,
            matrix: m
              .clone()
              .multiply(new THREE.Matrix4().makeScale(1, params.height!, 1))
              .toArray(),
            color: colourOf(g),
          },
        ];
      throw new Error(`secrets golden: unknown ground geometry ${g.type}`);
    });
    const g = mergeGeometries(list)!;
    prims.set(g, out);
    return g;
  };
  return {
    merge,
    merged,
    prims: (g: THREE.BufferGeometry) => prims.get(g),
    restore() {
      proto.applyMatrix4 = apply;
    },
  };
}

function materialPrint(m: THREE.Material) {
  const a = m as THREE.Material & Record<string, unknown>;
  return {
    type: m.type,
    vertexColors: m.vertexColors,
    flatShading: a.flatShading,
    roughness: a.roughness,
    metalness: a.metalness,
  };
}

type View = {
  update(dt: number, now: number): void;
  targets(): { id: string; verb: string; at: THREE.Vector3 }[];
  inspect(): unknown;
};

/** Bindings the secrets view reads, its imports (static and lazy) stood in by hand, and the real prefab runtime. */
export async function secretsBindings() {
  const bodies: BodySpec[] = [];
  const recorded = recordPrims();
  const createOwnedView = sourceFunction<typeof import('../../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody: (b: BodySpec) => b, removeBody() {} },
  );
  const body = (shape: BodySpec['shapes'][number], at: V3, q?: Q, group = GROUP.SCENERY): BodySpec => {
    const spec: BodySpec = {
      material: 'ground',
      group,
      position: { x: at.x, y: at.y, z: at.z },
      ...(q ? { rotation: { x: q.x, y: q.y, z: q.z, w: q.w } } : {}),
      shapes: [shape],
    };
    bodies.push(spec);
    return spec;
  };
  const { compiled, definitions } = await import('../../src/prefab/catalogue.ts');
  const validation = await import('../../src/prefab/validate.ts');
  const { names } = await import('../../src/prefab/names.ts');
  type Builder = import('../../src/prefab/builders.ts').Builder;
  const builders = new Map<string, Builder>(names.builders.map((name) => [name, () => new THREE.Group()]));
  const registerBuilder = (name: string, build: Builder) => {
    builders.set(name, build);
    return build;
  };
  const read = (f: string) => fs.readFileSync(f, 'utf8');
  const json = (f: string) => JSON.parse(read(f)) as unknown;
  sourceModule(read('src/prefab/builders/greybox-box.ts'), { THREE, material, registerBuilder }, []);
  if (fs.existsSync('src/prefab/builders/secrets.ts'))
    sourceModule(read('src/prefab/builders/secrets.ts'), { THREE, registerBuilder, merged: recorded.merged }, []);
  const runtime = sourceModule<typeof import('../../src/prefab/instantiate.ts')>(read('src/prefab/instantiate.ts'), {
    THREE,
    compiled,
    names,
    builders,
    ...validation,
    workshop: json('content/built/levels/workshop.json'),
    gorge: json('content/built/levels/gorge.json'),
    ROOM_GROUP: 8,
    CAVE_GROUP: GROUP.CAVE,
    staticBody: body,
  });
  const me = { body: null as null | { position: THREE.Vector3 } };
  const show = {
    busy: () => false,
    opening: () => null,
    burst: () => false,
    update() {},
    dispose() {},
    open() {},
  };
  const store = {
    hasSecret: () => false,
    isHubbed: () => false,
    hubSecret: () => false,
    takeSecret: () => false,
  };
  const lazy: Record<string, () => Promise<unknown>> = {
    '../../place/tech-layout.ts': () => import('../../src/place/tech-layout.ts'),
    '../../place/layout.ts': () => import('../../src/place/layout.ts'),
    '../../place/land.ts': async () => ({
      H,
      addStatic: (shape: BodySpec['shapes'][number], at: V3, q: Q | undefined, group: number | undefined) =>
        body(shape, at, q, group),
    }),
    '../../place/terrain.ts': async () => ({ H }),
    '../../render/part-geometry.ts': async () => ({ merged: recorded.merged }),
    '../../place/look.ts': async () => ({ softGlow: {} }),
  };
  return {
    bodies,
    recorded,
    me,
    store,
    createOwnedView,
    bindings: {
      THREE,
      mergeGeometries: recorded.merge,
      NO_TARGETS: Object.freeze([]),
      me,
      inReach,
      playMark() {},
      getAudio: () => null,
      cosmetic,
      crateParts,
      createCrateShow: () => show,
      rewardSparkles() {},
      railwayWorldRead: () => null,
      railwayYouGot() {},
      rail: () => ({}),
      line2Completed: () => 0,
      line2Trains: () => false,
      pierLaid: () => false,
      townShelf: () => null,
      wardrobe: () => null,
      createPrefabBatch: runtime.createPrefabBatch,
      instantiate: runtime.instantiate,
      definitions,
      loadLevelArtifact: validation.loadLevelArtifact,
      placeSecretThing,
      level: fs.existsSync('content/built/levels/secrets.json') ? json('content/built/levels/secrets.json') : null,
      __lazy: (path: string) => {
        const load = lazy[path];
        if (!load) throw new Error(`secrets golden: unbound lazy import ${path}`);
        return load();
      },
    },
  };
}

/** The module's source with its lazy `import('...')`s routed to `__lazy`. */
export const secretsSource = (file = 'src/entities/finds/secrets-view.ts') =>
  fs
    .readFileSync(file, 'utf8')
    .replace(/\bimport\((['"])([^'"]+)\1\)/g, (_, q: string, p: string) => `__lazy(${q}${p}${q})`);

/** Builds the view from `source` over the bindings and reads back everything it placed. */
export async function captureSecrets(source = secretsSource(), extra: Record<string, unknown> = {}) {
  const c = await secretsBindings();
  const matrices = recordMatrices();
  try {
    const owner = c.createOwnedView();
    const { createSecretsView } = sourceModule<{
      createSecretsView(owner: unknown, store: unknown): Promise<View>;
    }>(source, { ...c.bindings, ...extra });
    const view = await createSecretsView(owner, c.store);
    const meshes = () => {
      owner.root.updateMatrixWorld(true);
      const out: unknown[] = [];
      owner.root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const g = o.geometry as THREE.BufferGeometry;
        const prims = c.recorded.prims(g);
        out.push({
          type: o.type,
          name: o.name,
          matrix: o.matrixWorld.toArray(),
          visible: o.visible,
          castShadow: o.castShadow,
          receiveShadow: o.receiveShadow,
          frustumCulled: o.frustumCulled,
          material: materialPrint(o.material as THREE.Material),
          ...(o instanceof THREE.InstancedMesh
            ? {
                count: o.count,
                instances: Array.from({ length: o.count }, (_, i) => matrices.get(o, i).toArray()),
              }
            : {}),
          ...(prims
            ? { prims }
            : {
                geometry: { type: g.type, count: g.getAttribute('position').count, index: g.index?.count ?? 0 },
              }),
        });
      });
      return out;
    };
    const built = meshes();
    const colliders = worldColliders(c.bodies);
    const placed = view.inspect();
    // A frame: every waiting box takes its pose and joins its tier's draw.
    view.update(1 / 60, 4321);
    const frame = meshes();
    // Beside the tower's first box, just out of bumping reach: the Open target it offers.
    const first = (placed as { boxes: { id: string; world: V3 }[] }).boxes.find((b) => b.id === 'firstpull')!.world;
    c.me.body = { position: new THREE.Vector3(first.x + 2, first.y, first.z) };
    view.update(1 / 60, 4400);
    const targets = view.targets().map((t) => ({ id: t.id, verb: t.verb, at: [t.at.x, t.at.y, t.at.z] }));
    return { built, colliders, bodies: c.bodies.length, placed, frame, targets, inspect: view.inspect() };
  } finally {
    matrices.restore();
    c.recorded.restore();
  }
}
