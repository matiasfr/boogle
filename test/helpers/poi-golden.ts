// The POIs' world output (src/pois/), headless: every merged part's full-precision world matrix and colour, every
// other mesh's world pose and material, every collider's world shape and every light, in build order.
// Full-precision part matrices are compared before Float32 vertex quantization (see prefab-golden.ts).
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { uniform, vec4, pow, uv } from 'three/tsl';
import lighthouseSite, { PAD_Y } from '../../src/pois/lighthouse/site.ts';
import windmillSite, { MILLS, TRACK } from '../../src/pois/windmills/site.ts';
import { addPart as bakePart, mergeParts as bakeMerge } from '../../src/render/geometry-parts.ts';
import { sourceFunction, sourceModule } from '../../dev/level/source.ts';
import { siteFrame } from '../../src/island/stamps.ts';
import { mulberry32 } from '../../src/math.ts';
// Loaded after dev/sim/hooks.ts (the test imports it first), as the game's own module graph needs.
const { GROUP } = await import('../../src/physics/physics.ts');
const network = await import('../../src/pois/caves/network.ts');
const { caveSd } = await import('../../src/pois/caves/mesh.ts');

type Piece = { geo: unknown; m: THREE.Matrix4; color: string };
type BodySpec = {
  type?: string;
  group?: number;
  mask?: number;
  material?: unknown;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number; w: number };
  shapes: (Record<string, unknown> & {
    kind: string;
    offset?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
  })[];
};

/** Geometry identity: its type, scalar parameters and (for curves) the path's points; local vertex sums otherwise. */
function geometryPrint(g: THREE.BufferGeometry) {
  const params = (g as unknown as { parameters?: Record<string, unknown> }).parameters ?? {};
  const scalars = Object.fromEntries(
    Object.entries(params).filter(([, v]) => typeof v === 'number' || typeof v === 'boolean'),
  );
  const path = params.path as THREE.CatmullRomCurve3 | undefined;
  if (path) return { type: g.type, ...scalars, points: path.points.map((p) => p.clone()) };
  const pos = g.attributes.position!;
  let x = 0,
    y = 0,
    z = 0;
  for (let i = 0; i < pos.count; i++) {
    x += pos.getX(i);
    y += pos.getY(i);
    z += pos.getZ(i);
  }
  return { type: g.type, ...scalars, count: pos.count, sum: [x, y, z] };
}

/** addPart/mergeParts that also keep each part's unbaked matrix (and any matrix applied after baking). */
export function partRecorder() {
  const addPart = (
    list: THREE.BufferGeometry[],
    geo: THREE.BufferGeometry,
    m: THREE.Matrix4,
    color: THREE.ColorRepresentation,
  ) => {
    bakePart(list, geo, m, color);
    const g = list[list.length - 1]!;
    const piece: Piece = { geo: geometryPrint(geo), m: m.clone(), color: '#' + new THREE.Color(color).getHexString() };
    g.userData.piece = piece;
    const apply = g.applyMatrix4.bind(g);
    g.applyMatrix4 = (mm: THREE.Matrix4) => {
      piece.m.premultiply(mm);
      return apply(mm);
    };
  };
  const mergeParts = (list: THREE.BufferGeometry[]) => {
    const out = bakeMerge(list);
    out.userData.pieces = list.map((g) => g.userData.piece as Piece);
    return out;
  };
  return { addPart, mergeParts };
}

const canon = (q: THREE.Quaternion) => (q.w < 0 ? [-q.x, -q.y, -q.z, -q.w] : [q.x, q.y, q.z, q.w]);
const xyz = (v: { x: number; y: number; z: number }) => [v.x, v.y, v.z];

/** Every collider as its own world shape (a compound body and one body per shape read the same). */
export function worldColliders(bodies: BodySpec[]) {
  return bodies.flatMap((b) => {
    const at = new THREE.Vector3(b.position?.x ?? 0, b.position?.y ?? 0, b.position?.z ?? 0);
    const q = new THREE.Quaternion(b.rotation?.x ?? 0, b.rotation?.y ?? 0, b.rotation?.z ?? 0, b.rotation?.w ?? 1);
    return b.shapes.map((s) => {
      const { offset, rotation, kind, vertices, indices, ...dims } = s;
      const p = new THREE.Vector3(offset?.x ?? 0, offset?.y ?? 0, offset?.z ?? 0).applyQuaternion(q).add(at);
      const r = q
        .clone()
        .multiply(new THREE.Quaternion(rotation?.x ?? 0, rotation?.y ?? 0, rotation?.z ?? 0, rotation?.w ?? 1));
      return {
        type: b.type ?? 'fixed',
        group: b.group ?? GROUP.SCENERY,
        mask: b.mask ?? -1,
        kind,
        ...dims,
        ...(vertices
          ? { vertices: (vertices as ArrayLike<number>).length, indices: (indices as ArrayLike<number>).length }
          : {}),
        at: xyz(p),
        q: canon(r),
      };
    });
  });
}

function materialPrint(m: THREE.Material) {
  const a = m as THREE.Material & Record<string, unknown>;
  const colour = (c: unknown) => (c instanceof THREE.Color ? '#' + c.getHexString() : undefined);
  const map = a.map as THREE.Texture | null | undefined;
  return {
    type: m.type,
    color: colour(a.color),
    emissive: colour(a.emissive),
    emissiveIntensity: a.emissiveIntensity,
    opacity: m.opacity,
    transparent: m.transparent,
    depthWrite: m.depthWrite,
    blending: m.blending,
    side: m.side,
    vertexColors: m.vertexColors,
    flatShading: a.flatShading,
    roughness: a.roughness,
    metalness: a.metalness,
    fog: a.fog,
    texts: (map?.image as { texts?: string[] } | undefined)?.texts,
  };
}

/** Every drawn object under `root`, in traversal order, in world space. */
export function worldMeshes(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const out: unknown[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) && !(o instanceof THREE.Sprite)) return;
    const g = o.geometry as THREE.BufferGeometry;
    const pieces = g.userData.pieces as Piece[] | undefined;
    out.push({
      type: o.type,
      matrix: o.matrixWorld.toArray(),
      castShadow: o.castShadow,
      receiveShadow: o.receiveShadow,
      frustumCulled: o.frustumCulled,
      material: materialPrint(o.material as THREE.Material),
      ...(pieces
        ? {
            pieces: pieces.map((p) => {
              const world = o.matrixWorld.clone().multiply(p.m);
              const geo = p.geo as { points?: THREE.Vector3[] };
              return {
                ...geo,
                ...(geo.points ? { points: geo.points.map((v) => xyz(v.clone().applyMatrix4(world))) } : {}),
                matrix: geo.points ? [] : world.toArray(),
                color: p.color,
              };
            }),
          }
        : { geometry: geometryPrint(g) }),
    });
  });
  return out;
}

export const lightPrint = (
  lights: { position: THREE.Vector3; color?: unknown; intensity: number; distance: number; on?: unknown }[],
) =>
  lights.map((l) => ({
    at: xyz(l.position),
    color: '#' + new THREE.Color(l.color as THREE.ColorRepresentation).getHexString(),
    intensity: l.intensity,
    distance: l.distance,
    switched: typeof l.on === 'function',
  }));

/** A canvas that remembers what was written on it. */
export const documentStub = {
  createElement: () => {
    const texts: string[] = [];
    const g = new Proxy(
      { fillText: (t: string) => texts.push(t), createRadialGradient: () => ({ addColorStop() {} }) },
      { get: (t, k) => (k in t ? t[k as keyof typeof t] : () => {}), set: () => true },
    );
    return { width: 0, height: 0, texts, getContext: () => g };
  },
};

export type PoiWorld = { meshes: unknown[]; colliders: unknown[]; lights: unknown[] };
/** q and -q are one rotation: make the first clearly nonzero component (w, x, y, z) positive, on both sides. */
export function sameTurns(world: Record<string, PoiWorld>) {
  for (const area of Object.values(world))
    for (const c of area.colliders as { q: number[] }[]) {
      const [x, y, z, w] = c.q;
      const lead = [w!, x!, y!, z!].find((n) => Math.abs(n) > 1e-6) ?? 1;
      if (lead < 0) c.q = c.q.map((n) => -n);
    }
  return world;
}
const common = () => {
  const bodies: BodySpec[] = [],
    lights: Parameters<typeof lightPrint>[0] = [],
    starts: (() => void)[] = [];
  return {
    bodies,
    lights,
    starts,
    bindings: {
      THREE,
      groundMat: { name: 'ground' },
      GROUP,
      createBody: (spec: BodySpec) => spec,
      addBody: (b: BodySpec) => bodies.push(b),
      onStart: (fn: () => void) => starts.push(fn),
      onFrame() {},
      onPreStep() {},
      freezeStatic() {},
      addLightSource: (s: Parameters<typeof lightPrint>[0][number]) => lights.push(s),
      readableUnlit: <T>(m: T) => m,
      readableGlow: <T>(m: T) => m,
      document: documentStub,
      ...partRecorder(),
    },
  };
};

/** The record code: the POIs' entities over the real builders, catalogue and `instantiate`, with the same recorders. */
export async function capturePoisAfter(groundAt: (x: number, z: number) => number) {
  const { compiled, definitions } = await import('../../src/prefab/catalogue.ts');
  const validation = await import('../../src/prefab/validate.ts');
  const { names } = await import('../../src/prefab/names.ts');
  const lighthouse = await import('../../src/prefab/lighthouse.ts');
  const cellar = await import('../../src/prefab/cellar.ts');
  const read = (f: string) => fs.readFileSync(f, 'utf8');
  const json = (f: string) => JSON.parse(read(f)) as unknown;
  const out: Record<string, PoiWorld> = {};
  const run = (capture: (c: ReturnType<typeof common>, world: Record<string, unknown>) => THREE.Object3D) => {
    const c = common();
    const builders = new Map<string, import('../../src/prefab/builders.ts').Builder>(
      names.builders.map((name) => [name, () => new THREE.Group()]),
    );
    const registerBuilder = (name: string, build: import('../../src/prefab/builders.ts').Builder) => {
      builders.set(name, build);
      return build;
    };
    const model = sourceModule<typeof import('../../src/pois/windmills/model.ts')>(
      read('src/pois/windmills/model.ts'),
      c.bindings,
    );
    const ours = {
      ...sourceModule<typeof import('../../src/prefab/builders/poi-lighthouse.ts')>(
        read('src/prefab/builders/poi-lighthouse.ts'),
        {
          ...c.bindings,
          registerBuilder,
          MeshBasicNodeMaterial: THREE.MeshBasicNodeMaterial,
          uniform,
          vec4,
          pow,
          uv,
          ...lighthouse,
        },
      ),
      ...sourceModule<typeof import('../../src/prefab/builders/poi-windmills.ts')>(
        read('src/prefab/builders/poi-windmills.ts'),
        { THREE, registerBuilder, ...model },
      ),
      ...sourceModule(read('src/prefab/builders/poi-caves.ts'), {
        THREE,
        registerBuilder,
        readableGlow: <T>(m: T) => m,
        ...cellar,
      }),
    };
    const createOwnedView = sourceFunction<typeof import('../../src/render/owned-view.ts').createOwnedView>(
      'src/render/owned-view.ts',
      'createOwnedView',
      { THREE, owners: new WeakMap(), addBody: c.bindings.addBody, removeBody() {} },
    );
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
      staticBody: (
        shape: BodySpec['shapes'][number],
        at: THREE.Vector3,
        q?: THREE.Quaternion,
        group = GROUP.SCENERY,
      ) => ({
        group,
        position: { x: at.x, y: at.y, z: at.z },
        ...(q ? { rotation: { x: q.x, y: q.y, z: q.z, w: q.w } } : {}),
        shapes: [shape],
      }),
    });
    const spawned: { mesh: THREE.Object3D }[] = [];
    const root = capture(c, {
      ...c.bindings,
      ...model,
      ...ours,
      createOwnedView,
      instantiate: runtime.instantiate,
      definitions,
      loadLevelArtifact: validation.loadLevelArtifact,
      removeLightSource() {},
      defineKind() {},
      spawn: (e: { mesh: THREE.Object3D }) => spawned.push(e),
      spawned,
    });
    return { meshes: worldMeshes(root), colliders: worldColliders(c.bodies), lights: lightPrint(c.lights) };
  };
  out.lighthouse = run((c, world) => {
    sourceModule(read('src/pois/lighthouse/index.ts'), {
      ...world,
      camera: new THREE.PerspectiveCamera(),
      skyNow: { day: 1 },
      sharedSeconds: () => 0,
      reducedMotion: false,
      level: json('content/built/levels/lighthouse.json'),
      site: lighthouseSite,
      PAD_Y,
    });
    for (const s of c.starts) s();
    return (world.spawned as { mesh: THREE.Object3D }[])[0]!.mesh;
  });
  out.windmills = run((c, world) => {
    sourceModule(read('src/pois/windmills/index.ts'), {
      ...world,
      level: json('content/built/levels/windmills.json'),
      site: windmillSite,
      MILLS,
      TRACK,
      groundHeight: groundAt,
      NOT_SCENERY: ~(GROUP.SCENERY | GROUP.CAVE),
      BODY: { KINEMATIC: 'kinematic' },
      siteFrame,
      mulberry32,
      sharedSeconds: () => 0,
      sailAngle: () => 0,
      sailSpeed: () => 0,
    });
    for (const s of c.starts) s();
    return (world.spawned as { mesh: THREE.Object3D }[])[0]!.mesh;
  });
  out.caves = run((_c, world) => {
    const ambAt = sourceFunction('src/pois/caves/ambient.ts', 'ambAt', {
      THREE,
      MOUTHS: network.MOUTHS,
      AMB_NEAR: 2,
      AMB_FAR: 14,
      AMB_DEEP: 0.6,
    });
    const { buildDecor } = sourceModule<{
      buildDecor(owner: ReturnType<typeof import('../../src/render/owned-view.ts').createOwnedView>): void;
    }>(read('src/pois/caves/decor.ts'), {
      ...world,
      ...network,
      ...cellar,
      mulberry32,
      caveSd,
      ambAt,
      withCaveAmbient: <T>(m: T) => m,
    });
    const owner = (world.createOwnedView as typeof import('../../src/render/owned-view.ts').createOwnedView)();
    buildDecor(owner);
    return owner.root;
  });
  return out;
}
