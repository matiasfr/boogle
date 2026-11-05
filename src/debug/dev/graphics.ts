// Local Dev surface only. Owners register their work; this panel never imports an absent effect.
import './buddy-ramp.ts';
import { graphicsSnapshot, setGraphics, resetGraphics, type GraphicsValue } from '../../graphics-settings.ts';
import { camera, renderer } from '../../render/scene.ts';
import { graphicsMeasuring, measureGraphics } from './performance.ts';
import { button, copy, el, note } from './ui.ts';
import { no, ok, type Tool, type Args } from './types.ts';

const expected = [
  ['shadows', 'Shadows'],
  ['msaa', 'MSAA'],
  ['caustics', 'Caustics'],
  ['spray', 'Spray'],
  ['snow', 'Snow'],
  ['shafts', 'Shafts'],
  ['lens', 'Wet lens'],
  ['bloom', 'Bloom'],
  ['meter', 'Exposure meter'],
  ['lights', 'Point lights'],
  ['foliage', 'Lab grass'],
  ['lab-effects', 'Lab post effects'],
] as const;
let measurement: Awaited<ReturnType<typeof measureGraphics>> | null = null;
const views = new Set<() => void>();
const refresh = () => {
  for (const fn of views) fn();
};
function snapshot() {
  const settings = graphicsSnapshot();
  return {
    scope: 'Local',
    settings,
    unavailable: expected
      .filter(([id]) => !settings.some((s) => s.id === id))
      .map(([id, label]) => ({ id, label, reason: 'This owner is absent on the current route.' })),
    route: {
      pathname: location.pathname,
      query: Object.fromEntries(new URLSearchParams(location.search)),
      hash: location.hash,
    },
    camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov },
    pixels: { width: renderer.domElement.width, height: renderer.domElement.height, ratio: renderer.getPixelRatio() },
    measurement,
  };
}
export const tool: Tool = {
  id: 'graphics',
  label: 'Graphics cost switches',
  scope: 'Local cosmetic work only. Closing the panel keeps choices; Restore baseline removes Dev overrides.',
  commands: ['read', 'set', 'reset', 'measure', 'copy', 'reload-prof', 'reload'],
  available: () => null,
  snapshot,
  async run(command, args: Args) {
    if (graphicsMeasuring() && !['read', 'copy'].includes(command))
      return no('Wait for the matched measurement to finish.');
    try {
      if (command === 'set') {
        if (typeof args.id !== 'string' || !['string', 'boolean', 'number'].includes(typeof args.value))
          return no('Choose a setting and a bounded value.');
        await setGraphics(args.id, args.value as GraphicsValue);
      } else if (command === 'reset') await resetGraphics();
      else if (command === 'measure') {
        if (typeof args.id !== 'string') return no('Choose an available on/off switch.');
        const pending = measureGraphics(args.id, {
          seconds: args.seconds === undefined ? undefined : Number(args.seconds),
          warmSeconds: args.warmSeconds === undefined ? undefined : Number(args.warmSeconds),
          contention: typeof args.contention === 'string' ? args.contention : 'unknown',
        });
        refresh();
        measurement = await pending;
        const data = snapshot();
        const copied = await copy(JSON.stringify(data, null, 2));
        return ok(
          `${measurement.status}. ${copied ? 'Snapshot copied.' : 'Clipboard unavailable; select the snapshot below.'}`,
          data,
        );
      } else if (command === 'copy') {
        const data = snapshot();
        const copied = await copy(JSON.stringify(data, null, 2));
        return ok(copied ? 'Graphics snapshot copied.' : 'Clipboard unavailable; select the snapshot below.', data);
      } else if (command === 'reload-prof' || command === 'reload') {
        const url = new URL(location.href);
        if (command === 'reload-prof') url.searchParams.set('prof', '1');
        location.assign(url.href);
        return ok('Reloading with the requested Local graphics choices.');
      }
      return ok(
        command === 'reset' ? 'Baseline restored; inspect any pending reload.' : 'Current graphics settings.',
        snapshot(),
      );
    } finally {
      refresh();
    }
  },
  mount(parent, ctx) {
    note(
      parent,
      'These switches skip the named work. No geometry, wave or water-query experiments. Rebuilds may hitch; reload values stay pending until loaded.',
    );
    const status = el('p', '', 'dev-status');
    status.setAttribute('role', 'status');
    const controls = el('div');
    const list = el('div');
    const pick = el('select');
    pick.setAttribute('aria-label', 'Feature to measure');
    const output = el('textarea');
    output.readOnly = true;
    output.setAttribute('aria-label', 'Graphics settings and measurement snapshot');
    output.style.minHeight = '120px';
    const execute = async (command: string, args: Args = {}) => {
      const result = await ctx.run('graphics', command, args);
      status.textContent = result.message;
      if (result.data !== undefined) output.value = JSON.stringify(result.data, null, 2);
      render();
    };
    const reset = button('Restore baseline', () => execute('reset'));
    const measure = button('Measure on/off', () => execute('measure', { id: pick.value }));
    controls.append(
      reset,
      button('Copy snapshot', () => execute('copy')),
      button('Reload with profiling', () => execute('reload-prof')),
      button('Apply pending reload', () => execute('reload')),
      pick,
      measure,
    );
    const render = () => {
      const selected = pick.value;
      pick.replaceChildren();
      list.replaceChildren();
      const settings = graphicsSnapshot();
      for (const setting of settings) {
        const row = el('div', '', 'dev-command');
        const label = el('label', `${setting.label} · ${setting.applyMode}`);
        const select = el('select');
        select.setAttribute('aria-label', setting.label);
        setting.choices.forEach((value, index) => {
          const option = el('option', value === true ? 'On' : value === false ? 'Off' : String(value));
          option.value = String(index);
          option.selected = value === setting.requested;
          select.append(option);
        });
        select.disabled = !setting.available || graphicsMeasuring();
        select.onchange = () => void execute('set', { id: setting.id, value: setting.choices[Number(select.value)] });
        label.append(select);
        row.append(label);
        note(
          row,
          setting.available
            ? `${setting.cost}${setting.pending ? ` · pending (effective ${String(setting.effective)})` : ''}`
            : (setting.reason ?? 'Unavailable'),
        );
        const detail = el('details');
        detail.append(el('summary', 'Work removed / switch cost'));
        note(detail, setting.skips);
        if (setting.hitch) note(detail, `Can hitch: ${setting.hitch}`);
        if (setting.error) note(detail, setting.error);
        row.append(detail);
        list.append(row);
        if (
          setting.available &&
          setting.choices.includes(true) &&
          setting.choices.includes(false) &&
          setting.applyMode !== 'reload'
        ) {
          const option = el('option', setting.label);
          option.value = setting.id;
          pick.append(option);
        }
      }
      for (const item of snapshot().unavailable) note(list, `${item.label} · unavailable: ${item.reason}`);
      if ([...pick.options].some((option) => option.value === selected)) pick.value = selected;
      for (const control of controls.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button,select'))
        control.disabled = graphicsMeasuring();
      measure.disabled ||= !pick.options.length;
      if (graphicsMeasuring())
        status.textContent = 'Measuring warmed on/off/off/on samples; keep the camera and scene still.';
    };
    views.add(render);
    parent.append(controls, status, list, output);
    render();
    return () => views.delete(render);
  },
};
