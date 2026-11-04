// Ultra Water's familiar controls over the real sea. Values belong to their renderer bindings, not this UI.
import { Color } from 'three/webgpu';
import { defineKind, spawn, despawn } from '../entity/entity.ts';
import { releaseInput } from '../player/input.ts';
import { cancelCharge } from '../player/throw.ts';
import { releaseJump } from '../entities/player/state.ts';
import { waterReady } from '../render/water-render.ts';
import { newWaterEnabled } from '../render/water/flags.ts';
import { bindings, type Value } from '../render/water/live.ts';

type Spec = { key: string; label: string; min: number; max: number; step: number; color?: boolean };
type Group = { name: string; note?: string; specs: Spec[] };
const spec = (key: string, label: string, min: number, max: number, step = 0.01): Spec => ({
  key,
  label,
  min,
  max,
  step,
});
const color = (key: string, label: string): Spec => ({ ...spec(key, label, 0, 1), color: true });
const groups: Group[] = [
  {
    name: 'Waves',
    note: 'Spectrum controls rebake the existing FFT seed after editing; no reload. waveScale is energy, so height follows its square root.',
    specs: [
      spec('wave.windSpeed', 'windSpeed', 1, 25, 0.1),
      spec('wave.windDirection', 'windDirection', -180, 180, 1),
      spec('wave.fetchKm', 'fetchKm', 5, 1000, 1),
      spec('wave.waveScale', 'waveScale', 0, 3),
      spec('wave.spreadBlend', 'spreadBlend', 0, 1),
      spec('wave.swellScale', 'swellScale', 0, 3),
      spec('wave.swellDirection', 'swellDirection', -180, 180, 1),
      spec('wave.choppiness', 'choppiness', 0, 2),
      spec('wave.timeScale', 'timeScale', 0, 3),
      ...[600, 85, 12, 2.1].map((length, i) => spec(`wave.cascade${i}`, `cascade ${i + 1} · ${length} m`, 0, 3)),
    ],
  },
  {
    name: 'Shore waves',
    specs: [
      spec('shore.amplitude', 'amplitude', 0, 1.5),
      spec('shore.wavelength', 'wavelength', 8, 60, 0.5),
      spec('shore.speed', 'speed', 0.3, 2),
      spec('shore.steepness', 'steepness', 0, 1.5),
      spec('shore.spray', 'spray', 0, 3),
      spec('shore.spraySize', 'spray size', 0.2, 3),
      spec('shore.swellFull', 'swell full depth', 3, 60, 0.5),
      spec('shore.chopShallow', 'shallow choppiness', 0, 1),
    ],
  },
  {
    name: 'Water',
    note: 'Colour inputs display sRGB; copied RGB arrays and absorption coefficients are linear. Absorption is per metre.',
    specs: [
      color('water.scatter', 'scatter'),
      spec('water.absorption', 'absorption RGB', 0.001, 3, 0.001),
      spec('water.roughness', 'roughness', 0.005, 0.2, 0.001),
      spec('water.refraction', 'refraction', 0, 0.2, 0.001),
      spec('water.sssPeak', 'sssPeak', 0, 6),
      spec('water.sssView', 'sssView', 0, 0.5, 0.001),
      spec('water.sssShadow', 'sss shadow', 0, 1, 0.001),
      spec('water.foamBias', 'foamBias', -0.5, 1.5),
      spec('water.foamScale', 'foamScale', 0, 6),
      spec('water.foamRecovery', 'foamRecovery', 0.05, 3),
      spec('water.shoreFoamBand', 'shoreFoamBand', 0.001, 2, 0.001),
      color('water.foamTint', 'foam tint'),
      spec('water.foamBright', 'foam brightness', 0, 2),
      spec('water.caustics', 'caustics', 0, 2),
      spec('water.glitter', 'glitter', 0, 1),
      spec('water.reflectGain', 'reflection gain', 0, 2),
      spec('water.reflectCap', 'reflection cap', 0, 1),
      color('water.reflectTint', 'reflection tint'),
      spec('water.saturation', 'water saturation', 0, 2),
      spec('water.sunGain', 'sun gain', 0, 3),
    ],
  },
  {
    name: 'Floaters & underwater',
    specs: [
      spec('underwater.scattering', 'scattering', 0, 0.5, 0.001),
      spec('underwater.shafts', 'shafts', 0, 4),
      spec('underwater.shaftRange', 'shaftRange', 5, 120, 1),
      spec('underwater.meniscus', 'meniscus', 0, 1),
      spec('underwater.drySeconds', 'lens drying seconds', 0.5, 20, 0.1),
      spec('underwater.exposure', 'underwater exposure', 0.2, 2),
    ],
  },
  {
    name: 'Sun & sky',
    note: 'Changing these rebakes the sky cube and matching lighting after editing. This can briefly stall; it is not a day/night cycle.',
    specs: [
      spec('sky.time', 'time of day', 0, 1, 0.001),
      spec('sky.elevation', 'elevation', -90, 90, 0.1),
      spec('sky.azimuth', 'azimuth', -180, 360, 0.5),
      spec('sky.sunIntensity', 'sunIntensity', 0, 20, 0.1),
      spec('sky.cloudCoverage', 'cloudCoverage', 0, 1),
      spec('sky.turbidity', 'turbidity', 1, 10, 0.1),
    ],
  },
  {
    name: 'Post',
    note: 'AgX is the production tone curve. Exposure compensation is applied before it.',
    specs: [
      spec('post.exposure', 'exposure comp', 0.25, 4),
      spec('post.autoExposure', 'autoExposure', 0, 1, 1),
      spec('post.keyValue', 'keyValue', 0.05, 0.6),
      spec('post.contrast', 'contrast', 0.7, 1.6),
      spec('post.saturation', 'saturation', 0, 2),
    ],
  },
  { name: 'Quality', specs: [spec('quality.resolution', 'resolution', 0.25, 1, 0.05)] },
];
const STORAGE = 'boogle.water-tuning.v1';
const clone = (v: Value): Value => (Array.isArray(v) ? [...v] : v);
const same = (a: Value, b: Value) => JSON.stringify(a) === JSON.stringify(b);
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
};
defineKind('water-tuning', {});

let closeCurrent: (() => void) | null = null;
let visit = 0;
const productionDefaults = new Map<string, Value>();
export async function showWaterTuning(restorePointer: () => void, parent: HTMLElement = document.body) {
  const token = ++visit;
  closeCurrent?.();
  await waterReady;
  if (token !== visit) {
    restorePointer();
    return () => {};
  }
  const panel = node('section');
  panel.dataset.waterPanel = '';
  panel.setAttribute('aria-label', 'Water tuning');
  const style = node(
    'style',
    `
    [data-water-panel] { position:fixed; z-index:110; top:12px; right:12px; width:300px; max-width:calc(100vw - 24px);
      max-height:calc(100dvh - 24px); overflow:auto; padding:12px; border:1px solid #ffffff40; border-radius:14px;
      background:#17252af0; color:#edf3e8; box-shadow:0 6px 24px #0006; font:12px/1.4 system-ui,sans-serif;
      pointer-events:auto; overscroll-behavior:contain; text-align:left; box-sizing:border-box; }
    [data-water-panel] * { box-sizing:border-box; }
    [data-water-panel] h2 { margin:0; font-size:16px; }
    [data-water-panel] p { margin:7px 0; color:#c7d5d0; }
    [data-water-panel] button { min-height:44px; cursor:pointer; color:inherit; background:#ffffff13; border:1px solid #ffffff35;
      border-radius:7px; padding:5px 8px; font:inherit; }
    [data-water-panel] button:hover { background:#ffffff28; }
    [data-water-panel] button:focus-visible, [data-water-panel] input:focus-visible,
    [data-water-panel] textarea:focus-visible, [data-water-panel] summary:focus-visible { outline:2px solid #b7e4c7; outline-offset:2px; }
    [data-water-panel] details { margin-top:7px; border-top:1px solid #ffffff25; padding-top:7px; }
    [data-water-panel] summary { min-height:44px; cursor:pointer; font-weight:700; padding:3px 0; }
    [data-water-panel] input { min-height:44px; }
    [data-water-panel] .water-row { display:grid; grid-template-columns:1fr 70px; align-items:center; gap:5px; margin:7px 0; }
    [data-water-panel] .water-row input[type=range] { grid-column:1 / -1; width:100%; margin:0; accent-color:#b7e4c7; }
    [data-water-panel] input[type=number], [data-water-panel] textarea { width:100%; min-width:0; border:1px solid #ffffff35;
      color:inherit; background:#0c181d; border-radius:5px; padding:4px; font:inherit; }
    [data-water-panel] input[type=color] { width:70px; height:26px; border:0; padding:0; background:none; }
    [data-water-panel] textarea { min-height:90px; resize:vertical; font:11px/1.4 ui-monospace,monospace; }
    [data-water-panel] .water-actions { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
    [data-water-panel] [role=status] { min-height:1.4em; color:#d5edbc; overflow-wrap:anywhere; }
  `,
  );
  document.head.append(style);
  parent.append(panel);
  let removeStatusListener = () => {};
  let restoreOverrides = () => {};
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    panel.remove();
    style.remove();
    removeStatusListener();
    restoreOverrides();
    restorePointer();
    if (closeCurrent === close) closeCurrent = null;
  };
  const entity = spawn({
    kind: 'water-tuning',
    dispose: cleanup,
  });
  const close = () => {
    cleanup();
    despawn(entity);
  };
  closeCurrent = close;
  const release = () => {
    releaseInput();
    releaseJump();
    cancelCharge();
  };
  panel.addEventListener('focusin', release);
  panel.addEventListener('pointerdown', release);
  for (const event of [
    'keydown',
    'keyup',
    'keypress',
    'pointerdown',
    'pointerup',
    'pointermove',
    'pointercancel',
    'mousedown',
    'mouseup',
    'mousemove',
    'click',
    'dblclick',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
  ])
    panel.addEventListener(event, (e) => e.stopPropagation());
  panel.append(node('h2', 'Water tuning'));
  const closeButton = node('button', 'Close water tuning');
  closeButton.type = 'button';
  closeButton.addEventListener('click', close);
  panel.append(closeButton);
  panel.append(node('p', 'Only your view. The game keeps running. Saved settings apply only with tune=1.'));
  panel.append(
    node(
      'p',
      parent === document.body
        ? 'Drag the scene to look; the cursor stays free while tuning.'
        : 'Close the menu to look around; reopen Water to continue tuning.',
    ),
  );
  if (!newWaterEnabled) {
    panel.append(
      node(
        'p',
        'This panel tunes the production sea. Add water=new to this URL; the separate proto=water demo owns its own controls.',
      ),
    );
    const link = node('a', 'Open production water');
    const url = new URL(location.href);
    url.searchParams.set('water', 'new');
    if (url.searchParams.get('proto') === 'water') url.searchParams.set('proto', 'place');
    link.href = url.href;
    panel.append(link);
    return close;
  }
  const available = groups.flatMap((g) => g.specs).filter((s) => bindings.has(s.key));
  const byKey = new Map(available.map((s) => [s.key, s]));
  const previous = new Map(available.map((s) => [s.key, clone(bindings.get(s.key)!.get())]));
  for (const [key, value] of previous) if (!productionDefaults.has(key)) productionDefaults.set(key, clone(value));
  const defaults = new Map(available.map((s) => [s.key, clone(productionDefaults.get(s.key)!)]));
  if (parent !== document.body)
    restoreOverrides = () => {
      for (const [key, value] of previous) bindings.get(key)?.set(clone(value));
    };
  const refreshers: (() => void)[] = [];
  const status = node('p');
  status.setAttribute('role', 'status');
  const say = (message: string) => {
    status.textContent = message;
  };
  const onStatus = (event: Event) => say((event as CustomEvent<string>).detail);
  window.addEventListener('water-tuning-status', onStatus);
  removeStatusListener = () => window.removeEventListener('water-tuning-status', onStatus);
  const json = node('textarea');
  json.setAttribute('aria-label', 'Water settings JSON');
  json.dataset.waterJson = '';
  json.spellcheck = false;
  const snapshot = () => {
    const changes: Record<string, Value> = {};
    for (const [key, initial] of defaults) {
      const value = bindings.get(key)!.get();
      if (!same(value, initial)) changes[key] = clone(value);
    }
    return { version: 1, changes };
  };
  const persist = () => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(snapshot()));
    } catch {
      say('Settings apply, but browser storage is unavailable. Copy them before leaving.');
    }
  };
  const refresh = () => {
    for (const f of refreshers) f();
  };
  const set = (s: Spec, value: Value) => {
    bindings.get(s.key)!.set(value);
    refresh();
    persist();
  };
  const button = (label: string, action: () => void, key?: string) => {
    const b = node('button', label);
    b.type = 'button';
    if (key) b.dataset.waterAction = key;
    b.addEventListener('click', action);
    return b;
  };
  const reset = (specs: Spec[]) => {
    for (const s of specs) {
      const initial = defaults.get(s.key);
      if (initial !== undefined) bindings.get(s.key)!.set(clone(initial));
    }
    refresh();
    persist();
    say('Defaults restored.');
  };
  const actions = node('div');
  actions.className = 'water-actions';
  actions.append(button('Reset all', () => reset(available), 'reset'));
  panel.append(actions, status);
  for (const group of groups) {
    const specs = group.specs.filter((s) => bindings.has(s.key));
    if (!specs.length) continue;
    const details = node('details');
    details.dataset.waterSection = group.name;
    details.open = group.name === 'Waves';
    details.append(node('summary', group.name));
    if (group.note) details.append(node('p', group.note));
    const groupReset = button('Reset group', () => reset(specs));
    groupReset.dataset.waterGroup = group.name;
    details.append(groupReset);
    for (const s of specs) {
      const initial = defaults.get(s.key)!;
      if (s.color) {
        const row = node('label');
        row.className = 'water-row';
        row.append(node('span', s.label));
        const input = node('input');
        input.type = 'color';
        input.dataset.waterKey = s.key;
        input.setAttribute('aria-label', s.label);
        refreshers.push(() => {
          input.value = '#' + new Color().fromArray(bindings.get(s.key)!.get() as number[]).getHexString();
        });
        input.addEventListener('input', () => set(s, new Color(input.value).toArray()));
        row.append(input);
        details.append(row);
      } else {
        const components = Array.isArray(initial) ? initial.length : 1;
        for (let c = 0; c < components; c++) {
          const row = node('label');
          row.className = 'water-row';
          const label = s.label + (components > 1 ? ` ${'RGB'[c]}` : '');
          row.append(node('span', label));
          const number = node('input');
          number.type = 'number';
          number.dataset.waterKey = s.key;
          if (components > 1) number.dataset.waterComponent = String(c);
          const range = node('input');
          range.type = 'range';
          range.dataset.waterSlider = s.key;
          for (const input of [number, range]) {
            input.min = String(s.min);
            input.max = String(s.max);
            input.step = String(s.step);
            input.setAttribute('aria-label', label + (input === range ? ' slider' : ''));
            input.addEventListener('input', () => {
              const value = input.valueAsNumber;
              if (!Number.isFinite(value) || value < s.min || value > s.max) return;
              if (components === 1) set(s, value);
              else {
                const values = [...(bindings.get(s.key)!.get() as number[])];
                values[c] = value;
                set(s, values);
              }
            });
          }
          refreshers.push(() => {
            const current = bindings.get(s.key)!.get();
            const value = Array.isArray(current) ? current[c]! : current;
            number.value = String(value);
            range.value = String(value);
          });
          row.append(number, range);
          details.append(row);
        }
      }
    }
    panel.append(details);
  }
  const parse = (text: string) => {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a settings object.');
    const data = value as Record<string, unknown>;
    if (data.version !== 1 || Object.keys(data).some((key) => key !== 'version' && key !== 'changes'))
      throw new Error('Expected version 1 and changes.');
    if (!data.changes || typeof data.changes !== 'object' || Array.isArray(data.changes))
      throw new Error('Expected a changes object.');
    const changes: Record<string, Value> = {};
    for (const [key, candidate] of Object.entries(data.changes)) {
      const s = byKey.get(key),
        initial = defaults.get(key);
      if (!s || initial === undefined) throw new Error(`Unknown setting: ${key}`);
      const validNumber = (n: unknown): n is number =>
        typeof n === 'number' && Number.isFinite(n) && n >= s.min && n <= s.max;
      if (Array.isArray(initial)) {
        if (!Array.isArray(candidate) || candidate.length !== initial.length || !candidate.every(validNumber))
          throw new Error(`Invalid RGB value: ${key}`);
        changes[key] = [...candidate] as number[];
      } else {
        if (!validNumber(candidate)) throw new Error(`Out of range: ${key} (${s.min}–${s.max})`);
        changes[key] = candidate;
      }
    }
    return changes;
  };
  const apply = (changes: Record<string, Value>) => {
    for (const [key, initial] of defaults) bindings.get(key)!.set(clone(changes[key] ?? initial));
    refresh();
    persist();
  };
  const transfer = node('details');
  transfer.append(node('summary', 'Copy / paste settings'));
  transfer.append(
    node(
      'p',
      'One JSON block containing only changes from production defaults. Paste replaces your current overrides.',
    ),
  );
  const transferActions = node('div');
  transferActions.className = 'water-actions';
  transferActions.append(
    button(
      'Copy settings',
      () => {
        json.value = JSON.stringify(snapshot(), null, 2);
        transfer.open = true;
        json.focus();
        json.select();
        void navigator.clipboard?.writeText(json.value).then(
          () => say('Settings copied.'),
          () => say('Select and copy the JSON below; clipboard permission was unavailable.'),
        );
        if (!navigator.clipboard) say('Select and copy the JSON below.');
      },
      'copy',
    ),
  );
  transferActions.append(
    button(
      'Apply settings',
      () => {
        try {
          apply(parse(json.value));
          say('Pasted settings applied.');
        } catch (e) {
          say(e instanceof Error ? e.message : 'Invalid settings.');
        }
      },
      'paste',
    ),
  );
  transfer.append(transferActions, json);
  panel.append(transfer);
  const limits = node('details');
  limits.append(node('summary', 'Unavailable demo controls'));
  limits.append(
    node(
      'p',
      'Camera presets and benchmark belong to the demo. Floater spawn, drop, clear, drag, angularDrag and buoyancy are not local water looks; Boogle owns its gameplay bodies.',
    ),
  );
  limits.append(
    node(
      'p',
      'Planar reflections, reflectionScale and reflectionDistort have no production reflection target. Reflection gain/cap/tint adjust the existing sky reflections. Bloom strength/threshold require a new post pass.',
    ),
  );
  limits.append(
    node(
      'p',
      'FFT size and cascade topology, polar mesh resolution, foam/shore bake dimensions, underwater shaft steps and snow count require rebuilding resources and are not live controls. MSAA and auto resolution belong to the shared renderer; resolution here scales its scene pass only.',
    ),
  );
  limits.append(
    node(
      'p',
      'Colour presets and clarity are represented by editable linear scatter, absorption and foam tint. AgX remains the shared production curve. Distance fog follows the place/cave route and is not a water setting.',
    ),
  );
  const unavailable = groups.flatMap((group) => group.specs).filter((s) => !bindings.has(s.key));
  if (unavailable.length)
    limits.append(node('p', `No live production binding: ${unavailable.map((s) => s.label).join(', ')}.`));
  panel.append(limits);
  refresh();
  try {
    const saved = localStorage.getItem(STORAGE);
    if (saved) {
      apply(parse(saved));
      say('Saved viewer settings restored.');
    }
  } catch (e) {
    say(`Saved settings not applied: ${e instanceof Error ? e.message : 'storage unavailable'}`);
  }
  return close;
}
