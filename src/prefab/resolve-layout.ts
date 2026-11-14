// Authored JSON recipes are expanded only on load, never serialized back into artifacts.
// Local scenery math, outside lockstep. Full numeric validation runs on the result before allocation.
import type { Json, JsonObject, LevelDef, Placement, Vec3 } from './types.ts';
import { LINE2_END_S, line2World, line2Y } from '../entities/railway/line2-path.ts';
import { expandHaltKit } from './halt-layout.ts';
import { PAD_SIZE } from './greybox-constants.ts';
type XZ = { x: number; z: number };
type Tone = 'grey' | 'light' | 'dark' | 'pale' | 'black';
/** One box: a rectangle on the ground (centre, yaw of its length, `w` across, `d` along) under a top face that is
 * level at `top`, or runs from `top` at its -d/2 end to `top + rise` at its +d/2 end (a ramp), `h` thick. */
type Surface = {
  id: string;
  x: number;
  z: number;
  /** Radians: atan2(dx, dz) of its length. */
  yaw: number;
  w: number;
  d: number;
  top: number;
  rise?: number;
  h: number;
  tone: Tone;
  /** No collider (a post, a pad's outline, the portal). */
  solid?: false;
  /** A collider only (the rock under the backdrop's mesh). */
  hidden?: true;
  /** Stands over other pieces (the bridge over the cut): the level report walks under it as well as on it. */
  over?: true;
  /** Stands over the sea: the massing puts posts under it. */
  posts?: true;
  /** May move with a later plan (design review, finding 5 and change 5). */
  provisional?: true;
};
/** A labelled pad (Ruling 2): a 6 by 4 m pale outline and one sign. */
type PadInput = { id: string; x: number; z: number; y: number; yaw: number; label: string };
/** A sign on its own post or posts, facing (nx, nz). */
type SignInput = {
  id: string;
  x: number;
  z: number;
  y: number;
  nx: number;
  nz: number;
  label: string;
  /** On one tall post, the board overhead, where it stands in a walkway. */
  high?: true;
  facing?: XZ;
};

type Basis = { o: XZ; u: XZ; v: XZ };
type Area = { basis: Basis; pieces: Surface[]; pads: PadInput[]; posts: SignInput[]; [key: string]: unknown };
const point = (f: Basis, a: number, b: number) => ({
  x: f.o.x + f.u.x * a + f.v.x * b,
  z: f.o.z + f.u.z * a + f.v.z * b,
});
// Reject wrong operand types before JS arithmetic can coerce strings, nulls or booleans.
function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('prefabs: layout operand must be a finite number');
  return value;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('prefabs: layout operand must be an object');
  return value as Record<string, unknown>;
}
function xy(value: unknown): XZ {
  const v = object(value);
  return { x: finite(v.x), z: finite(v.z) };
}
function xyz(value: unknown) {
  const v = object(value);
  return { ...xy(v), y: finite(v.y) };
}
function basis(value: unknown): Basis {
  const v = object(value);
  return { o: xy(v.o), u: xy(v.u), v: xy(v.v) };
}
function tuple(value: unknown, count: number): number[] {
  if (!Array.isArray(value) || value.length !== count)
    throw new Error('prefabs: layout operand has wrong tuple length');
  return value.map(finite);
}
function name(value: unknown) {
  if (typeof value !== 'string' || !value.length) throw new Error('prefabs: layout name must be a nonempty string');
}
function flags(value: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys)
    if (value[key] !== undefined && typeof value[key] !== 'boolean')
      throw new Error('prefabs: layout flag must be boolean');
}
function area(value: unknown): Area {
  const a = object(value);
  basis(a.basis);
  for (const key of ['pieces', 'pads', 'posts', 'reserves'])
    if (!Array.isArray(a[key])) throw new Error('prefabs: layout requires arrays');
  for (const value of a.pieces as unknown[]) {
    const p = object(value);
    name(p.id);
    xy(p);
    for (const key of ['w', 'h', 'd', 'top', 'yaw']) finite(p[key]);
    if (p.rise !== undefined) finite(p.rise);
    if (typeof p.tone !== 'string' || !Object.hasOwn(COLOURS, p.tone))
      throw new Error('prefabs: layout tone is unknown');
    flags(p, ['solid', 'hidden', 'over', 'posts', 'provisional']);
  }
  for (const value of a.pads as unknown[]) {
    const p = object(value);
    name(p.id);
    name(p.label);
    xyz(p);
    finite(p.yaw);
  }
  for (const value of a.posts as unknown[]) {
    const p = object(value);
    name(p.id);
    name(p.label);
    xyz(p);
    flags(p, ['high']);
    if (p.facing !== undefined) xy(p.facing);
    else {
      finite(p.nx);
      finite(p.nz);
    }
  }
  xy(a.origin);
  if (a.extras !== undefined) {
    if (!Array.isArray(a.extras)) throw new Error('prefabs: layout extras must be an array');
    for (const extra of a.extras) name(object(extra).id);
  }
  for (const key of ['rockTop', 'rockBase']) if (a[key] !== undefined) finite(a[key]);
  for (const value of a.reserves as unknown[]) {
    const r = object(value);
    name(r.id);
    xy(r);
    for (const key of ['yaw', 'w', 'd', 'y0', 'y1']) finite(r[key]);
  }
  return a as unknown as Area;
}
// A closed expression vocabulary. JSON is checked before this evaluator; output geometry is checked afterward.
function evaluate(value: Json): Json {
  if (Array.isArray(value)) return value.map(evaluate);
  if (!value || typeof value !== 'object') return value;
  const o = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, evaluate(v)]));
  if (!('compute' in o)) return o;
  const { compute, ...rest } = o;
  const n = (key: string) => finite(o[key]);
  const vector = (key: string) => xy(o[key]);
  switch (compute) {
    case 'add':
      return n('a') + n('b');
    case 'sub':
      return n('a') - n('b');
    case 'mul':
      return n('a') * n('b');
    case 'unit': {
      const a = vector('axis'),
        l = Math.hypot(a.x, a.z);
      return { x: a.x / l, z: a.z / l };
    }
    case 'perp': {
      const a = vector('axis'),
        s = n('sign');
      return { x: a.z * s, z: -a.x * s };
    }
    case 'mix': {
      const a = vector('a'),
        b = vector('b');
      return { x: a.x * n('wa') + b.x * n('wb'), z: a.z * n('wa') + b.z * n('wb') };
    }
    case 'yaw': {
      const a = vector('axis');
      return Math.atan2(a.x, a.z);
    }
    case 'point': {
      const [a, b] = tuple(o.at, 2),
        f = basis(o.frame);
      const extra = { ...rest };
      delete extra.frame;
      delete extra.at;
      return { ...extra, ...point(f, a!, b!) };
    }
    case 'offsetPoint': {
      const p = vector('point');
      return { x: p.x + n('dx'), z: p.z + n('dz') };
    }
    case 'rect':
    case 'slab': {
      const [a0, a1, b0, b1] = tuple(o.bounds, 4),
        f = basis(o.frame);
      const p = point(f, (a0! + a1!) / 2, (b0! + b1!) / 2);
      const rect = { ...rest, ...p, yaw: Math.atan2(f.u.x, f.u.z), w: Math.abs(b1! - b0!), d: Math.abs(a1! - a0!) };
      return compute === 'slab' ? { ...rect, y: (n('y0') + n('y1')) / 2, h: n('y1') - n('y0') } : rect;
    }
    case 'span': {
      return { ...rest, ...spanOf(xyz(o.a), xyz(o.b), n('h')) };
    }
    case 'line2Point': {
      const p = { x: 0, z: 0 };
      line2World(LINE2_END_S + n('offset'), n('lat'), p);
      return { ...rest, ...p };
    }
    case 'line2EndY':
      return line2Y(LINE2_END_S) + n('offset');
    default:
      throw new Error(`prefabs: unknown layout expression ${compute}`);
  }
}
export function resolveLayout(level: LevelDef): LevelDef {
  if (level.layout === undefined) return level;
  const layout = object(level.layout) as JsonObject;
  if (!Array.isArray(level.placements)) throw new Error('prefabs: layout requires placements array');
  if (level.placements.length || level.analysis)
    throw new Error('prefabs: layout cannot coexist with expanded placements or analysis');
  if (layout.kind === 'halt-kit') return expandHaltKit(level, evaluate(layout.entries!), layout.sourceFingerprint);
  if (layout.kind === 'leg2') {
    if (layout.area !== level.place) throw new Error('prefabs: layout place mismatch');
    const header = { ...level };
    delete header.layout;
    return { ...header, ...expandLeg2(level.place, area(evaluate(layout.data!))) };
  }
  if (layout.kind !== 'gorge' || level.place !== 'gorge') throw new Error('prefabs: unknown layout kind');
  const boxes = evaluate(layout.boxes!) as unknown as {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
    yaw: number;
    pitch?: number;
    colour?: string;
    hidden?: boolean;
    solid?: boolean;
  }[];
  for (const value of boxes) {
    const b = object(value);
    xyz(b);
    for (const key of ['w', 'h', 'd', 'yaw']) finite(b[key]);
    if (b.pitch !== undefined) finite(b.pitch);
    if (b.colour !== undefined) name(b.colour);
    flags(b, ['hidden', 'solid']);
  }
  const base: Placement[] = boxes.map((b, i) => ({
    id: i < 10 && i % 2 === 0 ? `gorge.platform-n.${i / 2}` : `gorge.massing.${i}`,
    prefab: boxPrefab(b),
    pos: [b.x, b.y, b.z],
    rot: [b.yaw, -(b.pitch ?? 0), 0],
    scale: [b.w, b.h, b.d],
    params: { colour: b.colour ?? COLOURS.grey },
  }));
  const incline = expandLeg2('gorge', area(evaluate(layout.incline!)));
  const ids = new Map(incline.placements.map((p, i) => [p.id, `gorge.massing.${base.length + i}`]));
  const analysis = incline.analysis! as JsonObject & { surfaces: { id: string; name: string; over: boolean }[] };
  const header = { ...level };
  delete header.layout;
  return {
    ...header,
    placements: [...base, ...incline.placements.map((p) => ({ ...p, id: ids.get(p.id)! }))],
    analysis: { ...analysis, surfaces: analysis.surfaces.map((s) => ({ ...s, id: ids.get(s.id)! })) },
  };
}
const COLOURS: Record<Tone, string> = {
  grey: '#9c9ea1',
  light: '#b4b6b8',
  dark: '#6f7275',
  pale: '#e4e5e6',
  black: '#101113',
};
type XYZ = { x: number; y: number; z: number };
/** A box of thickness h whose top face runs from a to b: its centre, length, heading and pitch. */
function spanOf(a: XYZ, b: XYZ, h: number) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    dy = b.y - a.y,
    run = Math.hypot(dx, dz),
    pitch = Math.atan2(dy, run);
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2 - (h / 2) * Math.cos(pitch),
    z: (a.z + b.z) / 2,
    d: Math.hypot(run, dy),
    yaw: Math.atan2(dx, dz),
    pitch,
  };
}
/** Hidden boxes only collide, non-solid ones only draw. */
const boxPrefab = (b: { hidden?: unknown; solid?: unknown }) =>
  b.hidden ? 'greybox.collider' : b.solid === false ? 'greybox.decoration' : 'greybox.box';
function surface(p: Surface): Placement {
  let pos: Vec3 = [p.x, p.top - p.h / 2, p.z],
    rot: Vec3 = [p.yaw, 0, 0],
    depth = p.d;
  if (p.rise) {
    const ux = (Math.sin(p.yaw) * p.d) / 2,
      uz = (Math.cos(p.yaw) * p.d) / 2;
    const a = { x: p.x - ux, y: p.top, z: p.z - uz },
      b = { x: p.x + ux, y: p.top + p.rise, z: p.z + uz };
    const s = spanOf(a, b, p.h);
    pos = [s.x, s.y, s.z];
    rot = [s.yaw, -s.pitch, 0];
    depth = s.d;
  }
  return {
    id: p.id,
    prefab: boxPrefab(p),
    pos,
    rot,
    scale: [p.w, p.h, depth],
    params: { colour: COLOURS[p.tone] },
  };
}
function supports(p: Surface): Placement[] {
  const out: Placement[] = [],
    s = Math.sin(p.yaw),
    c = Math.cos(p.yaw),
    count = Math.max(2, Math.ceil(p.d / 12) + 1);
  for (const across of p.w > 8 ? [-p.w / 2 + 0.6, p.w / 2 - 0.6] : [0])
    for (let k = 0; k < count; k++) {
      const along = -p.d / 2 + 0.6 + ((p.d - 1.2) * k) / (count - 1),
        under = p.top + (p.rise ?? 0) * (along / p.d + 0.5) - p.h;
      out.push({
        id: `${p.id}.post.${out.length}`,
        prefab: 'greybox.decoration',
        pos: [p.x + s * along + c * across, (under - 8) / 2, p.z + c * along - s * across],
        rot: [p.yaw, 0, 0],
        scale: [0.5, under + 8, 0.5],
        params: { colour: COLOURS.dark },
      });
    }
  return out;
}
function sign(p: SignInput): Placement {
  return {
    id: p.id,
    prefab: p.high ? 'greybox.sign-post-high' : 'greybox.sign-post',
    pos: [p.x, p.y, p.z],
    rot: [Math.atan2(p.facing?.x ?? p.nx, p.facing?.z ?? p.nz), 0, 0],
    labels: { label: p.label },
  };
}
function expandLeg2(id: string, data: Area): LevelDef {
  const { basis, pieces, pads, posts, extras, ...context } = data;
  const at = (a: number, b: number) => point(basis, a, b);
  const placements: Placement[] = [...pieces.map(surface), ...pieces.filter((p) => p.posts).flatMap(supports)];
  for (const p of pads) placements.push({ id: p.id, prefab: 'greybox.pad', pos: [p.x, p.y, p.z], rot: [p.yaw, 0, 0] });
  placements.push(...((extras as Placement[]) ?? []));
  const o = at(0, 0),
    east = at(0, 1),
    nx = east.x - o.x,
    nz = east.z - o.z;
  for (const p of pads)
    placements.push(
      sign({
        id: `${p.id}.sign`,
        x: p.x - nx * (PAD_SIZE.across / 2),
        y: p.y,
        z: p.z - nz * (PAD_SIZE.across / 2),
        nx,
        nz,
        label: p.label,
      }),
    );
  placements.push(...posts.map(sign));
  return {
    place: id,
    placements: placements.map((p) => ({ ...p, id: `${id}.${p.id}` })),
    // Only checker marks, reserved space and placement references: geometry has ONE compiled authority.
    analysis: {
      ...context,
      surfaces: pieces.map((p) => ({ id: `${id}.${p.id}`, name: p.id, over: p.over === true })),
      pads: pads.map((p) => ({ id: `${id}.${p.id}`, name: p.id })),
      posts: posts.map((p) => ({ id: `${id}.${p.id}`, name: p.id })),
    },
  };
}
