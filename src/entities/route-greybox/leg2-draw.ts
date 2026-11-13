// Leg 2's layout as grey boxes and signs (docs/plans/greybox-leg2-massing.md): turns ./leg2-layout.ts's pieces into
// ./boxes.ts's boxes, puts posts under what stands over the sea, outlines the labelled pads and paints their signs.
// Shared by ./massing-bell.ts and ./massing-west.ts. Local scenery; every label is placeholder text.
import type { OwnedView } from '../../render/owned-view.ts';
import { paintTwoLines, signBoard } from '../../render/sign-board.ts';
import { span, type GreyBox } from './boxes.ts';
import { PAD_SIZE, type Pad, type Piece, type Post, type Tone } from './leg2-layout.ts';

const TONES: Record<Tone, string> = { grey: '#9c9ea1', light: '#b4b6b8', dark: '#6f7275', pale: '#e4e5e6' };
/** Posts go down to here, under the sea's surface. */
const SEABED = -8;

function box(p: Piece): GreyBox {
  const colour = TONES[p.tone],
    solid = p.solid !== false;
  if (!p.rise)
    return { x: p.x, y: p.top - p.h / 2, z: p.z, w: p.w, h: p.h, d: p.d, yaw: p.yaw, colour, solid, hidden: p.hidden };
  const ux = (Math.sin(p.yaw) * p.d) / 2,
    uz = (Math.cos(p.yaw) * p.d) / 2;
  return {
    ...span(
      { x: p.x - ux, y: p.top, z: p.z - uz },
      { x: p.x + ux, y: p.top + p.rise, z: p.z + uz },
      p.w,
      p.h,
      colour,
      solid,
    ),
    hidden: p.hidden,
  };
}

/** Posts under a piece that stands over the sea: along its middle, or along both edges when it is over 8 m wide. */
function posts(p: Piece): GreyBox[] {
  const out: GreyBox[] = [];
  const s = Math.sin(p.yaw),
    c = Math.cos(p.yaw),
    under = p.top - p.h,
    count = Math.max(2, Math.ceil(p.d / 12) + 1);
  for (const across of p.w > 8 ? [-p.w / 2 + 0.6, p.w / 2 - 0.6] : [0])
    for (let k = 0; k < count; k++) {
      const along = -p.d / 2 + 0.6 + ((p.d - 1.2) * k) / (count - 1);
      out.push({
        x: p.x + s * along + c * across,
        y: (under + SEABED) / 2,
        z: p.z + c * along - s * across,
        w: 0.5,
        h: under - SEABED,
        d: 0.5,
        yaw: p.yaw,
        colour: TONES.dark,
        solid: false,
      });
    }
  return out;
}

/** A pad's outline: four pale strips on the floor, not solid. */
function outline(p: Pad): GreyBox[] {
  const s = Math.sin(p.yaw),
    c = Math.cos(p.yaw),
    strip = (along: number, across: number, w: number, d: number): GreyBox => ({
      x: p.x + s * along + c * across,
      y: p.y + 0.03,
      z: p.z + c * along - s * across,
      w,
      h: 0.06,
      d,
      yaw: p.yaw,
      colour: TONES.pale,
      solid: false,
    });
  const a = PAD_SIZE.along / 2,
    b = PAD_SIZE.across / 2;
  return [
    strip(-a, 0, PAD_SIZE.across, 0.15),
    strip(a, 0, PAD_SIZE.across, 0.15),
    strip(0, -b, 0.15, PAD_SIZE.along),
    strip(0, b, 0.15, PAD_SIZE.along),
  ];
}

/** The boxes of `pieces` and `pads`, with the posts under them. */
export function leg2Boxes(pieces: readonly Piece[], pads: readonly Pad[]): GreyBox[] {
  return [...pieces.map(box), ...pieces.filter((p) => p.posts).flatMap(posts), ...pads.flatMap(outline)];
}

const PAINT = { ground: '#e4e5e6', ink: '#2c2e30', rim: '#6f7275' };
/** The pads' signs (at the pad's back edge, facing `face`) and the free-standing posts' boards. */
export function leg2Signs(
  owner: OwnedView,
  pads: readonly Pad[],
  face: { nx: number; nz: number },
  free: readonly Post[],
) {
  const stand = (
    at: { x: number; y: number; z: number },
    nx: number,
    nz: number,
    lines: readonly string[],
    w: number,
  ) => {
    const s = signBoard(owner, { w, h: w * 0.4, px: 768, foot: 1.2, posts: 'two', wood: '#5d6063' });
    paintTwoLines(s, lines[0] ?? '', lines[1] ?? '', PAINT);
    s.painted();
    s.mesh.name = 'route-greybox:sign';
    s.mesh.position.set(at.x, at.y, at.z);
    s.mesh.rotation.y = Math.atan2(nx, nz);
  };
  // A pad's board stands on its edge away from where it is read from.
  for (const p of pads)
    stand(
      { x: p.x - face.nx * (PAD_SIZE.across / 2), y: p.y, z: p.z - face.nz * (PAD_SIZE.across / 2) },
      face.nx,
      face.nz,
      p.lines,
      3.6,
    );
  for (const p of free) stand(p, p.nx, p.nz, p.lines, 4.4);
}
