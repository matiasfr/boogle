import { tuningEnabled, onChange } from '../../render/water/live.ts';
import {
  LOOKS,
  isLook,
  lookSnapshot,
  looksReady,
  onLookChange,
  selectLook,
  setLookSlots,
  swapLook,
  lockExposure,
  setLookTrim,
  type LookId,
} from '../../render/water/looks.ts';
import { button, copy, el, more, note } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

const unavailable = () =>
  !tuningEnabled
    ? 'Open Place with Dev or tune=1.'
    : !looksReady()
      ? 'Looks is preparing behind loading.'
      : null;
export const tool: Tool = {
  id: 'looks',
  label: 'Looks',
  scope: 'Local appearance preview; procedural sky stays. No default changes.',
  commands: ['settings', 'select', 'slots', 'swap', 'lock', 'trim', 'copy'],
  available: unavailable,
  async run(command, args) {
    const reason = unavailable();
    if (reason) return no(reason);
    if (command === 'select') {
      if (!isLook(args.id)) return no('Choose current, clean, sunny, punchy or sunshine.');
      selectLook(args.id);
    } else if (command === 'slots') {
      if (!isLook(args.a) || !isLook(args.b)) return no('Both A and B must name a look.');
      setLookSlots(args.a, args.b);
    } else if (command === 'swap') swapLook();
    else if (command === 'lock') {
      if (typeof args.locked !== 'boolean') return no('locked must be true or false.');
      await lockExposure(args.locked);
    } else if (command === 'trim') {
      if (lookSnapshot().selected === 'current')
        return no('Current keeps the shipped exposure. Choose a candidate to trim.');
      if (typeof args.ev !== 'number' || !Number.isFinite(args.ev) || args.ev < -2 || args.ev > 2)
        return no('Exposure trim must be between -2 and +2 EV.');
      setLookTrim(args.ev);
    } else if (command === 'copy') {
      const data = lookSnapshot();
      return ok(
        (await copy(JSON.stringify(data, null, 2))) ? 'Look copied.' : 'Clipboard unavailable; select the JSON below.',
        data,
      );
    } else if (command !== 'settings') return no('Unknown Looks command.');
    return ok('Local look updated.', lookSnapshot());
  },
  snapshot: lookSnapshot,
  mount(parent, ctx) {
    const layout = el('div', '', 'dev-tools');
    parent.append(layout);
    const status = el('p', '', 'dev-status');
    status.setAttribute('role', 'status');
    const controls = el('div', '', 'dev-actions');
    const presets = new Map<LookId, HTMLButtonElement>();
    const run = async (command: string, args = {}) => {
      const result = await ctx.run('looks', command, args);
      status.textContent = result.message;
      if (command === 'copy' && result.data !== undefined) {
        output.value = JSON.stringify(result.data, null, 2);
        details.open = true;
      }
      refresh();
    };
    for (const [id, preset] of Object.entries(LOOKS)) {
      const item = button(preset.label, () => run('select', { id }));
      item.dataset.look = id;
      item.style.minHeight = '44px';
      if (id === 'current') item.style.gridColumn = '1 / -1';
      presets.set(id as LookId, item);
      controls.append(item);
    }
    layout.append(controls);
    const slots = el('div', '', 'dev-actions');
    layout.append(slots);
    const select = (name: 'A' | 'B') => {
      const label = el('label', `${name} `);
      label.style.cssText = 'display:grid;gap:4px;min-width:0';
      const input = el('select');
      input.setAttribute('aria-label', `Look ${name}`);
      input.style.minHeight = '44px';
      for (const [id, preset] of Object.entries(LOOKS)) {
        const option = el('option', preset.label);
        option.value = id;
        input.append(option);
      }
      label.append(input);
      slots.append(label);
      return input;
    };
    const a = select('A'),
      b = select('B');
    a.onchange = b.onchange = () => void run('slots', { a: a.value, b: b.value });
    const swap = button('A/B · \\', () => run('swap'));
    swap.dataset.lookSwap = '';
    swap.style.minHeight = '44px';
    layout.append(swap);
    const trimLabel = el('label', 'Exposure trim (EV) ');
    trimLabel.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
    const trim = el('input');
    trim.type = 'number';
    trim.min = '-2';
    trim.max = '2';
    trim.step = '0.025';
    trim.style.width = '76px';
    trim.style.minHeight = '44px';
    trim.onchange = () => void run('trim', { ev: Number(trim.value) });
    trimLabel.append(trim);
    layout.append(trimLabel);
    const summary = el('p', '', 'dev-note');
    layout.append(
      summary,
      button('Copy look', () => run('copy')),
      status,
    );
    const details = more(layout);
    note(
      details,
      'Only this browser. Water → Post sets fixed gain and underwater offset. Select a look to restore its settings; each look keeps its recorded trim. Backslash switches A/B while this panel is open.',
    );
    note(
      details,
      'No live tile board: the underwater HDR composite needs another target/pass, and water changes require another scene. Compare sequential same-camera captures instead.',
    );
    const output = el('textarea');
    output.readOnly = true;
    output.rows = 8;
    output.setAttribute('aria-label', 'Copied look JSON');
    details.append(output);
    const refresh = () => {
      const snap = lookSnapshot();
      const reason = unavailable();
      for (const [id, item] of presets) {
        item.disabled = !!reason;
        item.setAttribute('aria-pressed', String(snap.selected === id));
      }
      a.value = snap.a;
      b.value = snap.b;
      trim.disabled = snap.selected === 'current';
      if (document.activeElement !== trim) trim.value = snap.exposure.trimEV.toFixed(3);
      summary.textContent =
        reason ??
        `${snap.label}${snap.modified ? ' · modified in Water/Post' : ''} · fixed gain ${snap.exposure.surfaceGain.toFixed(3)} (${snap.exposure.surfaceEV.toFixed(2)} EV) · underwater +${snap.exposure.underwaterEV.toFixed(2)} EV · ${snap.exposure.trimEV.toFixed(3)} EV trim`;
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.code !== 'Backslash' ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)))
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void run('swap');
    };
    document.addEventListener('keydown', key, true);
    const stop = onLookChange(refresh),
      stopBindings = onChange(refresh);
    refresh();
    return () => {
      stop();
      stopBindings();
      document.removeEventListener('keydown', key, true);
    };
  },
};
