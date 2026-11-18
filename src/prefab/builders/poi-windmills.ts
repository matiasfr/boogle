// The windmill farm's records (src/pois/windmills/): a mill's tower and cap, its turning rotor, a hay bale and the
// fence along the cart track. Static things are pieces the farm merges into one draw; the rotor is its own mesh, which
// the farm turns on the shared clock.
import * as THREE from 'three';
import { registerBuilder, type Piece } from '../builders.ts';
import { millBody, put, rotorParts } from '../../pois/windmills/model.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'poi.windmill': true;
    'poi.windmill-rotor': true;
    'poi.hay-bale': true;
    'poi.fence-post': true;
    'poi.fence-rail': true;
  }
}

let shared: { material: THREE.MeshStandardMaterial; rotor: THREE.BufferGeometry } | null = null;
/** The farm's one material (the merged statics and the rotors) and the rotors' one geometry. */
export function windmillKit() {
  return (shared ??= {
    material: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
    rotor: rotorParts(),
  });
}
const finite = (value: unknown, name: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`prefabs: expected finite ${name}`);
  return value;
};

// The tower stands axis-aligned in the world (its collider is an octagon that must not turn), so its facing is a
// parameter, not the placement's rotation.
registerBuilder('poi.windmill', (params) => {
  const local: Piece[] = [];
  millBody(local);
  const turn = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, finite(params.yaw, 'mill yaw'), 0)),
  );
  return { pieces: local.map((p) => ({ ...p, matrix: p.matrix.premultiply(turn) })) };
});

registerBuilder('poi.windmill-rotor', () => {
  const kit = windmillKit();
  const rotor = new THREE.Mesh(kit.rotor, kit.material);
  rotor.castShadow = true;
  return rotor;
});

const bale = new THREE.CylinderGeometry(0.75, 0.75, 1.3, 10),
  box = new THREE.BoxGeometry(1, 1, 1);
registerBuilder('poi.hay-bale', (params) => {
  const pieces: Piece[] = [];
  put(pieces, bale, 0, 0, 0, 1, 1, 1, '#d6b35d', new THREE.Euler(Math.PI / 2, finite(params.spin, 'bale spin'), 0));
  return { pieces };
});
registerBuilder('poi.fence-post', () => {
  const pieces: Piece[] = [];
  put(pieces, box, 0, 0, 0, 0.13, 1, 0.13, '#7b5a3a');
  return { pieces };
});
registerBuilder('poi.fence-rail', () => {
  const pieces: Piece[] = [];
  put(pieces, box, 0, 0, 0, 0.06, 0.08, 2.3, '#8f6d47');
  return { pieces };
});
