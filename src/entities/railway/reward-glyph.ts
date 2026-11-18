// The forge's board marks (docs/plans/forge-made-rewards.md, step 2; owner, 17 November: a station that grants an
// upgrade shows it). A reward's silhouette, painted on a bill board's canvas: an ink outline on the paper while the
// bill is unpaid (the promise), or filled in wood and steel inside a ring of gold dashes, the yard's "waiting for you"
// mark (stock-sign.ts), once it waits to be claimed. Canvas 2D only; no three.js. Local.
import { GOLD_ROPE } from '../../render/gold-rope.ts';

export type RewardKind = 'pack' | 'axe';
type G = CanvasRenderingContext2D;
type Shape = { path: (g: G) => void; fill: string };

const INK = '#2a1c10',
  PAPER = '#fff3d6',
  WOOD = '#a98249',
  HAFT = '#8a5a2b',
  STRAP = '#c9a86a',
  STEEL = '#a7b1b8';

const rect = (x: number, y: number, w: number, h: number) => (g: G) => g.rect(x - w / 2, y - h / 2, w, h);
/** The pack frame from behind, in a unit square around (0, 0): two uprights, three bars and two straps. */
const PACK: Shape[] = [
  { path: rect(-0.26, 0, 0.1, 0.8), fill: WOOD },
  { path: rect(0.26, 0, 0.1, 0.8), fill: WOOD },
  { path: rect(0, -0.28, 0.62, 0.09), fill: WOOD },
  { path: rect(0, 0.02, 0.62, 0.09), fill: WOOD },
  { path: rect(0, 0.3, 0.62, 0.09), fill: WOOD },
  ...[-1, 1].map((s) => ({
    path: (g: G) => {
      g.moveTo(s * 0.06, -0.3);
      g.bezierCurveTo(s * 0.2, -0.1, s * 0.2, 0.1, s * 0.12, 0.3);
      g.lineTo(s * 0.18, 0.3);
      g.bezierCurveTo(s * 0.27, 0.1, s * 0.27, -0.1, s * 0.13, -0.3);
      g.closePath();
    },
    fill: STRAP,
  })),
];
/** The proper axe, leaning: a haft and a broad head with a curved edge. */
const AXE: Shape[] = [
  {
    path: (g: G) => {
      g.save();
      g.rotate(0.55);
      g.roundRect(-0.045, -0.4, 0.09, 0.84, 0.04);
      g.restore();
    },
    fill: HAFT,
  },
  {
    path: (g: G) => {
      g.save();
      g.rotate(0.55);
      g.moveTo(-0.06, -0.38);
      g.lineTo(-0.2, -0.42);
      g.quadraticCurveTo(-0.34, -0.26, -0.24, -0.08);
      g.lineTo(-0.06, -0.18);
      g.lineTo(0.08, -0.22);
      g.lineTo(0.08, -0.34);
      g.closePath();
      g.restore();
    },
    fill: STEEL,
  },
];

/** Paints `kind` centred on (x, y), `size` px across. Every shape is stroked first and filled after, so the outline is
 * the whole silhouette's, never a box around each bar. */
export function drawRewardGlyph(g: G, kind: RewardKind, x: number, y: number, size: number, ready: boolean) {
  g.save();
  g.translate(x, y);
  if (ready) {
    g.strokeStyle = GOLD_ROPE;
    g.lineWidth = size * 0.06;
    g.setLineDash([size * 0.11, size * 0.08]);
    g.beginPath();
    g.arc(0, 0, size * 0.46, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }
  const s = size * (ready ? 0.78 : 0.9);
  g.scale(s, s);
  g.lineJoin = 'round';
  const shapes = kind === 'pack' ? PACK : AXE;
  g.strokeStyle = INK;
  g.lineWidth = (ready ? 0.045 : 0.07) * 2;
  for (const shape of shapes) {
    g.beginPath();
    shape.path(g);
    g.stroke();
  }
  for (const shape of shapes) {
    g.fillStyle = ready ? shape.fill : PAPER;
    g.beginPath();
    shape.path(g);
    g.fill();
  }
  g.restore();
}
