// Focus: one file in the middle, what uses it on the left, what it uses on the right. Click a neighbour to move.
import { KINDS } from '../layout.js';
import { registrations } from '../model.js';

export function focusView(ctx, el) {
  const { S, M, kc, esc } = ctx;
  const f = S.focusFile && M.byPath.get(S.focusFile);
  if (!f) {
    el.innerHTML =
      '<div class="frame"><p class="note">That file is not in the code any more. Pick another from the Map or the search box.</p></div>';
    return;
  }
  const group = (paths) => {
    const g = {};
    for (const p of paths) {
      const x = M.byPath.get(p);
      if (x) (g[x.dir] ||= []).push(x);
    }
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
  };
  const left = group(f.users);
  const right = group([...new Set([...f.imports, ...f.lazy])]);
  const regs = registrations(f);
  const W = 1000;
  const RH = 24;
  const GH = 30;
  const colW = 250;
  const cx = W / 2;
  const cardW = 300;
  const colH = (gs) => gs.reduce((a, [, l]) => a + GH + l.length * RH, 0);
  const cardH = 92 + regs.length * 22;
  const H = Math.max(colH(left), colH(right), cardH) + 60;
  const cardY = (H - cardH) / 2;
  let s = '';
  let edges = '';
  const col = (gs, x, side) => {
    let y = (H - colH(gs)) / 2;
    for (const [d, list] of gs) {
      s += `<text x="${x}" y="${y + 18}" style="font:600 11px var(--sans);fill:var(--faint);letter-spacing:.07em;text-transform:uppercase">${esc(d)}/</text>`;
      y += GH;
      for (const n of list) {
        const ey = y + RH / 2 - 2;
        const ex = side === 'L' ? x + colW : x;
        const tx = side === 'L' ? cx - cardW / 2 : cx + cardW / 2;
        const ty = cardY + 40;
        edges += `<path d="M${ex} ${ey} C ${(ex + tx) / 2} ${ey}, ${(ex + tx) / 2} ${ty}, ${tx} ${ty}" fill="none" stroke="var(${side === 'L' ? '--usedby' : '--uses'})" stroke-opacity=".45" stroke-width="1.5"/>`;
        s += `<g class="nb" data-focus="${esc(n.f)}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${colW}" height="${RH - 4}" rx="5" fill="var(--sunk)"/><rect x="${x + 6}" y="${y + 6}" width="3" height="${RH - 16}" rx="1.5" fill="${kc(n.kind)}"/>
          <text x="${x + 16}" y="${y + 14}" style="font:12px var(--mono)">${esc(n.name)}</text><text x="${x + colW - 8}" y="${y + 14}" text-anchor="end" style="font:11px var(--mono);fill:var(--faint)">${n.users.length}↙ ${n.imports.length}↗</text><title>${esc(n.f)}</title></g>`;
        y += RH;
      }
    }
  };
  col(left, 20, 'L');
  col(right, W - 20 - colW, 'R');
  s += `<text x="20" y="22" style="font:600 12px var(--sans);fill:var(--usedby)">USED BY · ${f.users.length}</text><text x="${W - 20}" y="22" text-anchor="end" style="font:600 12px var(--sans);fill:var(--uses)">USES · ${right.reduce((a, [, l]) => a + l.length, 0)}</text>`;
  const x0 = cx - cardW / 2;
  let card = `<rect x="${x0}" y="${cardY}" width="${cardW}" height="${cardH}" rx="10" fill="var(--panel)" stroke="var(--fg)" stroke-width="1.5"/>
    <rect x="${x0}" y="${cardY}" width="${cardW}" height="6" rx="3" fill="${kc(f.kind)}"/>
    <text x="${x0 + 16}" y="${cardY + 34}" style="font:600 17px var(--sans)">${esc(f.name)}</text>
    <text x="${x0 + 16}" y="${cardY + 54}" style="font:11px var(--mono);fill:var(--faint)">${esc(f.dir)}/ · ${f.loc} lines · ${KINDS[f.kind].name}</text>
    <line x1="${x0 + 16}" x2="${x0 + cardW - 16}" y1="${cardY + 70}" y2="${cardY + 70}" stroke="var(--line)"/>`;
  regs.forEach(([k, v], i) => {
    card += `<text x="${x0 + 16}" y="${cardY + 92 + i * 22}" style="font:12px var(--sans);fill:var(--mute)">${esc(k)}</text><text x="${x0 + 110}" y="${cardY + 92 + i * 22}" style="font:12px var(--mono)">${esc(v.length > 26 ? v.slice(0, 25) + '…' : v)}</text>`;
  });
  if (!regs.length)
    card += `<text x="${x0 + 16}" y="${cardY + 92}" style="font:12px var(--sans);fill:var(--faint)">Registers nothing: a plain module.</text>`;
  el.innerHTML = `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" style="display:block;width:100%;min-width:760px">${edges}${s}${card}</svg></div>`;
}
