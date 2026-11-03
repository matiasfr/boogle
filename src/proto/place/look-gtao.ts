// `&look=gtao`: half-resolution GTAO on its own scene pass, composed before tone mapping (the same chain as
// src/debug/look-post.ts). A short radius, so it finds where things meet and leaves no halos. Lazy: only with the flag.
import * as THREE from 'three/webgpu';
import {
  colorToDirection,
  directionToColor,
  mix,
  mrt,
  normalView,
  output,
  pass,
  sample,
  screenUV,
  vec4,
} from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { camera, pipeline, scene } from '../../render/scene.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;
const p = pass(scene, camera);
p.setMRT(mrt({ output, normal: directionToColor(normalView) }));
p.getTexture('normal').type = THREE.UnsignedByteType;
const color: N = p.getTextureNode('output'),
  depth: N = p.getTextureNode('depth'),
  normal: N = p.getTextureNode('normal');
export const toneSource: N = color; // the comparison meters this pass, without drawing the scene a second time
const a: N = ao(
  depth,
  sample((uv: N) => colorToDirection(normal.sample(uv))),
  camera,
);
a.resolutionScale = 0.5;
a.samples.value = 12;
a.radius.value = 0.6;
const occ: N = a.getTextureNode().sample(screenUV).r;
pipeline.outputNode = vec4(color.rgb.mul(mix(1, occ, 0.75)), color.a);
pipeline.needsUpdate = true;
