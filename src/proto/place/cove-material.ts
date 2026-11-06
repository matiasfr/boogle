// One island-space layer vocabulary for heightfield and sculpted kit. Local live numeric controls.
import * as THREE from 'three/webgpu';
import {
  abs,
  attribute,
  float,
  fract,
  max,
  mix,
  normalFlat,
  normalViewGeometry,
  normalWorldGeometry,
  positionWorld,
  sin,
  smoothstep,
  texture,
  vec3,
  bumpMap,
} from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import { coveU } from './cove-tuning.ts';
import { coveTextures } from './cove-textures.ts';
import { registerCoveSand } from './cove-sand.ts';
import { COVE_CLAY, COVE_DRY } from './cove.ts';
import { ORIGIN } from './layout.ts';
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
const pigment = (family: 'rock' | 'grass' | 'sand' | 'path') =>
  vec3(coveU(`${family}R`), coveU(`${family}G`), coveU(`${family}B`));
export function applyCoveLayers(material: THREE.MeshStandardNodeMaterial, region: N, kit = false) {
  const tiles = coveTextures();
  const p = positionWorld.sub(vec3(ORIGIN.x, 0, ORIGIN.z));
  const n = normalWorldGeometry.normalize();
  const axes = abs(n).div(abs(n).x.add(abs(n).y).add(abs(n).z).max(0.0001));
  const repeat = coveU('rockScale');
  // Both vertical projections keep Y vertical; top pigment is nondirectional.
  const tri = (map: THREE.Texture) =>
    texture(map, p.zy.div(repeat))
      .mul(axes.x)
      .add(texture(map, p.xz.div(repeat)).mul(axes.y))
      .add(texture(map, p.xy.div(repeat)).mul(axes.z));
  const rockPaint = tri(tiles.rock).rgb;
  const rockHeight = tri(tiles.data).r;
  const turfUV = p.xz.div(coveU('grassScale'));
  const turfPaint = texture(tiles.turf, turfUV).rgb;
  const detail = texture(tiles.data, turfUV);
  const macro = texture(tiles.data, p.xz.mul(coveU('noiseScale')).div(8)).b.sub(0.5);
  const slope = coveU('slopeThreshold'),
    slopeWidth = coveU('slopeBlend');
  let rock: N = smoothstep(slope.sub(slopeWidth), slope.add(slopeWidth), n.y).oneMinus();
  const sandLine = coveU('sandHeight').add(macro.mul(coveU('heightBlend')));
  let sand: N = smoothstep(sandLine.sub(coveU('sandBlend')), sandLine.add(coveU('sandBlend')), p.y)
    .oneMinus()
    .mul(rock.oneMinus());
  let grass: N = rock.oneMinus().sub(sand).max(0);
  const tag: N = kit ? attribute('coveTurf', 'float') : float(0);
  if (kit) {
    grass = tag;
    rock = tag.oneMinus();
    sand = float(0);
  }
  const path: N = kit ? float(0) : attribute('covePath', 'float').clamp();
  // Microheight only contests existing coverage; zero-coverage layers never win.
  const influence = coveU('heightBlend');
  const rh = rock.add(rockHeight.mul(influence)),
    gh = grass.add(detail.g.mul(influence)),
    sh = sand.add(detail.a.mul(influence));
  const highest = max(
    max(rock.greaterThan(0).select(rh, -10), grass.greaterThan(0).select(gh, -10)),
    sand.greaterThan(0).select(sh, -10),
  );
  const blend = coveU('layerBlend');
  const rw = rock.mul(rh.sub(highest).add(blend).max(0));
  const gw = grass.mul(gh.sub(highest).add(blend).max(0));
  const sw = sand.mul(sh.sub(highest).add(blend).max(0));
  const total = rw.add(gw).add(sw);
  rock = total.greaterThan(0.0001).select(rw.div(total.max(0.0001)), rock);
  grass = total.greaterThan(0.0001).select(gw.div(total.max(0.0001)), grass);
  sand = total.greaterThan(0.0001).select(sw.div(total.max(0.0001)), sand);
  const phase = fract(
    p.y
      .add(
        sin(p.x.mul(coveU('noiseScale')))
          .add(sin(p.z.mul(coveU('noiseScale'))))
          .mul(coveU('bandWarp')),
      )
      .div(coveU('bandScale')),
  );
  const band = smoothstep(0, coveU('bandWidth'), phase).mul(
    smoothstep(coveU('bandWidth').oneMinus(), 1, phase).oneMinus(),
  );
  const bedTone = mix(float(0.65), float(1.08), band);
  const rockCol = pigment('rock')
    .mul(mix(vec3(1), rockPaint, coveU('pigmentStrength')))
    .mul(mix(float(1), bedTone, coveU('strataStrength')));
  const grassCol = pigment('grass').mul(mix(vec3(1), turfPaint, coveU('pigmentStrength')));
  const sandCol = pigment('sand').mul(macro.mul(coveU('detailStrength')).add(1));
  const lip = kit
    ? smoothstep(0, coveU('lipWidth'), tag).mul(smoothstep(coveU('lipWidth'), 1, tag).oneMinus())
    : float(0);
  const dry = rockCol
    .mul(rock)
    .add(grassCol.mul(grass))
    .add(sandCol.mul(sand))
    .mul(lip.mul(coveU('lipShade')).oneMinus());
  const result = mix(dry, pigment('path'), path);
  patchNode(material, 'colorNode', (previous) =>
    mix(previous ?? result, COVE_CLAY ? vec3(0.65, 0.63, 0.59) : result, region),
  );
  patchNode(material, 'roughnessNode', (previous) =>
    mix(previous ?? float(material.roughness), coveU('roughness'), region),
  );
  const smooth = mix(normalFlat, normalViewGeometry, coveU('normalSmoothing')).normalize();
  const relief: N = bumpMap(detail.g.mul(grass).add(rockHeight.mul(rock)), coveU('detailStrength'));
  patchNode(material, 'normalNode', (previous) =>
    mix(previous ?? normalViewGeometry, mix(smooth, relief, coveU('detailStrength')).normalize(), region).normalize(),
  );
  if (!COVE_DRY) registerCoveSand(material, sand.mul(path.oneMinus()).mul(region));
}
