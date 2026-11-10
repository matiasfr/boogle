// The camera below the water: one flat fog in the existing output quad, and nothing else (owner, 10 November 2026:
// underwater is not a view worth paying for; players only go under for a second on a high-fall plunge). The CPU water
// field says whether the camera is under; dry frames cost one uniform branch beyond the scene texture read.
import { camera, scenePass } from '../scene.ts';
import { waterField } from '../../physics/water-field.ts';
import { TSL, type N } from './tsl.ts';
import { LOOK } from './tuning.ts';
import { vector } from './live.ts';

const { Fn, If, exp, length, select, uniform, uv, vec3, vec4 } = TSL;
const SCATTERING = 0.03; // per metre, on top of the absorption

/** `seaColor` is the deep sea's lit colour as the surface draws it; a cave pond fogs to near black. */
export function createUnderwater(seaColor: N) {
  const absorption = vector('water.absorption', LOOK, 'absorption');
  const under = uniform(0); // 0 dry, 1 sea, 2 pond
  const invProj = uniform(camera.projectionMatrixInverse);
  const color: N = scenePass.getTextureNode();
  const depth: N = scenePass.getTextureNode('depth');
  const outputNode = Fn(() => {
    const at = uv();
    const col = color.sample(at).level(0).rgb.toVar();
    If(under.greaterThan(0), () => {
      // WebGPU NDC depth is 0..1, y is up.
      const z = depth.sample(at).level(0).r;
      const v = invProj.mul(vec4(at.x.mul(2).sub(1), at.y.mul(-2).add(1), z, 1));
      const dist = select(z.greaterThan(0.999999), 1e5, length(v.xyz.div(v.w)));
      const trans = exp(absorption.add(SCATTERING).mul(dist).negate());
      const fog = select(under.equal(1), seaColor, vec3(0.002, 0.004, 0.006));
      col.assign(col.mul(trans).add(fog.mul(trans.oneMinus())));
    });
    return vec4(col, 1);
  })();
  return {
    outputNode,
    update() {
      const p = camera.position;
      const s = waterField.nearby(p);
      const volume = waterField.pond(s.bodyId) ?? waterField.opticalPondAt(p, Math.max(0.5, camera.near * 3));
      const pond = !!volume?.ellipse;
      const level = pond ? volume!.level : s.height;
      under.value = (s.body === 'sea' || pond) && Number.isFinite(level) && p.y < level ? (pond ? 2 : 1) : 0;
    },
    inspect: () => ({ body: ['dry', 'sea', 'pond'][under.value] }),
  };
}
