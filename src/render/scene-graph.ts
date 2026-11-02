// The scene alone, no canvas or renderer: spawning an entity adds its mesh here, and that has to load in Node too
// (dev/sim/). ./scene.ts sets it up and draws it.
import * as THREE from 'three/webgpu';

export const scene = new THREE.Scene();
