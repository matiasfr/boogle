// Local, opt-in comparison; importing the lazy Dev panel does not alter any material.
import { Mesh, type Material } from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { entityKinds } from '../../entity/entity.ts';
import { devEnabled } from '../../dev-preferences.ts';
import { bind } from '../../render/water/live.ts';
import { registerGraphics } from '../../graphics-settings.ts';
import { rampMaterial, type Ramp } from '../diffuse-ramp.ts';

let mode: Ramp = 'soft';
let enabled = false;
const originals = new Map<Mesh, Material>();
const variants = new WeakMap<Material, Partial<Record<Ramp, Material>>>();
const watched = new WeakSet<Material>();
function remember(mesh: Mesh, material: Material) {
  if (originals.has(mesh)) return;
  originals.set(mesh, material);
  if (watched.has(material)) return;
  watched.add(material);
  material.addEventListener('dispose', () => {
    for (const variant of Object.values(variants.get(material) ?? {})) variant.dispose();
    variants.delete(material);
    for (const [object, original] of originals) if (original === material) originals.delete(object);
  });
}
function apply() {
  if (!devEnabled) throw new Error('Buddy ramp requires Dev');
  // Buddy owns these clones already (rig.ts). Eyes, hat and accessories have other material names.
  scene.traverse((object) => {
    if (object instanceof Mesh && !Array.isArray(object.material) && object.material.name === 'M_Main')
      remember(object, object.material);
  });
  // The existing entity inspection seam identifies the carried log mesh, never ground piles or rack stock.
  const logs = entityKinds().find((kind) => kind.kind === 'haul-stack')?.entities[0]?.mesh?.children[0];
  if (logs instanceof Mesh && !Array.isArray(logs.material)) remember(logs, logs.material);
  for (const [mesh, original] of originals) {
    if (!enabled) {
      mesh.material = original;
      continue;
    }
    let pair = variants.get(original);
    if (!pair) {
      pair = {};
      variants.set(original, pair);
    }
    mesh.material = pair[mode] ??= rampMaterial(original, mode);
  }
}
export function setRamp(value: number) {
  if (![0, 1, 2].includes(value)) throw new Error('Ramp is 0 Current, 1 soft, 2 two-band');
  enabled = value !== 0;
  if (value) mode = value === 1 ? 'soft' : 'strong';
  apply();
}
export const getRamp = () => (enabled ? (mode === 'soft' ? 1 : 2) : 0);
bind('buddy.ramp', getRamp, (value) => setRamp(Number(value)));
registerGraphics({
  id: 'buddy-ramp',
  label: 'Buddy diffuse ramp',
  choices: [false, true],
  default: false,
  scope: 'Local',
  audience: 'dev',
  applyMode: 'rebuild',
  cost: 'Direct diffuse only on Buddy and carried logs; no new draws or buffers.',
  skips: 'Current restores the original material objects and lighting graph.',
  hitch: 'First enable compiles the selected ramp. Warm before measuring.',
  read: () => enabled,
  apply(value) {
    enabled = value === true;
    apply();
  },
});
registerGraphics({
  id: 'buddy-ramp-mode',
  label: 'Buddy ramp shape',
  choices: ['soft', 'strong'],
  default: 'soft',
  scope: 'Local',
  audience: 'dev',
  applyMode: 'rebuild',
  cost: 'Soft shoulder or unmistakable two-band direct diffuse.',
  skips: 'Only used when Buddy diffuse ramp is on.',
  read: () => mode,
  apply(value) {
    mode = value as Ramp;
    apply();
  },
});
