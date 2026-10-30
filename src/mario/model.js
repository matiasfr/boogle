// Meshes for the decomp's models (Mario, Yoshi): the triangles sm64.wasm draws (posed, in SM64 units around the
// feet), lit by the island's sun like everything else. The ROM textures sit in one atlas; each vertex says which
// texture it shows and how it combines with the shade colour the way the N64 combiner did (blend by the texture's
// alpha, decal, modulate).
import * as THREE from 'three';
import { TEXTURES } from './textures.js';
import { VERT_FLOATS } from './sim.js';
import { UNITS } from './collision.js';

const MAX_VERTS = 2048 * 3;
const CELL = 64; // atlas cell, texels; every texture fits one
const COLS = 4;
const ATLAS_W = CELL * COLS,
  ATLAS_H = CELL * Math.ceil(TEXTURES.length / COLS);

let atlas = null;
// The one atlas, from src/mario/rom.js's `textures`: every texture back to back, RGBA5551, big-endian, row 0 on top.
export const getAtlas = (textures) => (atlas ??= buildAtlas(textures));

function buildAtlas(textures) {
  const px = new Uint8Array(ATLAS_W * ATLAS_H * 4);
  let s = 0;
  TEXTURES.forEach((t, k) => {
    const cx = (k % COLS) * CELL,
      cy = Math.floor(k / COLS) * CELL;
    for (let y = 0; y < t.h; y++)
      for (let x = 0; x < t.w; x++, s += 2) {
        const v = (textures[s] << 8) | textures[s + 1];
        const o = ((cy + y) * ATLAS_W + cx + x) * 4;
        px[o] = ((v >> 11) & 31) * 8.226;
        px[o + 1] = ((v >> 6) & 31) * 8.226;
        px[o + 2] = ((v >> 1) & 31) * 8.226;
        px[o + 3] = v & 1 ? 255 : 0;
      }
  });
  const tex = new THREE.DataTexture(px, ATLAS_W, ATLAS_H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// Atlas rectangle of each texture, inset half a texel so filtering never reads a neighbour.
const RECTS = TEXTURES.map((t, k) => [
  ((k % COLS) * CELL + 0.5) / ATLAS_W,
  (Math.floor(k / COLS) * CELL + 0.5) / ATLAS_H,
  (t.w - 1) / ATLAS_W,
  (t.h - 1) / ATLAS_H,
]);

function modelMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.marioAtlas = { value: atlas };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec2 marioUv;\nattribute vec4 marioRect;\nattribute float marioMix;\n' +
          'varying vec2 vMarioUv;\nvarying vec4 vMarioRect;\nvarying float vMarioMix;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvMarioUv = marioUv;\nvMarioRect = marioRect;\nvMarioMix = marioMix;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D marioAtlas;\nvarying vec2 vMarioUv;\nvarying vec4 vMarioRect;\n' +
          'varying float vMarioMix;',
      )
      .replace(
        '#include <color_fragment>',
        `vec3 marioCol = vColor.rgb;
        if (vMarioMix > 0.5) {
          vec4 t = texture2D(marioAtlas, vMarioRect.xy + clamp(vMarioUv, 0.0, 1.0) * vMarioRect.zw);
          marioCol = vMarioMix < 1.5 ? mix(vColor.rgb, t.rgb, t.a) : vMarioMix < 2.5 ? t.rgb : vColor.rgb * t.rgb;
        }
        diffuseColor.rgb *= marioCol;`,
      );
  };
  return mat;
}

// Needs the atlas (getAtlas) first.
export function createModelMesh() {
  const geo = new THREE.BufferGeometry();
  const attr = (name, size) => {
    const a = new THREE.BufferAttribute(new Float32Array(MAX_VERTS * size), size);
    a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute(name, a);
  };
  attr('position', 3);
  attr('normal', 3);
  attr('color', 3);
  attr('marioUv', 2);
  attr('marioRect', 4);
  attr('marioMix', 1);
  geo.setDrawRange(0, 0);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 2);
  const mesh = new THREE.Mesh(geo, modelMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

// Copies the sim's vertex buffer into the mesh, metres around the model's feet.
export function updateModelMesh(mesh, verts, count) {
  const g = mesh.geometry;
  const pos = g.attributes.position.array,
    nor = g.attributes.normal.array,
    col = g.attributes.color.array,
    uv = g.attributes.marioUv.array,
    rect = g.attributes.marioRect.array,
    mix = g.attributes.marioMix.array;
  const n = Math.min(count, MAX_VERTS);
  for (let i = 0; i < n; i++) {
    const s = i * VERT_FLOATS;
    pos[i * 3] = verts[s] / UNITS;
    pos[i * 3 + 1] = verts[s + 1] / UNITS;
    pos[i * 3 + 2] = verts[s + 2] / UNITS;
    nor[i * 3] = verts[s + 3];
    nor[i * 3 + 1] = verts[s + 4];
    nor[i * 3 + 2] = verts[s + 5];
    col[i * 3] = lin(verts[s + 6]);
    col[i * 3 + 1] = lin(verts[s + 7]);
    col[i * 3 + 2] = lin(verts[s + 8]);
    uv[i * 2] = verts[s + 9];
    uv[i * 2 + 1] = verts[s + 10];
    const r = RECTS[verts[s + 11]] ?? RECTS[0];
    rect.set(r, i * 4);
    mix[i] = verts[s + 11] >= 0 ? verts[s + 12] : 0;
  }
  for (const a of Object.values(g.attributes)) {
    a.clearUpdateRanges();
    a.addUpdateRange(0, n * a.itemSize);
    a.needsUpdate = true;
  }
  g.setDrawRange(0, n);
}
