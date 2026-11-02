import * as THREE from 'three';

/** The key light's direction: read by the shadow-casting light (player.ts) and the water, mutated in place by sky.ts. */
export const SUN_DIR = new THREE.Vector3(0.45, 0.78, 0.32).normalize();
