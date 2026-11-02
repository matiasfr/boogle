// The look lab's post chain (?proto=look, src/debug/look-lab.ts): builds pipeline.outputNode from a set of layer flags,
// on a pass of its own, and puts the game's plain scenePass back when no post layer is on. Order:
//   scene (MRT: colour, view normal, velocity, diffuse when a layer needs them; MSAA off under TRAA)
//   -> SSGI or GTAO -> TRAA -> bloom (all linear HDR) -> tone map + sRGB -> ink outlines -> grade -> tilt-shift.
// Every rebuild disposes the previous nodes and render targets. Debug only: nothing here runs without the flag.
import * as THREE from 'three/webgpu';
import {
  pass,
  mrt,
  output,
  normalView,
  directionToColor,
  colorToDirection,
  velocity,
  diffuseColor,
  sample,
  screenUV,
  vec2,
  vec3,
  vec4,
  float,
  uniform,
  mix,
  max,
  abs,
  dot,
  length,
  pow,
  luminance,
  saturation,
  renderOutput,
  perspectiveDepthToViewZ,
  smoothstep as tslSmoothstep,
  Fn,
} from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';
import { renderer, scene, camera, scenePass, pipeline } from '../render/scene.ts';

// TSL's types don't follow node graphs built from addon outputs; the lab keeps them loose rather than cast every line.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

export type PostFlags = {
  ao: boolean;
  ssgi: boolean;
  taa: boolean;
  bloom: boolean;
  outline: boolean;
  softline: boolean;
  grade: boolean;
  tilt: boolean;
};

// Tunables the panel exposes; uniforms, so moving a slider never recompiles.
export const postU = {
  aoStrength: uniform(0.75),
  bloomStrength: uniform(0.22),
  bloomThreshold: uniform(0.92),
  ink: uniform(0.8),
  gradeSat: uniform(1.12),
  eraDesat: uniform(0), // the steam palette row's lower saturation (look-world.ts, era)
  gradeWarm: uniform(0.04),
  vignette: uniform(0.28),
  tiltBand: uniform(0.16),
  tiltFocus: uniform(0.55),
};
const texel = uniform(new THREE.Vector2(1 / 960, 1 / 600));
const size = new THREE.Vector2();

let live: { dispose(): void }[] = [];

export const postActive = (f: PostFlags) => Object.values(f).some(Boolean);

export function updatePostUniforms() {
  renderer.getDrawingBufferSize(size);
  texel.value.set(1 / Math.max(1, size.x), 1 / Math.max(1, size.y));
}

export function buildPost(f: PostFlags) {
  for (const n of live) n.dispose();
  live = [];
  pipeline.outputColorTransform = true;
  if (!postActive(f)) {
    pipeline.outputNode = scenePass;
    pipeline.needsUpdate = true;
    return;
  }
  const taa = f.taa || f.ssgi; // SSGI is noisy per frame: it needs the temporal resolve
  const needNormal = f.ao || f.ssgi || f.outline || f.softline;
  const p = pass(scene, camera, taa ? { samples: 0 } : {});
  live.push(p);
  const outs: Record<string, N> = { output };
  if (needNormal) outs.normal = directionToColor(normalView);
  if (taa) outs.velocity = velocity;
  if (f.ssgi) outs.diffuse = diffuseColor;
  if (Object.keys(outs).length > 1) p.setMRT(mrt(outs));
  if (needNormal) p.getTexture('normal').type = THREE.UnsignedByteType; // a quarter of the bandwidth of half floats
  if (f.ssgi) p.getTexture('diffuse').type = THREE.UnsignedByteType;

  const colorTex: N = p.getTextureNode('output');
  const depthTex: N = p.getTextureNode('depth');
  const normalTex: N = needNormal ? p.getTextureNode('normal') : null;
  const viewNormal: N = needNormal ? sample((uv: N) => colorToDirection(normalTex.sample(uv))) : null;

  let col: N = colorTex;
  if (f.ssgi) {
    const gi: N = ssgi(colorTex, depthTex, viewNormal, camera);
    gi.sliceCount.value = 2;
    gi.stepCount.value = 8;
    gi.resolutionScale = 0.5;
    live.push(gi);
    const occ: N = gi.getAONode().sample(screenUV).r;
    const light: N = gi.getGINode().sample(screenUV).rgb;
    const diffuse: N = p.getTextureNode('diffuse');
    col = vec4(colorTex.rgb.mul(occ).add(diffuse.rgb.mul(light)), colorTex.a);
  } else if (f.ao) {
    const a: N = ao(depthTex, viewNormal, camera);
    a.resolutionScale = 0.5;
    a.samples.value = 12;
    a.radius.value = 0.6;
    live.push(a);
    const occ: N = a.getTextureNode().sample(screenUV).r;
    col = vec4(colorTex.rgb.mul(mix(float(1), occ, postU.aoStrength)), colorTex.a);
  }
  if (taa) {
    const t: N = traa(col, depthTex, p.getTextureNode('velocity'), camera);
    live.push(t);
    col = t;
  }
  if (f.bloom) {
    const b: N = bloom(col, 0, 0.45, 0);
    b.strength = postU.bloomStrength;
    b.threshold = postU.bloomThreshold;
    live.push(b);
    col = vec4(col.rgb.add(b.rgb), 1);
  }

  if (f.outline || f.softline || f.grade || f.tilt) {
    pipeline.outputColorTransform = false; // tone map here, so the screen-space looks work on display colours
    col = renderOutput(col);
  }
  if (f.outline) col = vec4(mix(col.rgb, vec3(0.13, 0.09, 0.1), inkEdge(depthTex, normalTex).mul(postU.ink)), 1);
  else if (f.softline)
    col = vec4(mix(col.rgb, col.rgb.mul(vec3(0.42, 0.36, 0.5)), softEdge(depthTex, normalTex).mul(postU.ink)) as N, 1);
  if (f.grade) col = grade(col);
  if (f.tilt) {
    const blurred: N = gaussianBlur(col, null, 4, { resolutionScale: 0.5 });
    live.push(blurred);
    const off = abs(screenUV.y.sub(postU.tiltFocus));
    const m: N = tslSmoothstep(postU.tiltBand, postU.tiltBand.mul(2.6), off);
    col = vec4(mix(col.rgb, blurred.rgb, m) as N, 1);
  }
  pipeline.outputNode = col;
  pipeline.needsUpdate = true;
}

// Ink lines where depth jumps (relative to distance, so near and far read the same) or the normal turns sharply.
// Fades past ~70 m, so distant hills stay soft instead of buzzing.
const inkFn = (fadeFrom: number, fadeTo: number, normalW: number) =>
  Fn(([depthTex, normalTex]: N[]) => {
    const near = float(camera.near),
      far = float(camera.far);
    const z = (uv: N) => perspectiveDepthToViewZ(depthTex.sample(uv).r, near, far).negate();
    const n = (uv: N) => colorToDirection(normalTex.sample(uv).rgb);
    const c = screenUV;
    const dx = vec2(texel.x, 0),
      dy = vec2(0, texel.y);
    const zc = z(c);
    const zs = [z(c.add(dx)), z(c.sub(dx)), z(c.add(dy)), z(c.sub(dy))];
    let dz: N = float(0);
    for (const zi of zs) dz = max(dz, zc.sub(zi)); // only the far side of an edge inks: one pixel wide, not two
    const depthEdge = tslSmoothstep(0.04, 0.12, dz.div(zc));
    const nc = n(c);
    let turn: N = float(0);
    for (const o of [dx, dy]) turn = max(turn, float(1).sub(dot(nc, n(c.add(o)))));
    const normalEdge = tslSmoothstep(0.25, 0.55, turn);
    const fade = tslSmoothstep(fadeTo, fadeFrom, zc);
    return max(depthEdge, normalEdge.mul(normalW)).mul(fade);
  });
const inkEdge = inkFn(35, 70, 1);
// Soft lines (the painted diorama): silhouettes first, creases at half strength, gone by 45 m (Sable fades its lines
// with distance), drawn in a darker shade of the pixel's own colour instead of black.
const softEdge = inkFn(15, 45, 0.5);

// A light grade on display colours: a touch more saturation, warm highlights and cool shadows, a soft S-curve and a
// vignette that keeps the eye on the middle of the screen.
const grade = Fn(([c]: N[]) => {
  let rgb: N = saturation(c.rgb, postU.gradeSat.mul(float(1).sub(postU.eraDesat)));
  const l = luminance(rgb);
  const warm = vec3(1, 0.55, 0.15)
    .mul(postU.gradeWarm)
    .mul(tslSmoothstep(0.45, 1, l));
  const cool = vec3(-0.25, 0, 0.35)
    .mul(postU.gradeWarm)
    .mul(tslSmoothstep(0.45, 0, l));
  rgb = rgb.add(warm).add(cool);
  rgb = mix(rgb, rgb.mul(rgb).mul(float(3).sub(rgb.mul(2))), 0.25);
  const v = pow(length(screenUV.sub(0.5)).mul(1.35), 2.5).mul(postU.vignette);
  return vec4(rgb.mul(float(1).sub(v)), 1);
});
