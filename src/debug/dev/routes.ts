// Separate pages, not a world teleport. Never carry disposable-run authority across islands.
import { el } from './ui.ts';

export function islandLink(island: 'starting' | 'low' | 'home', shore = false) {
  const url = new URL(location.pathname, location.origin);
  const current = new URLSearchParams(location.search);
  for (const key of ['water', 'tune', 'dpr']) {
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
export function islandLinks(parent: HTMLElement) {
  const section = el('details', '', 'dev-islands');
  section.open = true;
  section.append(el('summary', 'Islands · separate pages, reload'));
  for (const [id, label] of [
    ['starting', 'Starting area'],
    ['low', 'Lower home island'],
    ['home', 'Current home island'],
  ] as const) {
    const row = el('div', '', 'dev-actions');
    for (const shore of [false, true]) {
      const link = el('a', shore ? `${label} shore` : label, 'pause-btn');
      link.href = islandLink(id, shore);
      link.dataset.devIsland = id;
      link.dataset.devShore = String(shore);
      row.append(link);
    }
    section.append(row);
  }
  section.append(
    el(
      'p',
      'Dev and saved Water settings stay in this browser. Shore opens a Local camera; your body stays at arrival.',
      'dev-note',
    ),
  );
  parent.append(section);
}
