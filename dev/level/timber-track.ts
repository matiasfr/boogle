// Timber decks against the laid track: no wood platform, ramp, bridge or deck may pass through a rail, sleeper or trestle
// plank of either line (the whole planned track of line 1 and line 2, as the game's own buildTrack settles it), at the
// state where both exist. Pure geometry from the same source functions the game builds from; no browser or physics.
// The track layer's own swept clearance against these decks is dev/level/machine-clearance.ts (it reads `timberDecks`).
import * as THREE from 'three/webgpu';
import { sourceFunction } from './source.ts';
import { PLAYER_R } from '../../src/constants.ts';
import { trackBoxes } from './grounding-track.ts';
import {
  CROSSING_WIDTH,
  FORMATION,
  HALTS,
  LINKS,
  ORIGIN,
  PATHS,
  UP_HALTS,
  crossingPlanks,
  lineAt,
  railY,
  upLat,
  type Line,
} from '../../src/place/layout.ts';
import { SHORE_COAST, SHORE_LANDING } from '../../src/place/shore-layout.ts';
import { openingStops } from '../../src/place/opening-stops.ts';
import {
  GATES,
  GATE_SLAB,
  GLIDE_RAMP,
  JUMP_COURSE,
  JUMP_RECOVERY,
  PADS,
  PILLARS,
  SERVICE_ROUTES,
  SERVICE_WIDTH,
  HOOK_FLUSH,
  padById,
} from '../../src/place/tech-layout.ts';
import { forgePlan, openingBuildings } from '../../src/place/opening-plans.ts';
import { frameBesideLine, stationColliders, stationStockCollider } from '../../src/place/spatial-station.ts';
import type { Box } from '../../src/render/box-plan.ts';
import { H } from '../../src/place/terrain.ts';

export type Deck = { id: string; owner: string; center: THREE.Vector3; axes: THREE.Vector3[]; half: number[] };

const rotated = (
  center: THREE.Vector3,
  q: THREE.Quaternion,
  w: number,
  h: number,
  d: number,
): Omit<Deck, 'id' | 'owner'> => ({
  center,
  axes: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)].map((v) =>
    v.applyQuaternion(q),
  ),
  half: [w / 2, h / 2, d / 2],
});

/** A solid box between two world points, as land.ts `plank` and `slab` lay it: the top meets topA..topB at the ends. */
export function between(
  id: string,
  owner: string,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  topA: number,
  topB: number,
  width: number,
  thick: number,
): Deck {
  const dx = bx - ax,
    dz = bz - az,
    dy = topB - topA,
    len = Math.hypot(dx, dz),
    full = Math.hypot(len, dy);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(dy, len), Math.atan2(dx, dz), 0, 'YXZ'));
  return {
    id,
    owner,
    ...rotated(new THREE.Vector3((ax + bx) / 2, (topA + topB) / 2 - thick / 2, (az + bz) / 2), q, width, thick, full),
  };
}

/** A base-standing unit box under `local` (box-plan.ts `place`), as an oriented box. */
function fromBox(id: string, owner: string, box: Box): Deck {
  const pos = new THREE.Vector3(),
    quat = new THREE.Quaternion(),
    scale = new THREE.Vector3();
  box.local.decompose(pos, quat, scale);
  const up = new THREE.Vector3(0, scale.y / 2, 0).applyQuaternion(quat);
  return {
    id,
    owner,
    ...rotated(new THREE.Vector3(box.x, box.y, box.z).add(pos).add(up), quat, scale.x, scale.y, scale.z),
  };
}

/** A base-standing box with a yaw, as the opening stops and halts place theirs. */
export function standing(
  id: string,
  owner: string,
  x: number,
  base: number,
  z: number,
  w: number,
  h: number,
  d: number,
  yaw: number,
): Deck {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return { id, owner, ...rotated(new THREE.Vector3(x, base + h / 2, z), q, w, h, d) };
}

/** A service route's points as line2-view.ts draws them: the hook walk's first points lifted flush with the plank top. */
function servicePoints(kind: keyof typeof SERVICE_ROUTES) {
  return SERVICE_ROUTES[kind].map((p, i) => ({
    ...p,
    y: p.y + (kind === 'hook' && i < HOOK_FLUSH.points ? HOOK_FLUSH.top : 0),
  }));
}

const SERVICE_THICK = 0.35; // line2-view.ts: each walkway deck is a 0.35 m thick box
const SERVICE_OVER = 0.2; // ... `length + 0.4`: 0.2 m past each end
/** The highest edge a walker still rides over (before 10 November the hook walk's corners stood 0.22 m proud and were walked; the 0.73 m ledge stopped the bot). */
const LEDGE_M = 0.3;

/**
 * Ledge rule for service walkways: walking a route's centreline, no deck (the next one, where the route turns back over
 * itself, or any other) may stand more than LEDGE_M above the deck underfoot, inside the walker's footprint and not overhead.
 */
export function checkServiceLedges() {
  const ledges: { route: string; deck: number; over: number; above: number; x: number; z: number }[] = [];
  let samples = 0;
  let routes = 0;
  for (const kind of Object.keys(SERVICE_ROUTES) as (keyof typeof SERVICE_ROUTES)[]) {
    routes++;
    const pts = servicePoints(kind);
    const decks = pts.slice(1).map((b, i) => {
      const a = pts[i]!;
      const run = Math.hypot(b.x - a.x, b.z - a.z);
      const ux = (b.x - a.x) / run,
        uz = (b.z - a.z) / run,
        slope = (b.y - a.y) / run,
        over = SERVICE_OVER / Math.hypot(1, slope);
      return {
        i: i + 1,
        /** The deck's top and its underside straight above (x, z), or null off its footprint. */
        at(x: number, z: number) {
          const t = (x - a.x) * ux + (z - a.z) * uz,
            w = -(x - a.x) * uz + (z - a.z) * ux;
          if (t < -over || t > run + over || Math.abs(w) > SERVICE_WIDTH / 2) return null;
          const top = a.y + slope * t;
          return { top, under: top - SERVICE_THICK * Math.hypot(1, slope) };
        },
      };
    });
    for (let k = 0; k < decks.length; k++) {
      const a = pts[k]!,
        b = pts[k + 1]!,
        n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1);
      const worst = new Map<number, { above: number; x: number; z: number }>();
      for (let j = 0; j <= n; j++) {
        const x = a.x + ((b.x - a.x) * j) / n,
          z = a.z + ((b.z - a.z) * j) / n;
        samples++;
        const feet = decks[k]!.at(x, z)!.top;
        for (const d of decks)
          for (let r = 0; r < 8; r++) {
            const s = d.at(x + PLAYER_R * Math.cos((r * Math.PI) / 4), z + PLAYER_R * Math.sin((r * Math.PI) / 4));
            if (s && s.top - feet > LEDGE_M && s.under < feet + 2 * PLAYER_R) {
              const was = worst.get(d.i);
              if (!was || was.above < s.top - feet) worst.set(d.i, { above: s.top - feet, x: x + ORIGIN.x, z });
              break;
            }
          }
      }
      for (const [deck, w] of worst) ledges.push({ route: kind, deck: k + 1, over: deck, ...w });
    }
  }
  return { level: 'service-ledges', routes, samples, ledgeM: LEDGE_M, failures: ledges.length, ledges };
}

export function timberDecks(): Deck[] {
  const decks: Deck[] = [];
  const path = 'src/entities/railway/path.ts';
  const railFile = 'src/entities/railway/line-geometry.ts';
  const P = { x: 0, z: 0, ux: 0, uz: 1 };
  const besideLine = sourceFunction<(line: Line, s: number, l: number) => { x: number; z: number }>(
    railFile,
    'besideLine',
    {
      P,
      lineAt: (line: Line, s: number) => lineAt(line, s, P),
      lateral: sourceFunction(railFile, 'lateral', { P, ORIGIN }),
    },
  );

  // The walking approaches the track layer's completion opens beside the parked machine (src/entities/railway/path.ts).
  const APPROACH = sourceFunction<{ stops: number[]; width: number; thick: number }>(path, 'APPROACH', {});
  const approachPlanks = sourceFunction<typeof import('../../src/entities/railway/path.ts').approachPlanks>(
    path,
    'approachPlanks',
    {
      APPROACH,
    },
  );
  approachPlanks(LINKS[0]!.line, besideLine as never, railY as never, H).forEach((p, i) =>
    decks.push(between(`approach/${i}`, path, p.ax, p.az, p.bx, p.bz, p.topA, p.topB, APPROACH.width, APPROACH.thick)),
  );

  // The footbridges over the gorge (land.ts buildBridges).
  PATHS.forEach((p, k) => {
    const a = p.pts[p.bridgeAt]!,
      b = p.pts[p.bridgeAt + 1]!;
    decks.push(
      between(
        `footbridge/${k}`,
        'src/place/land.ts',
        a[0] + ORIGIN.x,
        a[1] + ORIGIN.z,
        b[0] + ORIGIN.x,
        b[1] + ORIGIN.z,
        a[2] + 0.12,
        b[2] + 0.12,
        3,
        0.35,
      ),
    );
  });

  // The cove's timber landing.
  if (SHORE_COAST)
    for (let i = 0; i < 12; i++) {
      const x = SHORE_LANDING.x + ORIGIN.x;
      decks.push(
        between(
          `landing/${i}`,
          'src/place/land.ts',
          x - 19 + i * 2,
          SHORE_LANDING.z,
          x - 17.02 + i * 2,
          SHORE_LANDING.z,
          3.08,
          3.08,
          7,
          0.35,
        ),
      );
    }

  // The opening's props (lookout deck, flag, bank cart, arches).
  for (const p of openingStops())
    decks.push(standing(p.id, 'src/place/opening-stops.ts', p.x, p.base, p.z, p.w, p.h, p.d, p.yaw));

  // Route v2's walkways from Q2 and Q3 (src/entities/railway/line2-view.ts draws them 0.35 thick).
  for (const kind of ['hook', 'quarry'] as const) {
    const pts = servicePoints(kind);
    for (let i = 1; i < pts.length; i++)
      decks.push(
        between(
          `service-${kind}/${i}`,
          'src/entities/railway/line2-view.ts',
          pts[i - 1]!.x + ORIGIN.x,
          pts[i - 1]!.z,
          pts[i]!.x + ORIGIN.x,
          pts[i]!.z,
          pts[i - 1]!.y,
          pts[i]!.y,
          SERVICE_WIDTH,
          0.35,
        ),
      );
  }

  // The stations' platforms, shelters and the ramps off them (src/entities/railway/halts-view.ts).
  const at = { x: 0, z: 0, ux: 0, uz: 1 };
  const lateral = (line: Line, s: number, l: number) => {
    lineAt(line, s, at);
    return { x: at.x - at.uz * l + ORIGIN.x, z: at.z + at.ux * l + ORIGIN.z };
  };
  // The up track's platforms too (src/entities/railway/up-platforms.ts), the Quarry's with no ramp off its far end.
  for (const { name, line: which, s0, s1, lat, ...rest } of [...HALTS, ...UP_HALTS]) {
    const endRamp = !('endRamp' in rest) || rest.endRamp;
    const line = LINKS[which]!.line;
    const low = Math.min(railY(line, s0), railY(line, s1)) + 0.72;
    const mid = (s0 + s1) / 2,
      half = (s1 - s0) / 2;
    lineAt(line, mid, at);
    const yaw = Math.atan2(at.ux, at.uz);
    const c = lateral(line, mid, lat);
    const ground = H(c.x, c.z);
    const file = 'src/entities/railway/halts-view.ts';
    decks.push(
      standing(
        `${name}/platform`,
        file,
        c.x,
        Math.min(ground, low - 0.5),
        c.z,
        2.5,
        low - Math.min(ground, low - 0.5),
        half * 2,
        yaw,
      ),
    );
    const sign = Math.sign(lat);
    // The roof slab, 3.2 m up on posts, and the bench, at the platform's back edge (halts-view.ts `shelter`).
    const shelter = -4.8,
      cs = Math.cos(yaw),
      sn = Math.sin(yaw);
    const rx = c.x + -sign * 0.4 * cs + shelter * sn,
      rz = c.z - -sign * 0.4 * sn + shelter * cs;
    decks.push(standing(`${name}/roof`, file, rx, low + 3.2, rz, 2.7, 0.3, 8.4, yaw));
    const ramp = (id: string, from: { x: number; z: number }, to: { x: number; z: number }) =>
      decks.push(between(`${name}/${id}`, file, from.x, from.z, to.x, to.z, H(from.x, from.z) + 0.05, low, 2.5, 0.4));
    ramp('ramp-start', lateral(line, s0 - 6, lat), lateral(line, s0, lat));
    if (endRamp) ramp('ramp-end', lateral(line, s1 + 6, lat), lateral(line, s1, lat));
    ramp('ramp-back', lateral(line, mid, lat + sign * 7), lateral(line, mid, lat + sign * 1.25));
  }
  // The forge, its scaffold and the opening's buildings (opening-plans.ts).
  for (const b of [...openingBuildings(), { id: 'forge', boxes: forgePlan().scaffold }])
    b.boxes.forEach((box, i) => decks.push(fromBox(`${b.id}/${i}`, 'src/place/opening-plans.ts', box)));

  // The station frames, feeders and stock of every stretch of both lines (spatial-station.ts).
  for (const link of LINKS)
    for (const spec of link.stations) {
      const f = frameBesideLine(spec, link.line, link.dir);
      const y = H(f.x, f.z);
      const c = stationColliders(f, y, false);
      for (const p of [...c.frame, c.feeder, stationStockCollider(f, y, y + 3)])
        decks.push(
          standing(
            `${spec.id}/${p.id}`,
            'src/place/spatial-station.ts',
            p.position.x,
            p.position.y - p.shape.hy,
            p.position.z,
            p.shape.hx * 2,
            p.shape.hy * 2,
            p.shape.hz * 2,
            p.yaw,
          ),
        );
    }

  // The jump, hook and glide pads, their columns, the catch ribbon and ramps, and the pillar lip (src/entities/railway/hook-view.ts, tools.ts).
  const tech = 'src/place/tech-layout.ts'; // the pads' data; hook-view.ts and tools.ts draw them
  const pads: {
    id: string;
    x: number;
    z: number;
    top: number;
    hx: number;
    hz: number;
    look: string;
    pitch?: number;
  }[] = [
    ...PADS,
    ...JUMP_RECOVERY.slabs.map((p, i) => ({ ...p, id: `jump-catch-${i}`, top: JUMP_RECOVERY.top, look: 'stone' })),
    ...[JUMP_RECOVERY.ramp, GLIDE_RAMP].map((ramp, i) => ({
      ...ramp,
      id: i ? 'glide-ramp' : 'jump-return',
      top: (ramp.high + ramp.low) / 2,
      hz: Math.hypot(ramp.hz, (ramp.high - ramp.low) / 2),
      pitch: Math.atan2(ramp.high - ramp.low, ramp.hz * 2),
      look: 'stone',
    })),
  ];
  for (const p of pads) {
    const thick = p.look === 'float' ? 0.9 : p.look === 'wood' ? 0.4 : 1.2;
    const x = p.x + ORIGIN.x;
    if (p.pitch) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.pitch, 0, 0));
      const c = new THREE.Vector3(x, p.top - (Math.cos(p.pitch) * thick) / 2, p.z - (Math.sin(p.pitch) * thick) / 2);
      decks.push({ id: `pad/${p.id}`, owner: tech, ...rotated(c, q, p.hx * 2, thick, p.hz * 2) });
    } else decks.push(standing(`pad/${p.id}`, tech, x, p.top - thick, p.z, p.hx * 2, thick, p.hz * 2, 0));
  }
  for (const b of [...JUMP_COURSE.slice(1), padById('apron'), padById('lookout'), padById('loft')]) {
    const base = JUMP_COURSE.includes(b) ? JUMP_RECOVERY.top : H(b.x + ORIGIN.x, b.z) - 0.5;
    const h = b.top - 1.2 - base;
    if (h > 0)
      decks.push(standing(`pad-column/${b.id}`, tech, b.x + ORIGIN.x, base, b.z, b.hx * 2 - 0.1, h, b.hz * 2 - 0.1, 0));
  }
  for (const q of PILLARS)
    if (q.lipTo) {
      const dx = q.lipTo.x - q.x,
        dz = q.lipTo.z - q.z,
        len = Math.hypot(dx, dz);
      decks.push(
        standing(
          `pillar-lip/${q.id}`,
          tech,
          q.x + dx / 2 + ORIGIN.x,
          q.top - 0.54,
          q.z + dz / 2,
          2.4,
          0.5,
          len,
          Math.atan2(dx, dz),
        ),
      );
    }
  // The plank crossings over both tracks at the up platforms (up-platforms.ts): flush with the rail tops, on the sleepers.
  for (const h of UP_HALTS) {
    const line = LINKS[h.line]!.line;
    const top = railY(line, h.crossS) + 0.22;
    lineAt(line, h.crossS, at);
    const yaw = Math.atan2(at.ux, at.uz);
    for (const [l0, l1] of crossingPlanks(
      upLat(FORMATION.quarry, h.crossS - CROSSING_WIDTH / 2) ?? 0,
      upLat(FORMATION.quarry, h.crossS + CROSSING_WIDTH / 2) ?? 0,
      h.crossTo,
    )) {
      const c = lateral(line, h.crossS, (l0 + l1) / 2);
      decks.push(
        standing(
          `${h.name}/crossing/${l0.toFixed(2)}`,
          'src/entities/railway/up-platforms.ts',
          c.x,
          top - 0.12,
          c.z,
          l0 - l1,
          0.12,
          CROSSING_WIDTH,
          yaw,
        ),
      );
    }
  }
  // Both line-2 gates' jambs (src/entities/railway/hook-view.ts): the gates span both tracks since the second track (generic-lines step 2).
  for (const [id, g] of Object.entries(GATES))
    for (const side of [-1, 1]) {
      const px = (side * (GATE_SLAB.w + GATE_SLAB.pillar)) / 2;
      decks.push(
        standing(
          `gate-jamb/${id}/${side}`,
          tech,
          g.x + ORIGIN.x + Math.cos(g.yaw) * px,
          g.y,
          g.z - Math.sin(g.yaw) * px,
          GATE_SLAB.pillar,
          GATE_SLAB.h + 0.8,
          GATE_SLAB.pillar,
          g.yaw,
        ),
      );
    }
  return decks;
}

/** The rail, sleeper and trestle-plank boxes of both lines as oriented boxes: base-standing unit boxes under `local`. */
function trackObbs() {
  const out: Deck[] = [];
  for (const { spec, mode, boxes, kinds } of trackBoxes()) {
    if (mode !== 'continuous') continue;
    boxes.forEach((box, k) => {
      const kind = kinds[k]!;
      if (kind !== 'rail' && kind !== 'sleeper' && kind !== 'plank') return;
      const m = new THREE.Matrix4().copy(box.local);
      const pos = new THREE.Vector3(),
        quat = new THREE.Quaternion(),
        scale = new THREE.Vector3();
      m.decompose(pos, quat, scale);
      const up = new THREE.Vector3(0, scale.y / 2, 0).applyQuaternion(quat);
      out.push({
        id: `${spec.id}/${kind}/${k}`,
        owner: 'src/entities/railway/track.ts',
        ...rotated(new THREE.Vector3(box.x, box.y, box.z).add(pos).add(up), quat, scale.x, scale.y, scale.z),
      });
    });
  }
  return out;
}

/** Penetration depth along the shallowest separating axis, or 0 when the boxes are apart. */
export function penetration(a: Deck, b: Deck) {
  const axes = [...a.axes, ...b.axes];
  for (const u of a.axes) for (const v of b.axes) axes.push(new THREE.Vector3().crossVectors(u, v));
  const d = new THREE.Vector3().subVectors(b.center, a.center);
  let least = Infinity;
  for (const axis of axes) {
    if (axis.lengthSq() < 1e-8) continue;
    axis.normalize();
    const reach = (box: Deck) => box.half.reduce((sum, h, i) => sum + h * Math.abs(box.axes[i]!.dot(axis)), 0);
    least = Math.min(least, reach(a) + reach(b) - Math.abs(d.dot(axis)));
    if (least <= 0) return 0;
  }
  return least;
}

const DEPTH_M = 0.02; // less than this is two faces meeting, not a deck through a rail

export function checkTimberTrack() {
  const decks = timberDecks(),
    track = trackObbs();
  const contacts: { deck: string; owner: string; track: string; depthCm: number; x: number; z: number }[] = [];
  for (const deck of decks) {
    const reach = Math.hypot(...deck.half) + 2;
    for (const piece of track) {
      if (piece.center.distanceTo(deck.center) > reach + Math.hypot(...piece.half)) continue;
      const depth = penetration(deck, piece);
      if (depth > DEPTH_M)
        contacts.push({
          deck: deck.id,
          owner: deck.owner,
          track: piece.id,
          depthCm: depth * 100,
          x: piece.center.x,
          z: piece.center.z,
        });
    }
  }
  const byDeck = new Map<string, (typeof contacts)[number]>();
  for (const c of contacts) if (!byDeck.has(c.deck) || byDeck.get(c.deck)!.depthCm < c.depthCm) byDeck.set(c.deck, c);
  return {
    level: 'timber-track',
    decks: decks.length,
    trackPieces: track.length,
    depthToleranceCm: DEPTH_M * 100,
    failures: byDeck.size,
    contacts: [...byDeck.values()],
    coverage:
      "Footbridges, the cove landing, opening props, the track layer's walking approaches, route v2 service walkways and every station platform, shelter roof and ramp, against every rail, sleeper and trestle plank of line 1 and line 2 as settled. Static geometry; platforms drawn by other code (depot, forge, station frames) are covered by machine-clearance and the spatial audit, not here.",
  };
}
