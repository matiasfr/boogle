// The lookout's world output (src/entities/lookout/), headless: the telescope's meshes and their world poses, every
// collider and footprint, the Look through it target, the fixed view through the eyepiece, and the buoys' full-precision
// instance matrices at build and after a frame, in build order.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../../dev/level/source.ts';
import { H } from '../../src/place/terrain.ts';
import { flat } from '../../src/render/flat.ts';
import { SEA } from '../../src/constants.ts';
import { worldColliders, worldMeshes } from './poi-golden.ts';
import { recordMatrices } from './prefab-golden.ts';
const { GROUP } = await import('../../src/physics/physics.ts');

type BodySpec = Parameters<typeof worldColliders>[0][number];

/** A DOM just big enough for the telescope's panel: elements that take children, attributes and listeners. */
function domStub() {
  class HTMLElement {
    children: HTMLElement[] = [];
    className = '';
    textContent = '';
    ariaLabel = '';
    onclick: (() => void) | null = null;
    setAttribute() {}
    addEventListener() {}
    append(...c: HTMLElement[]) {
      this.children.push(...c);
    }
    remove() {}
    focus() {}
    querySelectorAll() {
      return this.children;
    }
  }
  class HTMLButtonElement extends HTMLElement {}
  const classes = new Set<string>();
  const document = {
    activeElement: null,
    createElement: (tag: string) => (tag === 'button' ? new HTMLButtonElement() : new HTMLElement()),
    body: {
      append() {},
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
      },
    },
  };
  return { document, HTMLElement, HTMLButtonElement };
}

/** Bindings the lookout's view module reads, its imports (static and lazy) stood in by hand. */
export function lookoutBindings() {
  const bodies: BodySpec[] = [],
    feet: unknown[] = [],
    constraints: ((look: THREE.Vector3, pos: THREE.Vector3) => boolean)[] = [];
  const createOwnedView = sourceFunction<typeof import('../../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody: (b: BodySpec) => bodies.push(b), removeBody() {} },
  );
  const staticBody = (
    shape: BodySpec['shapes'][number],
    at: { x: number; y: number; z: number },
    q?: THREE.Quaternion,
    group = GROUP.SCENERY,
  ): BodySpec => ({
    group,
    position: { x: at.x, y: at.y, z: at.z },
    ...(q ? { rotation: { x: q.x, y: q.y, z: q.z, w: q.w } } : {}),
    shapes: [shape],
  });
  const camera = new THREE.PerspectiveCamera(60);
  const me = { body: null as null | { position: THREE.Vector3 } };
  const lazy = {
    '../../place/layout.ts': () => import('../../src/place/layout.ts'),
    '../../place/terrain.ts': async () => ({ H }),
    '../../place/sites.ts': async () => ({
      addFoot: (x: number, z: number, yaw: number, hw: number, hd: number) => feet.push({ x, z, yaw, hw, hd }),
    }),
  };
  return {
    bodies,
    feet,
    constraints,
    camera,
    me,
    staticBody,
    bindings: {
      THREE,
      ...domStub(),
      createOwnedView,
      camera,
      camConstraints: constraints,
      camForward: (v: THREE.Vector3) => v.set(0, 0, -1),
      me,
      openModal: () => true,
      closeModal() {},
      railwayWorldRead: () => null,
      aperture() {},
      ringOpen() {},
      buoyLifted: () => false,
      splash() {},
      SEA,
      __lazy: (path: string) => {
        const load = lazy[path as keyof typeof lazy];
        if (!load) throw new Error(`lookout golden: unbound lazy import ${path}`);
        return load();
      },
    },
  };
}

/** The module's source with its lazy `import('...')`s routed to `__lazy`. */
export const lookoutSource = (file = 'src/entities/lookout/view.ts') =>
  fs
    .readFileSync(file, 'utf8')
    .replace(/\bimport\((['"])([^'"]+)\1\)/g, (_, q: string, p: string) => `__lazy(${q}${p}${q})`);

type View = {
  root: THREE.Object3D;
  targets(): { id: string; verb: string; at: THREE.Vector3; run(): void }[];
  update(ctx: { now: number; dt: number }): void;
  inspect(): unknown;
};

/** Runs `create` (the view's factory, bound by the caller) and reads back everything it placed. */
export async function captureLookout(c: ReturnType<typeof lookoutBindings>, create: () => Promise<View>) {
  const recorded = recordMatrices();
  try {
    const view = await create();
    const instances = () => {
      const out: unknown[] = [];
      view.root.traverse((o) => {
        if (!(o instanceof THREE.InstancedMesh)) return;
        out.push({
          count: o.count,
          matrices: Array.from({ length: o.count }, (_, i) => recorded.get(o, i).toArray()),
        });
      });
      return out;
    };
    const built = { meshes: worldMeshes(view.root), instances: instances() };
    // Stand by the eyepiece, take the target, look through it and read the fixed view.
    const scope = view.inspect() as { scope: { x: number; y: number; z: number } };
    c.me.body = { position: new THREE.Vector3(scope.scope.x + 1, scope.scope.y + 1, scope.scope.z + 1) };
    const targets = view.targets().map((t) => ({ id: t.id, verb: t.verb, at: [t.at.x, t.at.y, t.at.z] }));
    view.targets()[0]!.run();
    const look = new THREE.Vector3(),
      pos = new THREE.Vector3();
    c.constraints[0]!(look, pos);
    view.update({ now: 4321, dt: 1 / 60 });
    return {
      ...built,
      colliders: worldColliders(c.bodies),
      feet: c.feet,
      targets,
      through: { pos: pos.toArray(), look: look.toArray(), fov: c.camera.fov },
      inspect: view.inspect(),
      afterFrame: instances(),
    };
  } finally {
    recorded.restore();
  }
}

/** The record view: the lookout over the real builders, catalogue and `instantiate`, with the same stand-ins. The
 * fixture came from the pre-record view, run through these bindings as it was (`captureLookoutBefore`, in the commit
 * "Capture the lookout world golden before the record conversion"). */
export async function captureLookoutAfter() {
  const c = lookoutBindings();
  const { compiled, definitions } = await import('../../src/prefab/catalogue.ts');
  const validation = await import('../../src/prefab/validate.ts');
  const { names } = await import('../../src/prefab/names.ts');
  type Builder = import('../../src/prefab/builders.ts').Builder;
  const builders = new Map<string, Builder>(names.builders.map((name) => [name, () => new THREE.Group()]));
  const registerBuilder = (name: string, build: Builder) => {
    builders.set(name, build);
    return build;
  };
  sourceModule(fs.readFileSync('src/prefab/builders/lookout.ts', 'utf8'), { THREE, registerBuilder, flat }, []);
  const json = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as unknown;
  const runtime = sourceModule<typeof import('../../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      compiled,
      names,
      builders,
      ...validation,
      workshop: json('content/built/levels/workshop.json'),
      gorge: json('content/built/levels/gorge.json'),
      ROOM_GROUP: 8,
      CAVE_GROUP: GROUP.CAVE,
      staticBody: c.staticBody,
    },
  );
  const { createLookoutView } = sourceModule<{ createLookoutView(): Promise<View> }>(lookoutSource(), {
    ...c.bindings,
    instantiate: runtime.instantiate,
    createPrefabBatch: runtime.createPrefabBatch,
    definitions,
    loadLevelArtifact: validation.loadLevelArtifact,
    level: json('content/built/levels/lookout.json'),
  });
  return captureLookout(c, createLookoutView);
}
