// What ancient technology stands where in ?proto=place, as numbers: no three.js, so dev/economy/place-level.ts can check it in
// Node. Research: docs/research/movement-abilities.md, sections 5 and 6, with its coordinates moved to what the land really is.
// All local metres, x z y like `Pt` in ./layout.ts; `top` is the surface you stand on. All of it hypotheses until played.
import { LINES, UP_LAT, lineAt, railY, type Line, type LinePoint } from './layout.ts';

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
/** A point `side * d` metres off the line at `s`: +1 is the side ./rail.ts's `besideLine` calls +1. */
const beside = (l: Line, s: number, side: number, d: number) => {
  lineAt(l, s, P);
  return { x: P.x - P.uz * side * d, z: P.z + P.ux * side * d, ux: P.ux, uz: P.uz, y: railY(l, s) };
};

/** Numbers for the moves. The glide's are docs/research/botw-glide-target.md's proposed curves. */
export const MOVE = {
  second: 6.8, // m/s: the air jump sets vy to at least this, and never adds to a bigger rise
  secondSteer: 25, // m/s²: air steering through the second arc
  secondTurn: 0.7, // how much of the way to the stick the second jump turns you at once
  apexSpeed: 1.6, // m/s: the same float near the top as the first jump
  hookRange: 24, // m, to the ring
  hookCone: 25, // degrees off the middle of the view
  hookCruise: 16, // m/s
  hookAccel: 60, // m/s²
  hookBrake: 70, // m/s²
  hookExitH: 9.5, // m/s: what a cancelled pull keeps
  hookExitUp: 3,
  glideSpeed: 10, // m/s at full stick. A proposed target: TotK measured 9.7; BotW's forward speed has no measurement
  glideSink: 3.2, // m/s down, moving or not: the one number BotW has a measurement for
  glideAccel: 18, // m/s², rest to full stick
  glideBrake: 12, // m/s², stick let go: stops in about 0.83 s
  glideOver: 8, // m/s²: faster than the glide's speed (off a train, say) settles down, with no boost in it
  glideTurnTau: 0.12, // s
  glideTurnMax: Math.PI * 2, // rad/s
  glideDeploy: 0.1, // s from whatever you were falling at to the sink, with no overshoot
};

export type TechId = 'jump' | 'hook' | 'glide';
export type GateId = 'quarry' | 'sea';
export type Pad = {
  id: string;
  x: number;
  z: number;
  top: number;
  hx: number; // half its size
  hz: number;
  look: 'stone' | 'float' | 'wood';
  ring?: string; // a hook ring pulls you here: the pad, or the place, whose side of this pad it stands on
};

// ---------------------------------------------------------------- the two pillars the lines reach
// Each stands beside where the trestle will go, with a stone lip reaching for it. You see one from the bridge below on your
// first walk; you can't get to it until the line does.
const N = LINES.north,
  E = LINES.east;
// Translate the existing course rigidly to clear the wide panel magazines. The hook pillar and its walk stand out by the
// up track's 4 m too (generic-lines step 2; orchestrator, 10 November), so the course keeps its shape beside the
// wider formation: the deck edge, the walk and the pillar keep their gaps.
const P1 = beside(N, 92, -1, 10.2),
  P2 = beside(E, 89.5, -1, 7 - UP_LAT),
  STACK_RETURN = beside(E, 477, 1, 5);
export const PILLARS = [
  // p1's lip ends at the trestle deck's edge (both tracks' formation, 7.6 m wide), not through its planks.
  { id: 'p1', x: P1.x, z: P1.z, top: P1.y, r: 3.6, foot: -3, lipTo: beside(N, 92, -1, 1.8 - UP_LAT) },
  { id: 'p2', x: P2.x, z: P2.z, top: P2.y + 2.2, r: 3.6, foot: -3, lipTo: null },
];

/** Local construction view: the lip can join once accepted track (ten of line one's twelve stock units) and the
 * entire machine have passed. */
export const p1LipClear = (unitsLaid: number, machineZ: number) =>
  unitsLaid >= 10 && machineZ > Math.max(PILLARS[0]!.z, PILLARS[0]!.lipTo!.z) + 1.2 + 25;

export const PADS: Pad[] = [
  { id: 'p1', x: P1.x, z: P1.z, top: P1.y, hx: 3.4, hz: 3.4, look: 'stone' },
  // Keep the old reward's ID and array slot; it now finishes the optional eight-jump course.
  { id: 'p1-block', x: P1.x - 32.4, z: P1.z + 32, top: P1.y, hx: 3, hz: 3, look: 'stone' },
  { id: 'p2', x: P2.x, z: P2.z, top: P2.y + 2.2, hx: 3.4, hz: 3.4, look: 'stone', ring: 't0' },
  // Up Needle Bell, one turn round the rock: slabs that hang in the air, as the old things do. About 22 m a pull.
  { id: 't0', x: 8, z: 8, top: 24, hx: 3, hz: 3, look: 'float', ring: 'p2' },
  { id: 't1', x: -7.6, z: -1, top: 37, hx: 3, hz: 3, look: 'float', ring: 't0' },
  { id: 't2', x: -7.6, z: -19, top: 50, hx: 3, hz: 3, look: 'float', ring: 't1' },
  { id: 't3', x: 8, z: -28, top: 63, hx: 3, hz: 3, look: 'float', ring: 't2' },
  { id: 't4', x: 23.6, z: -19, top: 76, hx: 3, hz: 3, look: 'float', ring: 't3' },
  { id: 't5', x: 23.6, z: -1, top: 89, hx: 3, hz: 3, look: 'float', ring: 't4' },
  { id: 'summit', x: 15, z: -6, top: 102.4, hx: 5, hz: 4, look: 'wood', ring: 't5' },
  // The tower's one side trip: a slab round from t3, with its crate and ring in view.
  { id: 'nook', x: -6, z: -30, top: 63, hx: 2.4, hz: 2.4, look: 'float', ring: 't3' },
  // Gate 1's ledge at the quarry: 2.2 m, past one jump and inside two.
  { id: 'apron', x: 99, z: 44, top: 26.2, hx: 3.6, hz: 3.6, look: 'stone' },
  // Secrets.
  // 20.0: out of one sprinting jump (peaks about 18.2 m), inside two from beside it (ground 17.46 at the approach).
  { id: 'lookout', x: -134, z: -119, top: 20, hx: 2, hz: 2, look: 'stone' },
  // Keep the original bank approach north of the slab, so its underside cannot mask the ring.
  { id: 'alcove', x: -40, z: -80.5, top: 12, hx: 2.2, hz: 1.6, look: 'wood', ring: 'bridge' },
  { id: 'loft', x: 110.5, z: 64, top: 28.4, hx: 2.4, hz: 2.8, look: 'stone', ring: 'camp' },
  { id: 'balcony', x: -122, z: 36, top: 24.4, hx: 3, hz: 3, look: 'wood' },
  { id: 'stack', x: 326.8, z: -123.4, top: 15, hx: 3.6, hz: 3.6, look: 'stone' },
  // A hook back up from the sea stack, meeting the trestle. Append so existing presence ring indices stay stable.
  {
    id: 'stack-return',
    x: STACK_RETURN.x,
    z: STACK_RETURN.z,
    top: STACK_RETURN.y + 0.2,
    hx: 2,
    hz: 2,
    look: 'float',
    ring: 'stack',
  },
  // Broad landings, 10 m of clear air between edges. Append to preserve existing ring indices.
  { id: 'j1', x: P1.x - 16.4, z: P1.z, top: P1.y, hx: 3, hz: 3, look: 'stone' },
  { id: 'j2', x: P1.x - 32.4, z: P1.z, top: P1.y, hx: 3, hz: 3, look: 'stone' },
  { id: 'j3', x: P1.x - 48.4, z: P1.z, top: P1.y, hx: 3, hz: 3, look: 'stone' },
  { id: 'j4', x: P1.x - 64.4, z: P1.z, top: P1.y, hx: 3, hz: 3, look: 'stone' },
  { id: 'j5', x: P1.x - 64.4, z: P1.z + 16, top: P1.y, hx: 3, hz: 3, look: 'stone' },
  { id: 'j6', x: P1.x - 64.4, z: P1.z + 32, top: P1.y, hx: 3, hz: 3, look: 'stone' },
  { id: 'j7', x: P1.x - 48.4, z: P1.z + 32, top: P1.y, hx: 3, hz: 3, look: 'stone' },
  // Far Head: a broad, ramp-accessed launch overlooking the newly built route home.
  { id: 'glide-home', x: 367, z: -169, top: 32.3, hx: 5, hz: 5, look: 'stone' },
];
export const padById = (id: string) => PADS.find((p) => p.id === id)!;
/** Optional sprint/double-jump loop, from the unchanged device to its existing personal reward. */
export const JUMP_COURSE = ['p1', 'j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'p1-block'].map(padById);
const jumpReturnX = P1.x - 10.4;
/** Dry catch ribbon: below two-jump height, with a walkable ramp back to the start. Local static geometry. */
export const JUMP_RECOVERY = {
  top: P1.y - 3.4,
  returnX: jumpReturnX,
  slabs: [
    { x: P1.x - 32.5, z: P1.z, hx: 35.9, hz: 4 },
    { x: P1.x - 64.4, z: P1.z + 16, hx: 4, hz: 12 },
    { x: P1.x - 38.6, z: P1.z + 32, hx: 29.8, hz: 4 },
    // Keep the lower return west of the railway; its earlier x=0 lane crossed the laid deck.
    { x: jumpReturnX, z: P1.z + 19.9, hx: 1.6, hz: 8.1 },
    // A first-gap miss can round the pillar without walking into its solid column.
    { x: jumpReturnX, z: P1.z + 6.3, hx: 1.6, hz: 2.3 },
    { x: P1.x - 6.8, z: P1.z + 10.2, hx: 5.2, hz: 1.6 },
    { x: P1.x, z: P1.z + 9.4, hx: 1.6, hz: 0.8 },
  ],
  // The top face rises northward: high at z−hz, low at z+hz.
  ramp: { x: P1.x, z: P1.z + 6.65, hx: 1.6, hz: 3.55, low: P1.y - 3.4, high: P1.y },
};
const RING_FACES: Record<string, { x: number; z: number }> = { bridge: { x: -48, z: -83 }, camp: { x: 102, z: 69 } };
/** Where a pad's ring hangs: a bit over head height, near the side you come from but off to one side of your way in, so nothing
 * stands between you and it, and its post isn't in your way as you land. */
export const ringAt = (p: Pad) => {
  // The top's hangs off its east side, where you can see it from the last slab below, with no deck in the way.
  if (p.id === 'summit') return { x: p.x + p.hx + 2.2, z: p.z - 1, y: p.top + 2.4 };
  const o = RING_FACES[p.ring ?? ''] ?? PADS.find((q) => q.id === p.ring) ?? p;
  const dx = o.x - p.x,
    dz = o.z - p.z,
    d = Math.hypot(dx, dz) || 1;
  const c = Math.cos(0.95),
    s = Math.sin(0.95);
  const ux = (dx * c - dz * s) / d,
    uz = (dx * s + dz * c) / d;
  // To the pad's own edge, along that way.
  const k = Math.min(p.hx / Math.max(Math.abs(ux), 0.01), p.hz / Math.max(Math.abs(uz), 0.01)) - 0.25;
  return { x: p.x + ux * k, z: p.z + uz * k, y: p.top + 3.1 };
};

/** The devices. `pad`: what you stand on to take it; `from`: which way the show faces you. */
export const DEVICES: Record<TechId, { pad: string; x: number; z: number; y: number }> = {
  jump: { pad: 'p1', x: P1.x - 1.5, z: P1.z - 1.6, y: P1.y },
  // Approach from the railway faces the first floating slab instead of the village behind you.
  hook: { pad: 'p2', x: P2.x + 1, z: P2.z - 1.2, y: P2.y + 2.2 },
  glide: { pad: 'glide-home', x: 369, z: -169, y: 32.3 },
};
export const GLIDE_RAMP = { x: 367, z: -154, hx: 3, hz: 10, low: 24.3, high: 32.3 };
export const SEA_SWITCH = { x: 11.8, z: -6, y: 102.4 };

// ---------------------------------------------------------------- the two gates on the line
// A slab across the track bed where the next stretch would go, so you can see why the machine stopped.
export const GATES: Record<GateId, { s: number; x: number; z: number; y: number; yaw: number }> = {
  quarry: slabAt(186),
  sea: slabAt(297),
};
/** A gate spans both tracks (generic-lines step 2; orchestrator, 10 November): centred 2 m left, between them, and
 * 4 m wider than the single track's 6.4 m slab. Jambs stand outside it. */
export const GATE_SLAB = { w: 6.4 - UP_LAT, h: 5.4, d: 0.9, pillar: 1.1 } as const;
function slabAt(s: number) {
  lineAt(E, s, P);
  const l = UP_LAT / 2;
  return { s, x: P.x - P.uz * l, z: P.z + P.ux * l, y: railY(E, s) - 0.3, yaw: Math.atan2(P.ux, P.uz) };
}
/** The lever on the apron, and the winch its chain runs to. */
export const LEVER = { x: 97.4, z: 42.2, y: 26.2 };

export type RoutePoint = { x: number; z: number; y: number };
const apron = padById('apron');
/** Route v2's service routes (4026d5cd), drawn by the production railway from accepted Q2/Q3 completions.
 * Three metres clear; the hook approach turns outside the pillar before rising alongside it. */
export const SERVICE_ROUTES = {
  quarry: [
    { x: apron.x, z: apron.z + apron.hz + 9, y: apron.top - 2.2 },
    { x: apron.x, z: apron.z + apron.hz, y: apron.top },
  ],
  hook: [
    // Runs alongside the trestle deck (both tracks' 7.6 m formation, its edge 5.8 m left) with its 3 m of stone butting the
    // deck's edge, not through its planks, so you step on from anywhere along it: flush with the deck's top on the grade.
    // It rises round p2's far side from t0 (down the line, then behind the pillar), every point more than two jumps
    // from t0 so t0 still needs the hook (review of generic-lines step 2; test/hook-walk-t0.test.ts). It is level for its
    // last 3 m before turning back: the next deck's inner half lies over this one, so a rise there is a ledge across the
    // walk (the ledge rule of dev/level/timber-track.ts).
    beside(E, 92, -1, 3.4 - UP_LAT),
    beside(E, 88, -1, 3.4 - UP_LAT),
    beside(E, 84, -1, 3.4 - UP_LAT),
    { x: P2.x - 5.9, z: P2.z - 2, y: P2.y + 1.5 },
    { x: P2.x - 5.9, z: P2.z - 5, y: P2.y + 1.5 },
    { x: P2.x - 2, z: P2.z - 3, y: P2.y + 2.2 },
  ],
} satisfies Record<string, RoutePoint[]>;
export const SERVICE_WIDTH = 3;
/** The hook walk's first points (alongside the deck, then the turn) sit flush with the track's walkable top, 0.1 m over rail height. */
export const HOOK_FLUSH = { points: 3, top: 0.1 };
/** Dark stone posts from the sea gate back towards the tower: light runs along them when its summit wakes. */
export const POSTS: { x: number; z: number }[] = [];
{
  const g = GATES.sea,
    to = { x: 26, z: -8 },
    n = 14;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    POSTS.push({ x: g.x + (to.x - g.x) * t + 3.4 * (k % 2 ? 1 : -1), z: g.z + (to.z - g.z) * t });
  }
}

// ---------------------------------------------------------------- secrets: optional, on paths you've walked
export type SecretId =
  'yard' | 'block' | 'lookout' | 'bell' | 'alcove' | 'firstpull' | 'nook' | 'loft' | 'balcony' | 'stack';
export type Secret = {
  id: SecretId;
  gift: string; // ./gifts.ts: what's in the box
  area: string;
  how: 'walk' | 'jump' | 'hook' | 'glide';
  x: number;
  z: number;
  y: number | null; // null: on the ground
  /** When you've gone on past it, and a box for it turns up at the hub if you missed it. */
  after: 'hook' | 'glide' | 'trains' | 'ended';
  /** Where the bot starts from to fetch it, with real input. */
  from: { x: number; z: number; y?: number };
};
const top = (id: string) => padById(id).top;
export const SECRETS: Secret[] = [
  {
    id: 'yard',
    gift: 'strawhat',
    area: 'village',
    how: 'walk',
    x: -127.5,
    z: 25.5,
    y: null,
    after: 'hook',
    from: { x: -120, z: 25.5 },
  },
  {
    id: 'block',
    gift: 'lampcap',
    area: 'timber',
    how: 'jump',
    x: padById('p1-block').x,
    z: padById('p1-block').z,
    y: top('p1-block'),
    after: 'hook',
    from: { x: P1.x + 1.4, z: P1.z + 0.8, y: P1.y },
  },
  {
    id: 'lookout',
    gift: 'mossscarf',
    area: 'timber',
    how: 'jump',
    x: -134,
    z: -119,
    y: top('lookout'),
    after: 'hook',
    from: { x: -137, z: -117 }, // ground 17.46, two jumps under the raised top (the old (-131, -124) is 2.99 m below)
  },
  {
    id: 'bell',
    gift: 'whistle',
    area: 'timber',
    how: 'walk',
    x: -36.4,
    z: -78,
    y: null,
    after: 'hook',
    from: { x: -40.5, z: -86 },
  },
  {
    id: 'alcove',
    gift: 'goggles',
    area: 'timber',
    how: 'hook',
    x: -40,
    z: -80.5,
    y: top('alcove'),
    after: 'glide',
    from: { x: -41, z: -84 },
  },
  {
    id: 'firstpull',
    gift: 'bucket',
    area: 'tower',
    how: 'hook',
    x: 8,
    z: 9.5,
    y: top('t0') + 1,
    after: 'glide',
    from: { x: P2.x, z: P2.z, y: P2.y + 2.2 },
  },
  {
    id: 'nook',
    gift: 'pennant',
    area: 'tower',
    how: 'hook',
    x: -4.8,
    z: -29,
    y: top('nook') + 1,
    after: 'trains',
    from: { x: 8, z: -28, y: 63 },
  },
  {
    id: 'loft',
    gift: 'hardhat',
    area: 'quarry',
    how: 'hook',
    x: 110.5,
    z: 64,
    y: top('loft'),
    after: 'trains',
    from: { x: 103.5, z: 68 },
  },
  {
    id: 'balcony',
    gift: 'aviator',
    area: 'village',
    how: 'glide',
    x: -122,
    z: 36,
    y: top('balcony'),
    after: 'trains',
    from: { x: 18, z: -6, y: 102.4 },
  },
  {
    id: 'stack',
    gift: 'diving',
    area: 'Far Head',
    how: 'glide',
    x: 326.8,
    z: -123.4,
    y: top('stack'),
    after: 'ended',
    from: { x: beside(E, 470, 0, 0).x, z: beside(E, 470, 0, 0).z, y: 24.3 },
  },
];
/** Where the boxes for what you missed stand: the finders' bay across the path from the wardrobe, in the village. */
export const FINDERS = { x: -104, z: 7, yaw: Math.PI / 2 };
