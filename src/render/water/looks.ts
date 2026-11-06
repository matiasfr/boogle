// Local opt-in comparison. Loaded before the first warm draw, never by ordinary visits.
import { NeutralToneMapping } from 'three/webgpu';
import { toneMapping } from 'three/tsl';
import { BUILD } from '../../build-id.ts';
import { agx, TSL, type N } from '../tone.ts';
import { bindings, bindingDefaults, tuningEnabled, type Value } from './live.ts';
import { toySkyEnabled } from './flags.ts';
import { graphicsOverrides } from '../../graphics-settings.ts';
import { exposureSettings } from '../exposure.ts';

const LOOK_STORAGE = 'boogle.dev.looks.v1';
export const LOOKS = {
  current: { label: 'Current', curve: 'neutral', trim: 1, lift: 0, power: 1.12, saturation: 1.3 },
  clean: { label: 'Clean toys', curve: 'neutral', trim: 1 / 0.771116, lift: 0, power: 1.12, saturation: 1.3 },
  sunny: { label: 'Sunny toys', curve: 'agx', trim: 1, lift: 0.08, power: 1.12, saturation: 1.3 },
  punchy: { label: 'AgX Punchy', curve: 'agx', trim: 1, lift: 0, power: 1.35, saturation: 1.4 },
  sunshine: { label: 'Sunshine water', curve: 'neutral', trim: 1 / 0.771116, lift: 0, power: 1.12, saturation: 1.3 },
} as const;
export type LookId = keyof typeof LOOKS;
export const isLook = (id: unknown): id is LookId => typeof id === 'string' && Object.hasOwn(LOOKS, id);
const clone = (value: Value): Value => (Array.isArray(value) ? [...value] : value);
const same = (a: Value, b: Value) => JSON.stringify(a) === JSON.stringify(b);
const trims = Object.fromEntries(Object.entries(LOOKS).map(([id, look]) => [id, look.trim])) as Record<LookId, number>;
const query = new URLSearchParams(location.search);
const queryLook = query.get('lookPreset');
let selected: LookId = 'current',
  a: LookId = 'current',
  b: LookId = 'sunshine',
  locked = false;
let explicit = false,
  ready = false;
const subscribers = new Set<() => void>();
if (tuningEnabled && !toySkyEnabled) {
  try {
    const saved = JSON.parse(localStorage.getItem(LOOK_STORAGE) ?? 'null');
    if (saved?.version === 1 && isLook(saved.selected)) {
      selected = saved.selected;
      a = isLook(saved.a) ? saved.a : a;
      b = isLook(saved.b) ? saved.b : b;
      locked = saved.locked === true;
      for (const id of Object.keys(LOOKS) as LookId[]) {
        const trim = saved.trims?.[id];
        if (id !== 'current' && typeof trim === 'number' && Number.isFinite(trim) && trim >= 0.25 && trim <= 4)
          trims[id] = trim;
      }
      explicit = true;
    }
  } catch {
    /* Optional local preview. */
  }
  if (isLook(queryLook)) {
    selected = queryLook;
    locked = false;
    explicit = true;
  }
}
const { uniform, vec3, vec4, dot, mix, smoothstep, clamp, If } = TSL;
let curve: N, trimNode: N, lift: N;
const expected = new Map<string, Value>();
function changed() {
  for (const fn of subscribers) fn();
}
function remember() {
  explicit = true;
  // A reproduction URL does not replace the owner's saved choice.
  if (!isLook(queryLook)) {
    try {
      localStorage.setItem(LOOK_STORAGE, JSON.stringify({ version: 1, selected, a, b, locked, trims }));
    } catch {
      /* Copy look remains available. */
    }
  }
  changed();
}
export function onLookChange(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
export const hasLookChoice = () => explicit;
export const activeLookCurve = () => LOOKS[selected].curve;
export const looksReady = () => ready;
export function disposeLooks() {
  ready = false;
  changed();
}
function settings(id: LookId) {
  const values = new Map([...bindingDefaults].map(([key, value]) => [key, clone(value)]));
  const preset = LOOKS[id];
  values.set('post.agxPower', preset.power);
  values.set('post.agxSaturation', preset.saturation);
  if (id === 'sunshine') {
    for (const [key, value] of Object.entries({
      // Inspected against warm sand under locked Current metering; use the existing optical depth law.
      'water.absorption': [0.48, 0.055, 0.032],
      'water.scatter': [0, 0.06, 0.1],
      'water.saturation': 1.1,
      'water.reflectGain': 0.9,
      'water.reflectCap': 0.8,
      'water.foamBright': 0.8,
      'water.glitter': 0.6,
      'wave.waveScale': 0.25,
    }))
      values.set(key, value);
  }
  return values;
}
function apply() {
  if (!ready) return;
  const preset = LOOKS[selected];
  curve.value = preset.curve === 'neutral' ? 1 : 0;
  trimNode.value = trims[selected];
  lift.value = preset.lift;
  expected.clear();
  const graphics = graphicsOverrides();
  for (const [key, value] of settings(selected)) {
    // Resolution is a device choice, not a look. Restore sky only if it was deliberately edited.
    if (key.startsWith('quality.')) continue;
    // Explicit cost switches survive look selection; ordinary Water tweaks still reset with the look.
    if (key === 'post.bloom' && graphics.bloom !== undefined) continue;
    const binding = bindings.get(key);
    if (binding && !same(binding.get(), value)) binding.set(clone(value));
    expected.set(key, clone(value));
  }
}
export function selectLook(id: LookId) {
  selected = id;
  apply();
  remember();
}
export function setLookSlots(nextA: LookId, nextB: LookId) {
  a = nextA;
  b = nextB;
  remember();
}
export function swapLook() {
  selectLook(selected === a ? b : a);
}
export function setLookTrim(ev: number) {
  if (selected === 'current') return;
  trims[selected] = 2 ** ev;
  if (ready) trimNode.value = trims[selected];
  remember();
}
// Retained for existing capture callers. Fixed gain has no adaptation to freeze; depth still follows the camera.
export function lockExposure(value: boolean) {
  locked = value;
  remember();
  return Promise.resolve();
}
export function lookSnapshot() {
  const values = Object.fromEntries([...bindings].map(([key, binding]) => [key, clone(binding.get())]));
  const modified =
    trims[selected] !== LOOKS[selected].trim ||
    [...expected].some(([key, value]) => {
      const binding = bindings.get(key);
      return binding && !same(binding.get(), value);
    });
  return {
    version: 1,
    build: BUILD,
    scope: 'Local preview; not the game default',
    selected,
    label: LOOKS[selected].label,
    a,
    b,
    ready,
    modified,
    sky: toySkyEnabled ? 'toy (unsupported)' : 'procedural frozen late morning',
    curve: LOOKS[selected].curve,
    midtoneChromaLift: LOOKS[selected].lift,
    exposure: {
      mode: 'fixed',
      locked,
      trim: trims[selected],
      trimEV: Math.log2(trims[selected]),
      meterGain: null,
      surfaceGain: exposureSettings.centre,
      surfaceEV: Math.log2(exposureSettings.centre),
      underwaterEV: exposureSettings.underwaterEV,
      submergedGain: exposureSettings.centre * 2 ** exposureSettings.underwaterEV,
      meaning:
        'Fixed lighting gain; no meter. Underwater adds EV smoothly over signed depth 0–1.5 m. Lock is a capture compatibility marker only. Look trim multiplies this gain.',
    },
    values,
  };
}
/** Installed once, before loading's real output warm draw. All A/B choices share the fixed lighting gain. */
export function prepareLooks(power: N, saturation: N) {
  curve = uniform(0);
  trimNode = uniform(1);
  lift = uniform(0);
  ready = true;
  apply();
  changed();
  return (hdr: N, gain: N) => {
    // Sampled inputs stay outside uniform control flow (WGSL derivative/sampling rule).
    const input = hdr.rgb.mul(gain).mul(trimNode).toVar();
    const c = vec3(0).toVar();
    If(curve.greaterThan(0.5), () => {
      c.assign(toneMapping(NeutralToneMapping, 1, vec4(input, 1)).rgb);
    }).Else(() => {
      c.assign(agx(input, power, saturation));
    });
    If(lift.greaterThan(0), () => {
      const y = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // Display-linear finishing grade: smooth midtone window protects dark shade and white glints.
      const weight = smoothstep(0.03, 0.16, y)
        .mul(smoothstep(0.55, 0.9, y).oneMinus())
        .mul(lift);
      c.assign(clamp(mix(vec3(y), c, weight.add(1)), 0, 1));
    });
    return c;
  };
}
