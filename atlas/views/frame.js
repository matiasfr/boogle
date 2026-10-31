// Frame: one frame as a flame chart, left to right in run order. Outlined slices are core hooks (the orders src/loop.js reserves);
// coloured ones are features, coloured by sync kind. ctx = { S, M, N, ... }.
import { hooks } from '../model.js';

const PHASES = [
  ['pre', 'Before the step'],
  ['world', 'world'],
  ['update', 'update'],
  ['late', 'late'],
  ['render', 'render'],
];

export function frameView(ctx, el) {
  const { S, M, kc, esc } = ctx;
  const all = hooks(M);
  el.innerHTML = `<div class="frame"><p class="note">One frame, in run order. Outlined slices are the core hooks: orders below −10, or 3000 and up, which <code>src/loop.js</code> reserves. Filled slices are features and their lazy parts, coloured by sync kind (grey is Local). Features pick an order of −10 or higher. Click a slice to see who owns it.</p>
    <div class="flame">${PHASES.map(([p, label]) => {
      const list = all.filter((h) => h.phase === p).sort((a, b) => a.order - b.order);
      if (!list.length) return '';
      return `<div class="ph"><div>${label}</div><div class="slices">${list
        .map(
          (h) =>
            `<button class="slice${h.core ? ' core' : ''}${S.sel.t === 'hook' && S.sel.id === h.id ? ' sel' : ''}" style="${h.kind && !h.core ? `--c:${kc(h.kind)}` : ''}" data-hook="${esc(h.id)}"><span>${esc(h.name)}</span><small>${p === 'pre' || p === 'render' ? esc(h.base) : h.order}</small></button>`,
        )
        .join('')}</div></div>`;
    }).join('')}</div></div>`;
  return null;
}
