// Standing placeholder labels use the existing board and unchanged paint, owned by instantiate.
import { signBoard, type SignBoard } from '../../render/sign-board.ts';
import type { Attach } from '../types.ts';

const PAINT = { ground: '#e4e5e6', ink: '#2c2e30', rim: '#6f7275' };
/** One or two centred lines, the first larger, each in the largest type that fits the board's width unsqueezed. */
function paint(s: Pick<SignBoard, 'g' | 'cw' | 'ch'>, lines: readonly string[]) {
  const { g, cw, ch } = s;
  g.fillStyle = PAINT.ground;
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = PAINT.rim;
  g.lineWidth = ch * 0.04;
  g.strokeRect(ch * 0.04, ch * 0.04, cw - ch * 0.08, ch - ch * 0.08);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = PAINT.ink;
  const rows = lines.length > 1 ? [0.36, 0.74] : [0.5],
    sizes = lines.length > 1 ? [0.34, 0.22] : [0.44];
  lines.slice(0, 2).forEach((text, k) => {
    let px = ch * sizes[k]!;
    g.font = `900 ${px}px Figtree, system-ui, sans-serif`;
    const wide = g.measureText(text).width;
    if (wide > cw * 0.9) px *= (cw * 0.9) / wide;
    g.font = `900 ${px}px Figtree, system-ui, sans-serif`;
    g.fillText(text, cw / 2, ch * rows[k]!);
  });
}

export function makeGreyboxLabel(a: Extract<Attach, { kind: 'label' }>, lines: readonly string[]) {
  const s = signBoard(undefined, { w: a.w, h: a.h, px: 1024, foot: a.at[1], posts: a.posts ?? 'two', wood: '#5d6063' });
  paint(s, lines);
  s.painted();
  s.mesh.name = 'route-greybox:sign';
  s.mesh.position.set(a.at[0], 0, a.at[2]);
  s.mesh.rotation.y = Math.atan2(a.facing[0], a.facing[2]);
  /** The same plate with new words (a count that moves): repainted in place, no new board. */
  const repaint = (next: readonly string[]) => {
    paint(s, next);
    s.painted();
  };
  return { ...s, repaint };
}
