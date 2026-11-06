// One island-space layer vocabulary for heightfield and sculpted kit. Local live numeric controls.
import * as THREE from 'three/webgpu';
import {
  abs,
  attribute,
  float,
  floor,
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
const pigment = (family: 'rock' | 'strata' | 'sediment' | 'rust' | 'grass' | 'sand' | 'path') =>
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
  const coverageSlope = kit ? n.y : mix(n.y, attribute('coveSlope', 'float'), coveU('macroSlopeMix'));
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
  rock = rock.add(grass.mul(dryTurf.oneMinus()));
  grass = grass.mul(dryTurf);
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
  // Coverage stays distinct from pigment: a narrow turf edge replaces the metre-wide green smear.
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
  // Slowly varying deposition rate gives unequal bed heights. Its derivative remains positive,
  // so irregularity cannot fold sediment layers back through themselves.
  const height = p.y.add(
    sin(p.x.mul(coveU('bandWarpScale')))
      .add(sin(p.z.mul(coveU('bandWarpScale')).mul(0.71).add(1.3)))
      .mul(coveU('bandWarp')),
  );
  const deposition = height.div(coveU('bandScale'));
  const layers = deposition
    .add(
      sin(deposition.mul(0.77))
        .mul(0.55)
        .add(sin(deposition.mul(1.7).add(0.9)).mul(0.15))
        .mul(coveU('bandIrregularity')),
    )
    .add(rockHeight.sub(0.5).mul(coveU('bandErosion')));
  const bed = floor(layers),
    phase = fract(layers);
  const randomBed = (index: N) => fract(sin(index.mul(7.13).add(2.39)).mul(43758.5453));
  const bedPigment = (index: N) => {
    const tone = floor(randomBed(index).mul(coveU('bandColourCount')));
    return tone
      .greaterThan(2.5)
      .select(
        pigment('rust'),
        tone
          .greaterThan(1.5)
          .select(pigment('sediment'), tone.greaterThan(0.5).select(pigment('strata'), pigment('rock'))),
      );
  };
  const sediment = mix(bedPigment(bed.sub(1)), bedPigment(bed), smoothstep(0, coveU('bandSoftness'), phase));
  const accentAt = randomBed(bed.add(11)).mul(0.3).add(0.55);
  const accent = smoothstep(accentAt, accentAt.add(coveU('bandAccentWidth')), phase)
    .mul(
      smoothstep(
        accentAt.add(coveU('bandAccentWidth')),
        accentAt.add(coveU('bandAccentWidth').mul(2)),
        phase,
      ).oneMinus(),
    )
    .mul(randomBed(bed.add(3)).greaterThan(0.55).select(1, 0));
  const banded = mix(sediment, pigment('rock').mul(0.7), accent.mul(coveU('bandAccentStrength')));
  // Bedding is visible only on exposed steep faces; rounded caps/shoulders keep quiet pigment.
  const steep = smoothstep(
    coveU('bandSlopeThreshold').sub(coveU('bandSlopeBlend')),
    coveU('bandSlopeThreshold').add(coveU('bandSlopeBlend')),
    n.y,
  ).oneMinus();
  const rockCol = mix(pigment('rock'), banded, steep.mul(coveU('strataStrength'))).mul(
    mix(vec3(1), rockPaint, coveU('pigmentStrength')),
  );
  const grassCol = pigment('grass').mul(turfPaint.sub(0.8).mul(coveU('grassDetailStrength')).add(1));
  const sandCol = pigment('sand').mul(macro.mul(coveU('detailStrength')).add(1));
  const lipWidth = max(coveU('lipWidth'), coveU('grassEdgeWidth').add(0.001));
  const lip = smoothstep(float(0.5).sub(lipWidth), float(0.5).sub(coveU('grassEdgeWidth')), grassEdge).mul(
    grass.oneMinus(),
  );
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
  if (!COVE_DRY) registerCoveSand(material, sand.mul(path.oneMinus()).mul(region), region);
}
