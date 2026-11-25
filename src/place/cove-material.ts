// The cove's ground layers round the landing (cove-ground.ts): sand, turf, wet and relief of its own, and the rock every
// cliff shares (ground-material.ts beddedRock: one palette with the cliff kit, docs/plans/cliff-kit-everywhere.md,
// step 1). Local live numeric controls.
import * as THREE from 'three/webgpu';
import {
  abs,
  attribute,
  float,
  max,
  mix,
  normalFlat,
  normalViewGeometry,
  normalWorldGeometry,
  positionWorld,
  sign,
  smoothstep,
  texture,
  vec3,
  bumpMap,
} from 'three/tsl';
import { patchNode } from '../render/material-patch.ts';
import { WALKABLE_NY } from '../constants.ts';
import { coveU } from './cove-tuning.ts';
import { coveTextures } from './cove-textures.ts';
import { registerCoveSand } from './cove-sand.ts';
import { ORIGIN } from './layout.ts';
import { beddedRock } from './ground-material.ts';
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
const pigment = (family: 'grass' | 'sand' | 'path') =>
  vec3(coveU(`${family}R`), coveU(`${family}G`), coveU(`${family}B`));
export function applyCoveLayers(material: THREE.MeshStandardNodeMaterial, region: N, soilSlope: N) {
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
  const rockHeight = tri(tiles.data).r;
  const turfUV = p.xz.div(coveU('grassScale'));
  const turfPaint = texture(tiles.turf, turfUV).rgb;
  const detail = texture(tiles.data, turfUV);
  const macro = texture(tiles.data, p.xz.mul(coveU('noiseScale')).div(8)).b.sub(0.5);
  const slope = coveU('slopeThreshold'),
    slopeWidth = coveU('slopeBlend');
  const coverageSlope = mix(n.y, soilSlope, coveU('macroSlopeMix'));
  let rock: N = smoothstep(slope.sub(slopeWidth), slope.add(slopeWidth), coverageSlope).oneMinus();
  const sandLine = coveU('sandHeight').add(macro.mul(coveU('heightBlend')));
  let sand: N = smoothstep(sandLine.sub(coveU('sandBlend')), sandLine.add(coveU('sandBlend')), p.y)
    .oneMinus()
    .mul(
      smoothstep(
        coveU('sandSlopeThreshold').sub(coveU('sandSlopeBlend')),
        coveU('sandSlopeThreshold').add(coveU('sandSlopeBlend')),
        n.y,
      ),
    );
  // A walkable beach remains sand even where its bank is too sloped to grow turf.
  rock = rock.mul(sand.oneMinus());
  let grass: N = rock.oneMinus().sub(sand).max(0);
  // Broad slope coverage must not grow turf on the wet shoreline's steep foot.
  const dryTurf = smoothstep(0, coveU('grassMinHeight'), p.y);
  grass = grass.mul(dryTurf);
  rock = grass.add(sand).oneMinus().max(0);
  // The broad field selects the border; actual normals only enforce walkability. Repeating the full
  // rock/turf threshold here stamped the lighting mesh's coarse facets back into the smoothed coverage.
  const turfSlope = smoothstep(WALKABLE_NY, float(WALKABLE_NY).add(max(0.01, slopeWidth)), n.y);
  rock = rock.add(grass.mul(turfSlope.oneMinus()));
  grass = grass.mul(turfSlope);
  const path: N = attribute('covePath', 'float').clamp();
  // Microheight only contests existing coverage; zero-coverage layers never win. Keep this graph branch-free:
  // scalar TSL select emits an if, which can pull lazy texture samples into nonuniform control flow.
  const influence = coveU('heightBlend');
  const rh = rock.add(rockHeight.mul(influence)),
    gh = grass.add(detail.g.mul(influence)),
    sh = sand.add(detail.a.mul(influence));
  const highest = max(max(mix(-10, rh, sign(rock)), mix(-10, gh, sign(grass))), mix(-10, sh, sign(sand)));
  const blend = coveU('layerBlend');
  const rw = rock.mul(rh.sub(highest).add(blend).max(0));
  const gw = grass.mul(gh.sub(highest).add(blend).max(0));
  const sw = sand.mul(sh.sub(highest).add(blend).max(0));
  // Coverage sums to one and the winning present layer keeps positive blend weight.
  const total = rw.add(gw).add(sw).max(0.0001);
  rock = rw.div(total);
  grass = gw.div(total);
  sand = sw.div(total);
  // Coverage stays distinct from pigment: a soft, short transition keeps the soil border natural.
  const grassEdge = grass.add(detail.g.sub(0.5).mul(coveU('grassEdgeBreakup')));
  const cleanGrass = smoothstep(
    float(0.5).sub(coveU('grassEdgeWidth')),
    float(0.5).add(coveU('grassEdgeWidth')),
    grassEdge,
  );
  const exposed = rock.add(sand).max(0.0001);
  rock = rock.div(exposed).mul(cleanGrass.oneMinus());
  sand = sand.div(exposed).mul(cleanGrass.oneMinus());
  grass = cleanGrass;
  // The rock every cliff shares, the cliff kit's included; the cove keeps its own sand, turf and wet.
  const rockCol = beddedRock(p);
  const grassCol = pigment('grass').mul(turfPaint.sub(0.8).mul(coveU('grassDetailStrength')).add(1));
  const sandCol = pigment('sand').mul(macro.mul(coveU('detailStrength')).add(1));
  const edgeStart = float(0.5).sub(coveU('grassEdgeWidth'));
  const lip = smoothstep(edgeStart.sub(coveU('lipWidth')), edgeStart, grassEdge).mul(grass.oneMinus());
  const dry = rockCol
    .mul(rock)
    .add(grassCol.mul(grass))
    .add(sandCol.mul(sand))
    .mul(lip.mul(coveU('lipShade')).oneMinus());
  const result = mix(dry, pigment('path'), path);
  patchNode(material, 'colorNode', (previous) => mix(previous ?? result, result, region));
  // A whole-cove material (region 1) takes the cove's roughness outright: off the tuning route all three would be
  // literals, and Firefox's WGSL compiler rejects `mix` of literals only (src/render/reference/tsl.md).
  patchNode(material, 'roughnessNode', (previous) =>
    region === 1 ? coveU('roughness') : mix(previous ?? float(material.roughness), coveU('roughness'), region),
  );
  const smooth = mix(normalFlat, normalViewGeometry, coveU('normalSmoothing')).normalize();
  const relief: N = bumpMap(detail.g.mul(grass).add(rockHeight.mul(rock)), coveU('detailStrength'));
  patchNode(material, 'normalNode', (previous) =>
    mix(previous ?? normalViewGeometry, mix(smooth, relief, coveU('detailStrength')).normalize(), region).normalize(),
  );
  registerCoveSand(material, sand.mul(path.oneMinus()).mul(region));
}
