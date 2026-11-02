import type * as THREE from 'three/webgpu';

export { me, cam, camForward, ITEM_HAND } from './state.ts';
export { enterIsland } from '../entities/player/state.ts';

// Features that need the third-person camera somewhere special (the caves keep it inside the tunnel) push
// fn(look, pos) -> true when they placed `pos` themselves; then the usual "stay above the ground" rule is skipped.
export const camConstraints: ((look: THREE.Vector3, pos: THREE.Vector3) => boolean)[] = [];
