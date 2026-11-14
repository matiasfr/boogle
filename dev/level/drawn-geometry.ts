import { gorgeSurfaces } from '../../src/entities/route-greybox/gorge-surfaces.ts';
// Headless adapters stop existing builders at the geometry boundary, before physics/lifecycle.
// This deliberately shares the level tool's sourceFunction seam rather than maintaining box recipes.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import * as terrain from '../../src/place/terrain.ts';
import * as layout from '../../src/place/layout.ts';
import * as cove from '../../src/place/cove.ts';
import { smoothstep } from '../../src/math.ts';
import { SEA } from '../../src/constants.ts';
import { shoreApronHeight } from '../../src/render/water/shore-providers.ts';
import { flat } from '../../src/render/flat.ts';
import { merged } from '../../src/render/part-geometry.ts';
import { partGeometry, type Box } from '../../src/render/box-plan.ts';
import { compiled, haltKitPlacements } from '../../src/prefab/catalogue.ts';
import { loadLevelArtifact } from '../../src/prefab/validate.ts';
import { builders } from '../../src/prefab/builders.ts';
import '../../src/prefab/builders/halt-parts.ts';
import '../../src/prefab/builders/halt-ramp.ts';
import '../../src/prefab/builders/workshop-parts.ts';
import '../../src/prefab/builders/house-parts.ts';
import '../../src/prefab/builders/shop-parts.ts';
import '../../src/prefab/builders/museum-parts.ts';
import '../../src/prefab/builders/room-shell.ts';
import '../../src/prefab/builders/boogler-statue.ts';
import { haltFrame } from '../../src/prefab/halt-deck.ts';
import { forgePlan, openingBuildings, openForgeMouth } from '../../src/place/opening-plans.ts';
import { openingStops } from '../../src/place/opening-stops.ts';
import { standBlockout } from '../../src/place/town-blockout.ts';
import type { LevelArtifact, Placement, Transform } from '../../src/prefab/types.ts';
import type { Part } from '../../src/render/part-geometry.ts';
import { describeGround } from '../../src/place/ground-layers.ts';
import { geometryFaces, materialSurface, isOpaqueMaterial } from '../../src/geometry/drawn-faces.ts';
import type { Face } from '../../src/geometry/zfight.ts';
import type { Surface } from '../../src/geometry/zfight-surface.ts';
import { sourceFunction } from './source.ts';
import { collectTrackGeometry } from './track-geometry.ts';
import { timberDecks } from './timber-track.ts';

const transform = (p: Transform) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...p.pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rot?.[1] ?? 0, p.rot?.[0] ?? 0, p.rot?.[2] ?? 0, 'YXZ')),
    new THREE.Vector3(...(p.scale ?? [1, 1, 1])),
  );
const readLevel = (name: string) =>
  loadLevelArtifact(
    JSON.parse(fs.readFileSync(`content/built/levels/${name}.json`, 'utf8')) as LevelArtifact,
    compiled.prefabs,
  ).placements;

export async function collectDrawnGeometry() {
  const faces: Face[] = [];
  const excluded = [
    'Moving actors, vehicles, animated/reveal poses, non-track GLB internals, museum animated exhibits, text/sign textures, particles and transparent effects.',
    'Temporary scaffold poles, shadow-only proxies and alternative stage props are not exterior completed geometry.',
    'Distant islands/Works and unconverted legacy decoration are not yet in the offline adapter; use the live scan there.',
    'Service walkways, footbridges and tech pads use level-check timberDecks oriented-box adapters, not their detailed decoration.',
  ];
  const addGeometry = (
    geometry: THREE.BufferGeometry,
    matrix: THREE.Matrix4,
    id: string,
    surface?: Surface,
    family?: string,
  ) => {
    faces.push(...geometryFaces(geometry, matrix, id, false, surface, family));
    geometry.dispose();
  };
  const addBox = (b: Box, id: string) =>
    addGeometry(
      partGeometry(b.taper),
      new THREE.Matrix4().makeTranslation(b.x, b.y, b.z).multiply(b.local),
      id,
      {
        material: `site board/${b.palette ?? 'authored'}`,
        uncertain: 'procedural board instance shading',
        color: [b.color.r, b.color.g, b.color.b],
        castShadow: true,
        receiveShadow: true,
        vertexColors: false,
      },
      id.replace(/\/[^/]+$/, '/box'),
    );
  const addParts = (parts: Part[], matrix: THREE.Matrix4, id: string) =>
    parts.forEach((part, i) =>
      addGeometry(
        merged([part]),
        matrix,
        `${id}/part-${i}`,
        {
          material: id.startsWith('railway.halt') ? 'halt board' : 'room furnishing',
          ...(id.startsWith('railway.halt') ? { uncertain: 'procedural board instance shading' } : {}),
          color: [1, 1, 1],
          castShadow: true,
          receiveShadow: true,
          vertexColors: true,
        },
        `${id}/part/${part[0]}/${part.slice(4, 8).join(',')}`,
      ),
    );
  const addObject = (object: THREE.Object3D, matrix: THREE.Matrix4, id: string) => {
    object.updateWorldMatrix(true, true);
    let index = 0;
    object.traverseVisible((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const pieceIndex = index++;
      if (!(Array.isArray(o.material) ? o.material : [o.material]).every(isOpaqueMaterial)) return;
      addGeometry(
        o.geometry.clone(),
        matrix.clone().multiply(o.matrixWorld),
        `${id}/${o.name || o.type}-${pieceIndex}`,
        materialSurface(Array.isArray(o.material) ? o.material[0]! : o.material, o.castShadow, o.receiveShadow),
        id,
      );
    });
  };
  for (const { id, boxes } of openingBuildings()) boxes.forEach((b, i) => addBox(b, `${id}/${i}`));
  const forge = openForgeMouth(forgePlan());
  [...forge.scaffold.slice(0, 1), ...forge.pieces].forEach((b, i) => addBox(b, `forge/shell-${i}`));
  const workshopFrame = new THREE.Matrix4().makeTranslation(forge.x, forge.y + 0.5, forge.z);
  // Run the actual workshop function through its steps/guards; stop at its first effect/furnishing call.
  const stopped = new Error('geometry boundary');
  const scene = new THREE.Group();
  const workshop = sourceFunction<(plan: typeof forge) => void>('src/entities/town/workshop.ts', 'makeWorkshop', {
    THREE,
    scene,
    flat,
    merged,
    WORKSHOP_DOOR: sourceFunction('src/entities/town/workshop.ts', 'WORKSHOP_DOOR', {}),
    fireboxParts: () => {
      throw stopped;
    },
  });
  try {
    workshop(forge);
  } catch (error) {
    if (error !== stopped) throw error;
  }
  if (scene.children.length !== 1 || scene.children[0]!.children.length !== 5)
    throw new Error('workshop geometry adapter changed');
  scene.children[0]!.children.forEach((o, i) =>
    addObject(o, new THREE.Matrix4(), `forge/${i < 2 ? 'door-step' : 'guard'}-${i}`),
  );
  const gorgeTrimmed = gorgeSurfaces(readLevel('gorge'));
  const prefab = (p: Placement, frame = new THREE.Matrix4()) => {
    const def = compiled.prefabs[p.prefab]!;
    if (!('builder' in def.visual)) return;
    const visual = def.visual;
    const matrix = frame.clone().multiply(transform(p));
    if (visual.builder === 'greybox.box') {
      for (const [i, t] of (visual.instances ?? [{ pos: [0, 0, 0] as const }]).entries())
        addGeometry(
          gorgeTrimmed.get(p.id) ?? new THREE.BoxGeometry(1, 1, 1),
          matrix.clone().multiply(transform(t)),
          `${p.id}/instance-${i}`,
          {
            material: 'greybox stone',
            color: new THREE.Color((p.params?.colour ?? visual.params.colour) as string).toArray() as [
              number,
              number,
              number,
            ],
            castShadow: p.id.startsWith('town.'),
            receiveShadow: true,
            vertexColors: false,
          },
          p.id,
        );
      return;
    }
    const build = builders.get(visual.builder);
    if (!build) throw new Error(`z-fight adapter missing builder ${visual.builder} (${p.id})`);
    const result = build({ ...visual.params, ...p.params });
    if ('parts' in result) addParts(result.parts, matrix, p.id);
    else if ('construction' in result) result.construction.parts.forEach((b, i) => addBox(b, `${p.id}/box-${i}`));
    else if ('object' in result) {
      addObject(result.object, matrix, p.id);
      result.dispose();
    } else addObject(result, matrix, p.id);
  };
  for (const p of haltKitPlacements) {
    if (!('builder' in compiled.prefabs[p.prefab]!.visual)) continue;
    if (['lever', 'signal', 'road-plaque', 'stack-display'].includes(p.params!.piece as string)) continue;
    const f = haltFrame(p.params!.row as number, p.params!.up as boolean);
    const frame = p.params!.world ? new THREE.Matrix4() : transform({ pos: [f.c.x, f.low, f.c.z], rot: [f.yaw, 0, 0] });
    if (p.params!.up && p.params!.piece === 'ramp-visual') {
      // createHaltKit routes these returned parts through box-plan with their world yaw.
      const visual = compiled.prefabs[p.prefab]!.visual;
      if (!('builder' in visual)) continue;
      const result = builders.get(visual.builder)!({ ...visual.params, ...p.params });
      if (!('parts' in result)) throw new Error('up ramp adapter changed');
      for (const [i, part] of result.parts.entries()) {
        const geometry = merged([[part[0], part[1], part[2], part[3], part[4], part[5], part[6], part[7]]]);
        // Rotate around the part's centre, just as halt-kit.rampBoxes does.
        const [, x, y, z] = part;
        const m = new THREE.Matrix4()
          .makeTranslation(x, y, z)
          .multiply(
            new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(part[8] ?? 0, p.params!.yaw as number, 0, 'YXZ')),
          )
          .multiply(new THREE.Matrix4().makeTranslation(-x, -y, -z));
        addGeometry(
          geometry,
          m,
          `${p.id}/part-${i}`,
          { material: 'halt ramp', color: [1, 1, 1], castShadow: true, receiveShadow: true, vertexColors: true },
          p.id,
        );
      }
    } else prefab(p, frame);
  }
  for (const p of readLevel('workshop-kit')) prefab(p, workshopFrame);
  for (const id of ['house', 'shop', 'museum'] as const) {
    const plot = layout.ROOM_PLOTS[id];
    const x = layout.toWorld(plot.x),
      y = terrain.H(x, plot.z);
    for (const p of readLevel(`room-${id}`)) {
      if (!p.id.includes('-pieces-') && !p.id.endsWith('-scaffold-0')) continue;
      prefab({ ...p, params: { ...p.params, x, y, z: plot.z, yaw: plot.yaw } });
    }
    const frame = transform({ pos: [x, y + layout.ROOM_FLOOR, plot.z], rot: [plot.yaw, 0, 0] });
    for (const p of readLevel(id)) {
      const visual = compiled.prefabs[p.prefab]!.visual;
      if (!('builder' in visual) || visual.builder === 'town.museum-exhibit' || p.id.includes('-later-')) continue;
      prefab(p, frame);
    }
  }
  for (const name of ['gorge', 'bell', 'west']) for (const p of readLevel(name)) prefab(p);
  for (const p of standBlockout(readLevel('town-blockout'), terrain.H)) prefab(p);
  for (const p of openingStops())
    addGeometry(
      new THREE.BoxGeometry(p.w, p.h, p.d),
      transform({ pos: [p.x, p.base + p.h / 2, p.z], rot: [p.yaw, 0, 0] }),
      p.id,
      {
        material: 'opening flat',
        color: new THREE.Color(p.color).toArray() as [number, number, number],
        castShadow: true,
        receiveShadow: true,
        vertexColors: false,
      },
      p.id.replace(/\/[^/]+$/, '/part'),
    );
  for (const face of await collectTrackGeometry()) faces.push(face);
  for (const d of timberDecks().filter((d) =>
    /^(pad\/|pad-column\/|pillar-lip\/|service-|footbridge\/|approach\/|landing\/)/.test(d.id),
  )) {
    const matrix = new THREE.Matrix4()
      .makeBasis(d.axes[0]!, d.axes[1]!, d.axes[2]!)
      .setPosition(d.center)
      .scale(new THREE.Vector3(d.half[0]! * 2, d.half[1]! * 2, d.half[2]! * 2));
    addGeometry(new THREE.BoxGeometry(1, 1, 1), matrix, `${d.owner}:${d.id}`);
  }

  // Capture the actual full-resolution land buffers, as dev/ground/drawn.ts samples in-game.
  // Ground layers pack attributes without rewriting positions; shaders remain beyond this capture door.
  const bindings = {
    THREE,
    ...layout,
    ...terrain,
    ...cove,
    smoothstep,
    LOOK: { ground: true },
    location: { search: '' },
    describeGround,
    homeGroundMaterial: () => flat('#ffffff'),
    meadowLawnLayer: () => undefined,
    SEA,
    shoreApronHeight,
    dressCoveGround: () => {},
    applyPathSurface: () => {},
  };
  const soilHeight = sourceFunction('src/place/land.ts', 'soilHeight', bindings);
  const macroSlopeY = sourceFunction('src/place/land.ts', 'macroSlopeY', { ...bindings, soilHeight });
  let ground: THREE.BufferGeometry | null = null;
  const buildMesh = sourceFunction<(owner: unknown) => void>('src/place/land.ts', 'buildMesh', {
    ...bindings,
    macroSlopeY,
    addGroundLayers: sourceFunction('src/place/land.ts', 'addGroundLayers', bindings),
  });
  try {
    buildMesh({
      cleanup() {},
      add(mesh: THREE.Mesh) {
        ground = mesh.geometry;
        throw stopped;
      },
    });
  } catch (error) {
    if (error !== stopped) throw error;
  }
  if (!ground) throw new Error('ground adapter did not capture land mesh');
  // Only terrain beside collected pieces can fight with them. Avoid inspecting empty kilometres of ocean.
  const occupied = new Set<string>();
  for (const f of faces) for (const p of f.points) occupied.add(`${Math.floor(p[0] / 8)},${Math.floor(p[2] / 8)}`);
  const groundFaces = geometryFaces(ground, new THREE.Matrix4(), 'terrain/Home', true).filter((f) =>
    f.points.some((p) => occupied.has(`${Math.floor(p[0] / 8)},${Math.floor(p[2] / 8)}`)),
  );
  faces.push(...groundFaces);
  (ground as THREE.BufferGeometry).dispose();
  return {
    faces,
    excluded,
    coverage:
      'Completed opening, forge and house/shop/museum shells and furnishing records; actual workshop steps/guards; halt-kit builders in their owning frames; greybox and town placements; opening props; real baked track kit (main lines and Home yard), Home station boxes; level-check walkway/pad boxes; default Home terrain mesh near pieces.',
  };
}
