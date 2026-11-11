// Local carried shapes and seating. No world, presence, clock or DOM dependencies: game and stage use these builders.
import * as THREE from 'three/webgpu';
import { material } from './materials.ts';
import { flat } from './flat.ts';
import { PACK, TUNE } from '../place/layout.ts';
import { merged } from './part-geometry.ts';
import { sideCarryOffset } from './head-clearance.ts';
import { makeProp } from './prop-kit.ts';

export type CargoKind = 'logs' | 'rails' | 'stone' | 'beam' | 'boiler';
export const cargoCapacity = (kind: CargoKind, frame: boolean): number =>
  kind === 'beam' || kind === 'boiler' ? 1 : frame ? PACK.carry : TUNE.carry;
/** One length of steel, shared with the world piece view. */
export const RAIL_SIZE = new THREE.Vector3(0.14, 0.16, 2.6);
export const BEAM_CARRY_POSITION = [sideCarryOffset(0.26), 0.85, 0.2] as const;

/** The same part on the pedestal, shoulder and locomotive saddle. */
export function makeBoiler() {
  return makeProp('boiler');
}

/** Owned materials and geometry, including the same readable worn steel in game and stage. */
export function makeCarryModels() {
  const root = new THREE.Group();
  root.name = 'wear_place_cargo';
  const rails = new THREE.InstancedMesh(
    merged([
      ['b', 0, 0, 0, 0.035, 0.68, 0.06, '#ffffff'],
      ['b', 0, 0, -0.04, 0.085, 0.68, 0.02, '#ffffff'],
      ['b', 0, 0, 0.04, 0.085, 0.68, 0.02, '#ffffff'],
    ]),
    new THREE.MeshStandardNodeMaterial({ color: '#899baa', roughness: 0.55, metalness: 0.25 }),
    PACK.carry,
  );
  rails.name = 'wear_carried_rails';
  rails.frustumCulled = false;
  rails.count = 0;
  // The steel banks rest beside the timber bundle, on a cross-bearer extending the pack's existing shelf.
  const railSeat = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.56), flat('#c5a466').clone());
  railSeat.name = 'wear_carried_rail_seat';
  railSeat.position.set(0, 0.14, 0.51);
  const worn = new THREE.Object3D();
  let packed: boolean | undefined;
  function setRails(amount: number, frame: boolean) {
    if (packed !== frame) {
      packed = frame;
      for (let k = 0; k < PACK.carry; k++) {
        if (frame) {
          // Upright steel rests on the pack shelf in two banks beside the log bundle.
          worn.position.set(k % 2 ? 0.38 : -0.38, 0.505, 0.29 + Math.floor(k / 2) * 0.065);
          worn.rotation.set(0, 0, 0);
          worn.scale.set(1, 1, 0.45);
        } else {
          worn.position.set(0, 0.205 + Math.floor(k / 4) * 0.11, 0.33 + (k % 4) * 0.11);
          worn.rotation.set(0, 0, Math.PI / 2);
          worn.scale.set(1, 1, 1);
        }
        worn.updateMatrix();
        rails.setMatrixAt(k, worn.matrix);
      }
      rails.instanceMatrix.needsUpdate = true;
    }
    rails.count = Number.isFinite(amount)
      ? Math.min(cargoCapacity('rails', frame), Math.max(0, Math.floor(amount)))
      : 0;
    rails.visible = rails.count > 0;
    railSeat.visible = frame && rails.visible;
  }
  setRails(0, false);
  const stone = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.16, 0), material('stone').clone(), PACK.carry);
  stone.name = 'wear_carried_stone';
  stone.frustumCulled = false;
  stone.count = 0;
  for (let k = 0; k < PACK.carry; k++) {
    worn.rotation.set(k, k * 2, 0);
    worn.position.set((k % 3) * 0.2 - 0.2, 0.3 + Math.floor(k / 6) * 0.22, 0.42 + (Math.floor(k / 3) % 2) * 0.2);
    worn.updateMatrix();
    stone.setMatrixAt(k, worn.matrix);
  }
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.26, 5.4, 8).rotateX(Math.PI / 2),
    flat('#7a5430').clone(),
  );
  beam.name = 'wear_carried_beam';
  beam.position.set(...BEAM_CARRY_POSITION);
  const boiler = makeBoiler();
  boiler.name = 'wear_carried_boiler';
  // A low side carry keeps the face and hat readable through the carrying sway.
  boiler.position.set(sideCarryOffset(0.55), 0.45, 0.12);
  root.add(rails, railSeat, stone, beam, boiler);
  root.traverse((o) => {
    o.castShadow = true;
  });
  for (const o of root.children) o.visible = false;
  return {
    root,
    rails,
    stone,
    beam,
    boiler,
    setRails,
    setCargo(kind: CargoKind, amount: number, frame: boolean) {
      const n = Number.isFinite(amount) ? Math.min(cargoCapacity(kind, frame), Math.max(0, Math.floor(amount))) : 0;
      setRails(kind === 'rails' ? n : 0, frame);
      stone.count = kind === 'stone' ? n : 0;
      stone.visible = stone.count > 0;
      beam.visible = kind === 'beam' && n > 0;
      boiler.visible = kind === 'boiler' && n > 0;
    },
  };
}
