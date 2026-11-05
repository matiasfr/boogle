// Lazy Local Pause page. The registry and existing resource owners apply every choice.
import './graphics-page.css';
import {
  graphicsSnapshot,
  onGraphicsChange,
  playerGraphics,
  setGraphicsPreset,
  setPlayerGraphics,
  type GraphicsValue,
} from '../graphics-settings.ts';
import { qualitySnapshot } from '../render/quality.ts';
import { pauseNavigation } from './pause-pages.ts';

const presets = [
  ['auto', 'Auto'],
  ['quality', 'Quality'],
  ['performance', 'Performance'],
  ['battery', 'Battery Saver'],
] as const;
const descriptions: Record<string, string> = {
  auto: 'Adapts resolution as usual. Uses this device’s defaults.',
  quality: 'Sharper picture, up to 60 fps. Keeps seabed light.',
  performance: 'Softer picture, up to 60 fps. Keeps the water’s detail.',
  battery: 'Softest picture, up to 30 fps. Keeps the water’s detail.',
  custom: 'Your own mix. Choose a preset to start again.',
};
const controls = [
  { id: 'resolution', label: 'Resolution', note: 'Lower is softer, with fewer pixels to draw.' },
  { id: 'frameLimit', label: 'Frame limit', note: 'Lower draws fewer frames. Display follows your screen.' },
  { id: 'msaa', label: 'Smooth edges', note: 'Softens jagged edges. Changing this needs a reload.' },
  { id: 'caustics', label: 'Seabed light', note: 'Moving light patterns under the water.' },
];
function valueLabel(id: string, value: GraphicsValue) {
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (value === 'auto') return 'Auto';
  if (value === 'display') return 'Display';
  return id === 'resolution' ? `${Number(value) * 100}%` : `${value} fps`;
}
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = cls;
  return node;
}
export function mountGraphics(parent: HTMLElement, resume: () => void) {
  const page = el('section', '', 'graphics-page');
  const heading = el('h2', 'Graphics', 'pause-h');
  const description = el('p', '', 'pause-note');
  const status = el('p', '', 'pause-note graphics-status');
  status.setAttribute('role', 'status');
  const picks = el('div', '', 'graphics-presets');
  const rows = el('div', '', 'graphics-controls');
  const footer = el('div', '', 'graphics-footer');
  let busy = false;
  let error = '';
  let disposed = false;
  const execute = async (action: () => Promise<void>) => {
    if (busy) return;
    const focus = document.activeElement;
    busy = true;
    error = '';
    refresh();
    try {
      await action();
    } catch {
      error = 'That change could not finish. Try again or reset to Auto.';
    } finally {
      busy = false;
      if (!disposed) {
        refresh();
        if (focus instanceof HTMLElement && page.contains(focus)) focus.focus({ preventScroll: true });
      }
    }
  };
  const button = (text: string, action: () => void) => {
    const node = el('button', text, 'pause-btn');
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const presetButtons = presets.map(([id, label]) => {
    const node = button(label, () => void execute(() => setGraphicsPreset(id)));
    node.dataset.preset = id;
    picks.append(node);
    return node;
  });
  const controlRows = controls.map(({ id, label, note }) => {
    const row = el('div', '', 'graphics-row');
    const text = el('div');
    const detail = el('p', note, 'pause-note');
    const choice = button('', () => {
      const setting = graphicsSnapshot().find((item) => item.id === id);
      if (!setting?.available) return;
      const next = (setting.choices.indexOf(setting.playerRequested) + 1) % setting.choices.length;
      void execute(() => setPlayerGraphics(id, setting.choices[next]!));
    });
    choice.dataset.setting = id;
    detail.id = `graphics-${id}-note`;
    choice.setAttribute('aria-describedby', detail.id);
    text.append(el('strong', label), detail);
    row.append(text, choice);
    rows.append(row);
    return { id, label, note, row, choice, detail };
  });
  const reload = button('Reload now', () => location.reload());
  reload.classList.add('primary');
  reload.dataset.act = 'graphics-reload';
  const reset = button('Reset to Auto', () => void execute(() => setGraphicsPreset('auto')));
  const back = button('Back', () => {
    pauseNavigation.open?.('main');
  });
  const done = button('Resume', resume);
  footer.append(reset, back, done);
  page.append(heading, picks, description, rows, status, reload, footer);
  parent.replaceChildren(page);

  function refresh() {
    const player = playerGraphics();
    const snapshot = graphicsSnapshot();
    const pending = snapshot.some((item) => item.audience === 'player' && item.pending && item.applyMode === 'reload');
    const dev = snapshot.some((item) => item.devOverride);
    description.textContent = `${player.preset === 'custom' ? 'Custom · ' : ''}${descriptions[player.preset]}`;
    for (const node of presetButtons) {
      node.setAttribute('aria-pressed', String(node.dataset.preset === player.preset));
      node.disabled = busy;
    }
    for (const { id, label, note, row, choice, detail } of controlRows) {
      const setting = snapshot.find((item) => item.id === id);
      row.hidden = !setting?.available;
      choice.disabled = busy || !setting?.available;
      if (!setting) continue;
      choice.textContent = valueLabel(id, setting.playerRequested);
      choice.setAttribute('aria-label', `${label}: ${choice.textContent}. Change`);
      detail.textContent = note;
      if (setting.devOverride) detail.textContent += ` Dev is using ${valueLabel(id, setting.requested)}.`;
      if (setting.pending && setting.applyMode === 'reload')
        detail.textContent += ` Currently ${valueLabel(id, setting.effective)} until reload.`;
    }
    const quality = qualitySnapshot();
    const notes = [error];
    if (player.storageFailed) notes.push('Could not save on this browser. Changes last only for this visit.');
    if (dev) notes.push('Dev overrides take priority. Resetting here keeps them.');
    if (pending)
      notes.push(
        player.storageFailed
          ? 'Smooth edges cannot apply until this browser can save settings. Try the choice again.'
          : 'Smooth edges is pending. Reload when you’re ready.',
      );
    if (typeof quality.resolution === 'number' && quality.scale < quality.resolution)
      notes.push(`Water limits scene resolution to ${Math.round(quality.scale * 100)}% on this device.`);
    if (!snapshot.some((item) => item.id === 'caustics' && item.available))
      notes.push('Seabed light is unavailable in this scene.');
    status.textContent = notes.filter(Boolean).join(' ');
    status.hidden = !status.textContent;
    reload.hidden = !pending;
    reload.disabled = busy || player.storageFailed;
    reset.disabled = busy;
  }
  const unsubscribe = onGraphicsChange(refresh);
  refresh();
  presetButtons[0]?.focus({ preventScroll: true });
  return () => {
    disposed = true;
    unsubscribe();
  };
}
