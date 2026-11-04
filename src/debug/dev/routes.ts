// Separate pages, not a world teleport. Never carry disposable-run authority across islands.
import { el, button, note } from './ui.ts';

export function islandLink(island: 'starting' | 'low' | 'home', shore = false) {
  const url = new URL(location.pathname, location.origin);
  const current = new URLSearchParams(location.search);
  for (const key of ['water', 'tune', 'dpr', 'sky', 'tone', 'tod', 'v']) {
    const value = current.get(key);
    if (value !== null) url.searchParams.set(key, value);
  }
  url.searchParams.set('dev', '1');
  if (island !== 'starting') url.searchParams.set('classic', '1');
  if (island === 'low') {
    url.searchParams.set('island', 'low');
    url.searchParams.set('room', 'island-low');
  }
  if (shore) url.searchParams.set('devshore', '1');
  return url.href;
}
export function islandPicker(parent: HTMLElement) {
  const section = el('section', '', 'dev-islands');
  const label = el('label', 'Island / shore', 'dev-field');
  const picker = el('select');
  picker.dataset.devIslandPicker = '';
  picker.setAttribute('aria-label', 'Island or shore destination');
  for (const [id, label] of [
    ['starting', 'Starting area'],
    ['low', 'Lower home island'],
    ['home', 'Current home island'],
  ] as const) {
    for (const shore of [false, true]) {
      const option = el('option', shore ? `${label} · shore` : label);
      option.value = islandLink(id, shore);
      option.dataset.devIsland = id;
      option.dataset.devShore = String(shore);
      picker.append(option);
    }
  }
  label.append(picker);
  const go = button('Open', () => location.assign(picker.value));
  go.dataset.devGo = '';
  section.append(label, go);
  note(section, 'Separate page · reload. Shore opens a Local camera; your body stays at arrival.');
  parent.append(section);
}
