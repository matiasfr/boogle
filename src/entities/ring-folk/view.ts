// The island's folk (docs/plans/ring-island-build1.md, R4e): six crew in orange hard hats on the staring rota, four of them
// leaning back at the shard over the square while two rest, Hooter by the board whose whistle swaps them every 45 s, a nod
// at a player who stands still and looks up, and Talk with Rivet, Squint and Hooter. Local, drawn by the village folk kit
// (place/folk.ts: the figures, their walk and their shadows; this file places, moves and leans them, the way the greeter
// is directed). The rota is a pure function of the railway room tick (shape.ts `shiftAt`), so every page swaps on the
// same whistle with no state and no message; the whistle plays from the clock's edge, never on a first read or a restore.
// Mounted by the works seam (railway/works-live.ts) beside the Meet; reads the Aperture row and the accounts through
// `adapter.read.world()`, re-read at the head of every entry point; keeps nothing from a world.
import * as THREE from 'three/webgpu';
import { angleLerp } from '../../math.ts';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { conversation } from '../../player/conversation.ts';
import { cam, me } from '../../player/player.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { accounts, aperture } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { createFirstReady } from '../railway/first-ready.ts';
import { createSeen } from '../railway/ability-arrival.ts';
import { railwayGlideOpen } from '../railway/glide.ts';
import { ringIslandNear } from '../ring-island/state.ts';
import { ringUV } from '../ring-meet/shape.ts';
import {
  CREW,
  HOOTER_UV,
  LEAN_UP,
  NOD,
  POST_UV,
  RIVET_CREW,
  SQUARE_UV,
  SQUINT_CREW,
  WET_S,
  YARD_Y,
  glidingTheGap,
  linesFor,
  lookingUp,
  newNod,
  nodLean,
  nodder,
  shiftAt,
  shiftChange,
  standingUV,
  stationOf,
  stepNod,
  swamToIsland,
  waypoints,
  walkStep,
  worldOf,
  type Facts,
  type Station,
  type UV,
} from './shape.ts';

type Who = 'rivet' | 'squint' | 'hooter';
type Kit = typeof import('../../place/folk.ts');
type Guy = ReturnType<Kit['addLooker']>;
type Figure = { guy: Guy; uv: UV; route: UV[]; station: Station | null; lean: number };

const ORANGE = ['#e8742c', '#f08a3a', '#d8641c', '#e8742c'];
const LOOK_COLOR = { rivet: '#f0c030', squint: '#e8742c', hooter: '#3f8ee0' } as const;
/** Talk reach (m), as the greeter's. */
const TALK_REACH = 3.3;
const MEM_GLIDED = 'glided',
  MEM_SWAM = 'swam';
const voice = (baseHz: number, formantScale: number) => ({
  baseHz,
  rangeSemis: 3,
  formantScale,
  brightnessHz: 4200,
  cps: 34,
  grainMs: [55, 85] as [number, number],
  vowels: [0.3, 0.15, 0.2, 0.25, 0.1] as const,
});
const NAMES: Record<Who, string> = { rivet: 'Rivet', squint: 'Squint', hooter: 'Hooter' };
const VOICES: Record<Who, ReturnType<typeof voice>> = {
  rivet: voice(210, 1.05),
  squint: voice(300, 1.2),
  hooter: voice(170, 0.95),
};

export function createRingFolk(adapter: RailwayAdapter, owner: OwnedView) {
  const firstReady = createFirstReady(adapter.read.ready);
  const memory = createSeen('boogle.ring-folk.v0');
  let kit: Kit | null = null,
    talk: typeof import('../../place/talk.ts') | null = null,
    crew: Figure[] = [],
    hooter: Figure | null = null,
    lastShift: number | null = null,
    wasMounted = false,
    whistled = 0,
    lastSwim = -1e9,
    nodCrew = -1,
    nodT = 0,
    speaking: Who | null = null;
  const cursor: Record<Who, number> = { rivet: 0, squint: 0, hooter: 0 };
  const nod = newNod();
  const stats = { whistles: 0, nods: 0, snaps: 0 };

  void Promise.all([import('../../place/folk.ts'), import('../../place/talk.ts')]).then(([k, t]) => {
    if (!owner.alive) return;
    kit = k;
    talk = t;
    crew = Array.from({ length: CREW }, (_, c) => {
      const color = c === RIVET_CREW ? LOOK_COLOR.rivet : c === SQUINT_CREW ? LOOK_COLOR.squint : ORANGE[c % 4]!;
      return figure(k, standingUV(stationOf(c, 0)), color);
    });
    hooter = figure(k, HOOTER_UV, LOOK_COLOR.hooter);
    for (const f of [...crew, hooter]) f.guy.on = false;
    owner.cleanup(() => {
      if (speaking) t.endTalk();
      for (const f of [...crew, hooter!]) {
        const i = k.folk.guys.indexOf(f.guy);
        if (i >= 0) k.folk.guys.splice(i, 1);
      }
      crew = [];
      hooter = null;
    });
  });

  function figure(k: Kit, uv: UV, color: string): Figure {
    const w = worldOf(uv),
      c = worldOf(SQUARE_UV);
    const guy = k.addLooker(w.x, YARD_Y, w.z, Math.atan2(c.x - w.x, c.z - w.z), color);
    return { guy, uv: { ...uv }, route: [], station: null, lean: 0 };
  }
  const place = (f: Figure) => {
    const w = worldOf(f.uv);
    f.guy.x = w.x;
    f.guy.z = w.z;
    f.guy.fy = YARD_Y;
  };
  const faceSquare = (f: Figure, dt: number, k = 5) => {
    const w = worldOf(f.uv),
      c = worldOf(SQUARE_UV);
    f.guy.yaw = angleLerp(f.guy.yaw, Math.atan2(c.x - w.x, c.z - w.z), Math.min(1, dt * k));
  };
  const facePlayer = (f: Figure, dt: number) => {
    const p = me.body?.position;
    if (p) f.guy.yaw = angleLerp(f.guy.yaw, Math.atan2(p.x - f.guy.x, p.z - f.guy.z), Math.min(1, dt * 6));
  };
  const near = (f: Figure, r: number) => {
    const p = me.body?.position;
    return !!p && Math.hypot(p.x - f.guy.x, p.z - f.guy.z) < r && Math.abs(p.y - YARD_Y) < 3;
  };

  /** Everyone to where the clock says they stand, no walk and no whistle. */
  function snap(shift: number) {
    for (let c = 0; c < crew.length; c++) {
      const f = crew[c]!,
        s = stationOf(c, shift);
      f.station = s;
      f.route = [];
      f.uv = { ...standingUV(s) };
      f.lean = s.kind === 'post' ? LEAN_UP : 0;
      place(f);
      faceSquare(f, 1, 100);
    }
    nodCrew = -1;
    stats.snaps++;
  }
  /** The whistle: Hooter blows, and whoever's station changed walks to the new one. */
  function swap(shift: number) {
    for (let c = 0; c < crew.length; c++) {
      const f = crew[c]!,
        s = stationOf(c, shift);
      if (f.station && f.station.kind === s.kind && f.station.slot === s.slot) continue;
      f.route = waypoints(f.uv, standingUV(s));
      f.station = s;
    }
    if (hooter) {
      const w = worldOf(hooter.uv);
      whistle(w.x, w.z);
      whistled = 1.6;
    }
    stats.whistles++;
  }

  function facts(): Facts {
    const wd = adapter.read.world();
    return {
      joined: !!line2Trains(wd) && aperture(wd).joined >= 0,
      wet: performance.now() - lastSwim < WET_S * 1000,
      glided: memory.has(MEM_GLIDED),
      swam: memory.has(MEM_SWAM),
      // The Meet's own memory (ring-meet/view.ts `PULLED_OUT`), read fresh: its view writes it, not this one.
      rode: createSeen('boogle.ring-meet.v0').has('crossing'),
      players: accounts(wd).length,
    };
  }
  /** What the local player has done that Squint and Rivet remember: a swim, a glide over the gap. */
  function remember() {
    const p = me.body?.position;
    if (!p) return;
    const r = ringUV(p.x, p.z),
      uv = { u: r.u / 100, lat: r.lat / 100 };
    if (me.swimming) {
      lastSwim = performance.now();
      if (swamToIsland(uv)) memory.add(MEM_SWAM);
    }
    if (railwayGlideOpen() && glidingTheGap(uv)) memory.add(MEM_GLIDED);
  }

  function restore() {
    lastShift = null;
    nodCrew = -1;
  }

  return {
    restore,
    update(dt: number) {
      remember();
      if (!kit || !hooter) return;
      // The clock is read here, at the head; no world is kept between calls.
      const mounted = ringIslandNear.mounted && firstReady();
      for (const f of [...crew, hooter]) f.guy.on = mounted;
      if (!mounted) {
        wasMounted = false;
        return;
      }
      const shift = shiftAt(adapter.read.tick());
      // A remount (the camera came back within range) is a first look: no whistle for a swap you didn't see.
      const change = wasMounted ? shiftChange(lastShift, shift) : 'snap';
      wasMounted = true;
      if (change === 'snap') snap(shift);
      else if (change === 'whistle') swap(shift);
      lastShift = shift;

      // The nod: the nearest figure on a post, for a player standing still within 8 m and looking up.
      const p = me.body?.position,
        v = me.body?.velocity;
      const posted = crew.map((f) =>
        f.station?.kind === 'post' && !f.route.length ? { x: f.guy.x, z: f.guy.z } : null,
      );
      const who = p ? nodder(p, posted) : -1;
      const still = !!v && Math.hypot(v.x, v.z) < NOD.still && !me.swimming && !conversation.open;
      if (stepNod(nod, dt, { near: who >= 0, still, up: lookingUp(cam.pitch) }) && nodCrew < 0) {
        nodCrew = who;
        nodT = 0;
        stats.nods++;
      }
      if (nodCrew >= 0 && (nodT += dt) >= NOD.seconds) nodCrew = -1;

      for (let c = 0; c < crew.length; c++) {
        const f = crew[c]!,
          g = f.guy,
          was = worldOf(f.uv);
        const walking = f.route.length > 0 && walkStep(f.uv, f.route, dt);
        place(f);
        const talking =
          speaking !== null && c === (speaking === 'rivet' ? RIVET_CREW : speaking === 'squint' ? SQUINT_CREW : -1);
        let target = f.station?.kind === 'post' && !walking && !f.route.length ? LEAN_UP : 0;
        if (walking) {
          g.mood = 'walk';
          g.yaw = angleLerp(g.yaw, Math.atan2(g.x - was.x, g.z - was.z), Math.min(1, dt * 10));
        } else {
          g.mood = 'idle';
          if (talking) facePlayer(f, dt);
          else if (c === nodCrew) facePlayer(f, dt);
          else if (f.station?.kind === 'rest' && near(f, 5)) facePlayer(f, dt);
          else faceSquare(f, dt);
        }
        if (talking) target = 0;
        f.lean += (target - f.lean) * (1 - Math.exp(-dt * 6));
        g.lean = c === nodCrew && !talking ? nodLean(nodT) : f.lean;
      }
      // Hooter: by the board, never looking up; a wave with the whistle; turns to a player nearby.
      whistled = Math.max(0, whistled - dt);
      hooter.guy.mood = whistled > 0 ? 'wave' : 'idle';
      hooter.guy.lean = 0;
      place(hooter);
      if (near(hooter, 6) || speaking === 'hooter') facePlayer(hooter, dt);
      else faceSquare(hooter, dt);
      talk?.updateTalkCard();
    },
    /** Nothing here plays from an accepted edge: the rota is the clock's. */
    accepted() {},
    corrected() {},
    /** Talk with Rivet, Squint or Hooter, the nearest within reach. */
    targets(): Interactable[] {
      const p = me.body?.position;
      if (!p || !kit || !hooter || !ringIslandNear.mounted || !adapter.read.ready() || conversation.open) return [];
      const talkers: [Who, Figure][] = [
        ['rivet', crew[RIVET_CREW]!],
        ['squint', crew[SQUINT_CREW]!],
        ['hooter', hooter],
      ];
      let best: [Who, Figure] | null = null,
        bestD = TALK_REACH;
      for (const t of talkers) {
        const d = Math.hypot(p.x - t[1].guy.x, p.z - t[1].guy.z);
        if (d < bestD && Math.abs(p.y - YARD_Y) < 3) {
          bestD = d;
          best = t;
        }
      }
      if (!best) return [];
      const [who, f] = best;
      return [
        {
          id: `ring-talk-${who}`,
          verb: 'Talk',
          at: new THREE.Vector3(f.guy.x, YARD_Y + 1.5, f.guy.z),
          run: () => open(who, f),
        },
      ];
    },
    inspect: () => ({
      folkView: {
        shift: lastShift,
        whistles: stats.whistles,
        nods: stats.nods,
        snaps: stats.snaps,
        nodding: nodCrew,
        posts: POST_UV.length,
        crew: crew.map((f) => ({
          at: f.station ? `${f.station.kind}${f.station.slot}` : null,
          walking: f.route.length > 0,
          lean: Math.round(f.guy.lean * 100) / 100,
        })),
      },
    }),
  };

  function open(who: Who, f: Figure) {
    if (!talk) return;
    const lines = linesFor(who, facts());
    const n = cursor[who]++;
    const w = { name: NAMES[who], x: f.guy.x, z: f.guy.z, color: LOOK_COLOR[who], voice: VOICES[who] };
    if (
      talk.startTalk(w, { say: lines[n % lines.length]!, answers: [{ label: 'Bye', then: () => null }] }, () => {
        speaking = null;
      })
    )
      speaking = who;
  }
}
