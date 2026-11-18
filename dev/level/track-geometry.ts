// Execute the real yard collector and kit bake in Node, with rendering/physics beyond the capture door stubbed.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { fitInstanceBounds } from '../../src/render/instance-bounds.ts';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import * as home from '../../src/place/home-station.ts';
import * as layout from '../../src/place/layout.ts';
import * as turnout from '../../src/place/turnout.ts';
import { ROTUNDA_KIT, bayFrame } from '../../src/place/rotunda.ts';
import * as shape from '../../src/entities/railway/works-shape.ts';
import { junctions } from '../../src/place/junctions.ts';
import { sleeperStations } from '../../src/entities/railway/track-panels.ts';
import { H } from '../../src/place/terrain.ts';
import { geometryFaces } from '../../src/geometry/drawn-faces.ts';
import type { Face } from '../../src/geometry/zfight.ts';
import type { Surface } from '../../src/geometry/zfight-surface.ts';
import type { Paint } from '../../src/place/look.ts';
import { sourceFunction, sourceModule } from './source.ts';
import { trackBoxes } from './grounding-track.ts';

/** Static imports are stripped by sourceModule. Deferred modules are explicit injected capture boundaries. */
function capturedModule<T>(file: string, bindings: Record<string, unknown>, imports: Record<string, unknown>): T {
  const code = fs.readFileSync(file, 'utf8').replace(/import\('([^']+)'\)/g, (_match, name: string) => {
    if (!Object.hasOwn(imports, name)) throw new Error(`Unmapped geometry import ${file}: ${name}`);
    return `Promise.resolve(__imports[${JSON.stringify(name)}])`;
  });
  return sourceModule<T>(code, { ...bindings, __imports: imports });
}

export async function collectTrackGeometry() {
  const faces: Face[] = [];
  const bytes = fs.readFileSync('assets/built/place-kit.glb');
  const asset = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  asset.scene.updateMatrixWorld(true);
  const bakeContact = sourceFunction('src/place/look.ts', 'bakeContact', { THREE });
  const bake = sourceFunction<(mesh: THREE.Mesh, name: string) => THREE.BufferGeometry>(
    'src/place/look-kit.ts',
    'bake',
    { THREE, LOOK: { contact: true }, bakeContact },
  );
  const cached = new Map<string, THREE.BufferGeometry>();
  const kit = (name: string) => {
    let geometry = cached.get(name);
    if (!geometry) {
      let mesh: THREE.Mesh | undefined;
      asset.scene.getObjectByName(name)?.traverse((o) => {
        if (o instanceof THREE.Mesh) mesh = o;
      });
      if (!mesh) throw new Error(`Missing kit geometry ${name}`);
      cached.set(name, (geometry = bake(mesh, name)));
    }
    return geometry;
  };
  const kitSize = sourceFunction<Record<string, [number, number, number]>>('src/place/look-kit.ts', 'KIT_SIZE', {});
  const kitName = sourceFunction<Record<string, string>>('src/place/look-kit.ts', 'KIT_NAME', {});
  const woodKinds = sourceFunction<Record<string, { axis: 'x' | 'y' | 'z' }>>(
    'src/place/look-kit.ts',
    'WOOD_KINDS',
    {},
  );
  const steel = sourceFunction<Paint>('src/place/look.ts', 'STEEL', {});
  const honeyOf = sourceFunction<(color: string) => string>('src/place/look.ts', 'honeyOf', {});
  const paintSurface = (paint: Paint, casts: boolean): Surface => ({
    material: JSON.stringify([
      'track paint',
      paint.steel ? 'steel' : (paint.grain?.axis ?? 'flat'),
      paint.steel ? 0.45 : (paint.rough ?? 0.85),
    ]),
    color: new THREE.Color(paint.steel ? '#59616b' : (paint.grain?.honey ?? paint.color)).toArray() as [
      number,
      number,
      number,
    ],
    castShadow: casts,
    receiveShadow: true,
    vertexColors: true,
    ...(paint.grain ? { uncertain: 'procedural grain phase' } : {}),
  });
  for (const { spec, mode, boxes, kinds } of trackBoxes())
    if (mode === 'panels')
      boxes.forEach((b, i) => {
        const kind = kinds[i]!;
        const size = kitSize[kind];
        if (!size) throw new Error(`Unknown track kind ${kind}`);
        const matrix = new THREE.Matrix4()
          .makeTranslation(b.x, b.y, b.z)
          .multiply(b.local)
          .scale(new THREE.Vector3(1 / size[0], 1 / size[1], 1 / size[2]));
        for (const name of [kitName[kind] ?? kind, ...(kind === 'sleeper' ? ['sleeper_steel'] : [])]) {
          const wood = woodKinds[kind];
          const color = '#' + b.color.getHexString(THREE.SRGBColorSpace);
          const paint =
            wood && name !== 'sleeper_steel' ? { color, grain: { axis: wood.axis, honey: honeyOf(color) } } : steel;
          faces.push(
            ...geometryFaces(
              kit(name),
              matrix,
              `track/${spec.id}/${name}/${i}`,
              false,
              paintSurface(paint, !['rail', 'sleeper', 'sleeper_steel'].includes(name)),
              `track/${spec.id}/${name}`,
              `track/${spec.id}`,
            ),
          );
        }
      });
  const { createYardTrack } = capturedModule<typeof import('../../src/entities/railway/yard-track.ts')>(
    'src/entities/railway/yard-track.ts',
    { THREE, ...shape, fitInstanceBounds },
    {
      '../../place/look-kit.ts': {
        kitBatch(name: string, paint: Paint, count: number) {
          const mesh = new THREE.InstancedMesh(kit(name), new THREE.MeshBasicNodeMaterial(), count);
          mesh.name = name;
          mesh.receiveShadow = true;
          mesh.userData.zfightSurface = paintSurface(paint, true);
          return mesh;
        },
      },
      '../../place/look.ts': { LOOK: { contact: true }, STEEL: steel, honeyOf, addBlob: () => -1, setBlob() {} },
    },
  );
  const { layHomeYard } = sourceModule<typeof import('../../src/entities/railway/home-yard.ts')>(
    fs.readFileSync('src/entities/railway/home-yard.ts', 'utf8'),
    { home, ...layout, ...turnout, bayFrame, junctions, sleeperStations, ...shape, createYardTrack },
  );
  const yard = layHomeYard(H);
  const owner = {
    add(mesh: THREE.InstancedMesh) {
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        faces.push(
          ...geometryFaces(
            mesh.geometry,
            matrix,
            `Home/yard/${mesh.name}/${i}`,
            false,
            { ...(mesh.userData.zfightSurface as Surface), castShadow: mesh.castShadow },
            `Home/yard/${mesh.name}`,
            'Home/yard',
          ),
        );
      }
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
      mesh.dispose();
    },
  };
  await yard.draw(owner as unknown as import('../../src/render/owned-view.ts').OwnedView);
  // Home's static boxes are captured before drawWorksBoxes can allocate bodies.
  const { createHomeStation } = capturedModule<typeof import('../../src/entities/railway/home-station-view.ts')>(
    'src/entities/railway/home-station-view.ts',
    {
      ...shape,
      line2Completed: () => 1,
      line2Trains: () => true,
      createTill: () => ({ update() {} }), // Prefab-owned till is outside this legacy station-box capture.
      drawWorksBoxes(_owner: unknown, boxes: shape.WorksBox[]) {
        for (const [i, b] of boxes.entries()) {
          const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(b.x, b.y, b.z),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.yaw, 0)),
            new THREE.Vector3(b.w, b.h, b.d),
          );
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          faces.push(
            ...geometryFaces(
              geometry,
              matrix,
              `Home/station/batch-${batch}/${i}`,
              false,
              {
                material: 'greybox stone',
                color: new THREE.Color(b.colour ?? '#b7b0a0').toArray() as [number, number, number],
                castShadow: true,
                receiveShadow: true,
                vertexColors: false,
              },
              `Home/station/batch-${batch}/box/${[b.w, b.h, b.d].map((v) => v.toFixed(4)).join(',')}`,
            ),
          );
          geometry.dispose();
        }
        batch++;
        return { castShadow: true, visible: true };
      },
    },
    {
      '../../place/land.ts': { H },
      '../../place/layout.ts': layout,
      '../../place/home-station.ts': home,
      '../../place/rotunda.ts': { ROTUNDA_KIT, bayFrame },
      '../../place/sites.ts': { addFoot() {} },
      './home-yard.ts': { layHomeYard: () => ({ draw: () => ({ showLater() {} }) }) },
    },
  );
  let batch = 0;
  await createHomeStation(
    { read: { world() {} } } as unknown as Parameters<typeof createHomeStation>[0],
    {} as Parameters<typeof createHomeStation>[1],
  );
  for (const geometry of cached.values()) geometry.dispose();
  asset.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    }
  });
  return faces;
}
