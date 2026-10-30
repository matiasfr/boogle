// The controls guide, generated from the control registry (src/player/controls.js) so it cannot drift from the code.
//
//   renderGuide(kind, { groups })   an element with one section per group that has rows for `kind`: 'kbm' (rows with
//                                   keys), 'pad' (rows with a pad binding) or 'touch' (rows with a touch label).
//                                   groups limits it to those GROUPS ids. Each row is [glyph] label (detail) and
//                                   carries data-id. Plain DOM; style it through src/player/guide.css.
//
// A pad row that only applies in some situation (context) and shares its slot with an earlier row of the same group is
// left out of the pad guide: it is the same button doing the same thing (Toss is X, like Use).
import './guide.css';
import { GROUPS, listControls } from './controls.js';
import { keyGlyph, padGlyph } from './glyphs.js';

const slotsOf = (c) => [c.pad].flat().filter(Boolean);
const has = {
  kbm: (c) => Array.isArray(c.keys) && c.keys.length > 0,
  pad: (c) => slotsOf(c).length > 0,
  touch: (c) => !!c.touch,
};
const SEP = '<span class="guide-or">/</span>';

function glyphCell(kind, c) {
  if (kind === 'kbm') return c.keys.map(keyGlyph).join(SEP);
  if (kind === 'pad') return slotsOf(c).map(padGlyph).join(SEP);
  return `<span class="g-touch">${c.touch.replace(/[&<]/g, '')}</span>`;
}

const detailFor = (c, kind) => (typeof c.detail === 'object' && c.detail ? c.detail[kind] : c.detail) ?? '';

function rowFor(kind, c) {
  const row = document.createElement('div');
  row.className = 'guide-row';
  row.dataset.id = c.id;
  const cell = document.createElement('span');
  cell.className = 'guide-glyph';
  cell.innerHTML = glyphCell(kind, c);
  const text = document.createElement('span');
  text.className = 'guide-text';
  const label = document.createElement('span');
  label.className = 'guide-label';
  label.textContent = c.label;
  text.append(label);
  const detail = detailFor(c, kind);
  if (detail) {
    const d = document.createElement('span');
    d.className = 'guide-detail';
    d.textContent = detail;
    text.append(d);
    row.title = detail;
  }
  row.append(cell, text);
  return row;
}

export function renderGuide(kind, { groups } = {}) {
  const root = document.createElement('div');
  root.className = `guide guide-${kind}`;
  const list = listControls().filter((c) => has[kind](c));
  for (const [id, title] of GROUPS) {
    if (groups && !groups.includes(id)) continue;
    const seen = new Set();
    const rows = [];
    for (const c of list.filter((c) => c.group === id)) {
      const slots = slotsOf(c);
      if (kind === 'pad' && c.context && slots.every((s) => seen.has(s))) continue;
      slots.forEach((s) => seen.add(s));
      rows.push(rowFor(kind, c));
    }
    if (!rows.length) continue;
    const section = document.createElement('section');
    section.className = 'guide-group';
    section.dataset.group = id;
    const h = document.createElement('h3');
    h.textContent = title;
    section.append(h, ...rows);
    root.append(section);
  }
  return root;
}
