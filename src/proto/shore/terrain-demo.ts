// Dry Ultra Water terrain comparison, Local only. DESIGN.md: Small and readable; Show, don't tell.
// Research: docs/research/ultra-water.md recommendations 4/7. Production water optics are unchanged.
import type { MeshStandardNodeMaterial } from 'three/webgpu';
import { patchNode } from '../../render/material-patch.ts';
import { groundNoise, sandNormal, rockNormal, seabedAlbedo, fineTerrain } from './ground.ts';
import { TSL } from '../../render/water/tsl.ts';

const { cameraViewMatrix, clamp, float, mix, normalWorldGeometry, positionWorld, smoothstep: ss, vec3, vec4 } = TSL;
export type TerrainMode = 'today' | 'demo' | 'biomes' | 'no-noise' | 'no-ripples' | 'coarse' | 'rock';
const modes: TerrainMode[] = ['today', 'demo', 'biomes', 'no-noise', 'no-ripples', 'coarse', 'rock'];
const patches: { material: MeshStandardNodeMaterial; original: MeshStandardNodeMaterial; origin: number }[] = [];

/** Capture-only A/B switches reuse the actual material, including masks and shadow slots. */
export function setTerrainDemoMode(mode: TerrainMode) {
  fineTerrain.value = mode !== 'coarse';
  for (const { material: m, original, origin } of patches) {
    m.vertexColors = original.vertexColors;
    m.colorNode = original.colorNode;
    m.normalNode = original.normalNode;
    m.roughnessNode = original.roughnessNode;
    m.needsUpdate = true;
    if (mode === 'today') continue;
    const p = positionWorld.sub(vec3(origin, 0, 0));
    // Keep Place's smooth grass / faceted cliff normals, and home's flat shading.
    const normal = original.normalNode
      ? cameraViewMatrix.transpose().mul(vec4(original.normalNode, 0)).xyz.normalize()
      : normalWorldGeometry;
    const noise = groundNoise();
    const n1 = mode === 'no-noise' ? float(0.5) : noise.filtered(p.xz.mul(0.08)).toVar();
    const n2 = mode === 'no-noise' ? float(0.5) : noise.filtered(p.xz.mul(0.6)).toVar();
    const n3 = mode === 'no-noise' ? float(0.5) : noise.filtered(p.xz.mul(0.013)).toVar();
    const sandLine = n3.mul(1.6).add(n1.mul(0.8)).add(2.4);
    const flat = clamp(normal.y, 0, 1);
    const sand = mix(vec3(0.8, 0.71, 0.53), vec3(0.72, 0.62, 0.45), n1).mul(n2.mul(0.16).add(0.92));
    const grass = mix(vec3(0.2, 0.3, 0.1), vec3(0.33, 0.37, 0.15), n1).mul(n2.mul(0.3).add(0.85));
    const stone = mix(vec3(0.33, 0.31, 0.29), vec3(0.45, 0.41, 0.36), n2).mul(n3.mul(0.4).add(0.8));
    let albedo = mix(seabedAlbedo(n1, n3), sand, ss(-0.05, 0.05, p.y));
    albedo = mix(albedo, grass, ss(sandLine, sandLine.add(1.5), p.y).mul(ss(0.62, 0.8, flat)));
    albedo = mix(
      albedo,
      stone,
      ss(0.62, 0.78, flat)
        .oneMinus()
        .mul(ss(-6, 1, p.y)),
    );
    albedo = mix(albedo, stone.mul(1.1), ss(38, 52, p.y.add(n1.mul(8))));
    // This comparison deliberately replaces authored paint, making its art-fit cost visible on paths/courts.
    m.vertexColors = false;
    patchNode(m, 'colorNode', () => albedo);
    patchNode(m, 'roughnessNode', () => float(0.92));
    if (mode === 'biomes' || mode === 'no-ripples') {
      patchNode(m, 'normalNode', () => cameraViewMatrix.mul(vec4(normal, 0)).xyz.normalize());
      continue;
    }
    const sandN = sandNormal(p, normal, sandLine, noise);
    // Optional bump on existing steep faces; the demo's separate rock meshes are not imported.
    const bumped = mode === 'rock' ? rockNormal(p, normal, noise.volume(p.mul(3.7).add(7)).toVar(), noise) : null;
    patchNode(m, 'normalNode', () =>
      bumped ? mix(sandN, bumped, ss(0.62, 0.78, flat).oneMinus()).normalize() : sandN,
    );
  }
}

export function applyTerrainDemo(material: MeshStandardNodeMaterial, origin = 0) {
  if (patches.some((p) => p.material === material)) return;
  patches.push({ material, original: material.clone(), origin });
  const requested = new URLSearchParams(location.search).get('terrainPart') as TerrainMode;
  setTerrainDemoMode(modes.includes(requested) ? requested : 'demo');
}
