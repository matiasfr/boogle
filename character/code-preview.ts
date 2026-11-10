// All imports construct geometry only. Never import a feature, POI index or world scene.
import * as THREE from 'three/webgpu';
import { addPalm, addBroadleaf, addRock } from '../src/render/prop-models.ts';
import { addPart, mergeParts } from '../src/render/geometry-parts.ts';
import { itemModel } from '../src/player/item-models.ts';
import { millBody, rotorParts, HUB_UP } from '../src/pois/windmills/model.ts';
import { sailAngle } from '../src/pois/windmills/motion.ts';
import type { CodeId } from './code-descriptors.ts';
import type { KitPart } from './engine-previz.ts';
import type { Figure } from './car-previz.ts';
import { partGeometry } from '../src/proto/net/box-plan.ts';

export type CodePreview = {
  group: THREE.Group;
  seek(t: number): void;
  advance(dt: number): void;
  dispose(): void;
  /** Where the stage's Buddy stands, for previews staged at a real place (the engine previz's halt deck). */
  buddy?: { x: number; y: number; z: number; yaw: number };
};
export async function codePreview(id: CodeId, kit?: KitPart, figure?: Figure): Promise<CodePreview> {
  if (id === 'car-four' || id === 'car-six')
    return (await import('./car-previz.ts')).carPreviz(id === 'car-four' ? 'four' : 'six', kit, figure);
  if (id.startsWith('engine-'))
    return (await import('./engine-previz.ts')).enginePreviz(id.slice(7) as 'a' | 'b' | 'c' | 'today', kit);
  const group = new THREE.Group();
  let rotor: THREE.Mesh | undefined;
  let time = 0;
  const seek = (t: number) => {
    time = t;
    if (rotor) rotor.rotation.z = sailAngle(t);
    group.updateMatrixWorld(true);
  };
  const parts: THREE.BufferGeometry[] = [];
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  if (id === 'palm')
    addPalm(parts, {
      blueprint: 'palm',
      x: 0,
      h: 0,
      z: 0,
      lean: { angle: 0.6, amount: 0.3, height: 5.4 },
      look: { fronds: Array.from({ length: 8 }, (_, i) => ({ angle: (i * Math.PI) / 4, droop: 0.45 })) },
    });
  else if (id === 'broadleaf')
    addBroadleaf(parts, {
      blueprint: 'broadleaf',
      x: 0,
      h: 0,
      z: 0,
      look: { height: 3, crown: 2, blobs: [0, 2, 4].map((angle) => ({ angle, spin: [0.3, angle, 0.5] })) },
    });
  else if (id === 'rock')
    addRock(parts, { blueprint: 'rock', x: 0, h: 0, z: 0, size: 1.5, look: { spin: [0.4, 0.7, 0.2], dark: false } });
  else if (id === 'seeds' || id === 'frisbee') {
    const model = itemModel(id);
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry = o.geometry.clone();
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      }
    });
    group.add(model);
  } else if (id.startsWith('windmill')) {
    if (id !== 'windmill-rotor') millBody(parts);
    if (id !== 'windmill-body') {
      rotor = new THREE.Mesh(rotorParts(), material);
      rotor.name = 'stage-rotor';
      rotor.rotation.order = 'YXZ';
      rotor.rotation.x = 0.08;
      if (id === 'windmill') rotor.position.set(0, HUB_UP, -2.25);
      else rotor.position.y = HUB_UP; // Keep the isolated rotor's full sweep above the inspection floor.
      group.add(rotor);
    }
  } else {
    const { housePlan, towerPlan, blockPlan } = await import('../src/proto/place/building-plans.ts');
    const plan =
      id === 'tower'
        ? towerPlan(
            {
              x: 0,
              z: 0,
              w: 4,
              high: 12,
              course: 1,
              a: '#c0b69e',
              b: '#a79c84',
              tops: [{ w: 5, h: 1, color: '#765c43' }],
            },
            0,
          )
        : id === 'block'
          ? blockPlan({ x: 0, z: 0, w: 3, h: 2, d: 2, color: '#b3956c' }, 0, 3)
          : housePlan(
              {
                x: 0,
                z: 0,
                w: 6,
                d: 5,
                high: 4,
                rise: 2,
                wall: '#d3bd94',
                post: '#765236',
                roof: '#915d43',
                door: { w: 1.5, rows: 3 },
                windows: '#6f9eaa',
              },
              0,
            );
    for (const box of id === 'scaffold' ? plan.scaffold : plan.pieces) {
      const geo = partGeometry(box.taper);
      addPart(parts, geo, new THREE.Matrix4().makeTranslation(box.x, box.y, box.z).multiply(box.local), box.color);
      geo.dispose();
    }
  }
  if (parts.length) {
    group.add(new THREE.Mesh(mergeParts(parts), material));
    parts.forEach((p) => p.dispose());
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });
  return {
    group,
    seek,
    advance: (dt) => seek(time + dt),
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>([material]);
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
