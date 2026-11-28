// All station faces and Pause read one local presentation of the room's accepted work.
import { instantiate } from '../../prefab/instantiate.ts';
import type { SignBoard } from '../../render/sign-board.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { registerWorksFace, worksBoardRows } from './works-board-state.ts';
import { stockGlyphs } from './stock-glyphs.ts';
type Place = { x: number; z: number };
type Halt = { line: number; stop: number };
export function worksFace(
  owner: OwnedView,
  at: Place & { y: number },
  yaw: number,
  post = false,
  halts: readonly Halt[] = [],
) {
  const paintLabel = ({ g, cw, ch }: Pick<SignBoard, 'g' | 'cw' | 'ch'>, rows: readonly string[]) => {
    g.fillStyle = '#26383c';
    g.fillRect(0, 0, cw, ch);
    g.textBaseline = 'middle';
    const step = ch / Math.max(4, rows.length);
    // The hall upright overlaps the right edge from the square.
    const right = cw * 0.89;
    rows.forEach((row, i) => {
      g.fillStyle = i === 0 ? '#ffd778' : '#fff8dd';
      g.font = (i === 0 ? 'bold ' : '') + Math.floor(step * 0.65) + 'px system-ui';
      const y = step * (i + 0.5);
      const needs = i === 1 && /^[^·]+· (?:\w+ \d+\/\d+\s*)+$/.test(row) ? [...row.matchAll(/(\w+) (\d+\/\d+)/g)] : [];
      if (!needs.length) {
        g.fillText(row, 12, y, right - 12);
        return;
      }
      const title = row.slice(0, row.indexOf('\u00b7') + 1);
      g.fillText(title, 12, y);
      const start = 18 + g.measureText(title).width;
      const width = (right - start) / needs.length;
      const glyph = stockGlyphs(g);
      needs.forEach(([, kind, amount], k) => {
        const x = start + k * width,
          r = step * 0.13;
        if (kind === 'logs') glyph.logs(x + 2 * r, y, r);
        else if (kind === 'rails' || kind === 'steel') glyph.rails(x + 2 * r, y, 4 * r, r, 2 * r, true);
        else {
          g.strokeStyle = '#ffd778';
          g.lineWidth = 2;
          g.beginPath();
          if (kind === 'stone') {
            g.moveTo(x, y + r);
            g.lineTo(x + r, y - 2 * r);
            g.lineTo(x + 3 * r, y - r);
            g.lineTo(x + 4 * r, y + r);
            g.closePath();
            g.fillStyle = '#b8b9bd';
            g.fill();
          } else g.roundRect(x, y - r, 4 * r, 2 * r, kind === 'boiler' ? r : 0);
          g.stroke();
        }
        g.fillStyle = '#fff8dd';
        g.fillText(kind + ' ' + amount, x + 5 * r, y, width - 6 * r);
      });
    });
  };
  const key = post ? 'railway.works-post' : 'railway.works-face';
  const board = instantiate(
    key,
    {
      id: 'works-board-' + at.x + '-' + at.z,
      prefab: key,
      pos: [at.x, at.y, at.z],
      rot: [yaw, 0, 0],
      labels: { sign: 'works' },
    },
    { owner, texts: { works: [''] }, paintLabel },
  );
  board.root.name = 'railway:works-board';
  board.setEnabled(true);
  const paint = () => {
    const rows = worksBoardRows(at);
    board.relabel('sign', rows.length ? rows : ['']);
  };
  registerWorksFace(owner, at, halts, paint);
  return board.root;
}
