// The island's folk (docs/plans/ring-island-build1.md, R4e): six crew in orange hard hats on the staring rota, four of them
// standing at their posts facing the shard while two rest, Hooter by the board whose whistle swaps them every 45 s, and Talk with Rivet, Squint and Hooter. Local, drawn by the village folk kit
// (place/folk.ts: the figures, their walk and their shadows; this file places, moves and turns them, the way the greeter
// is directed). The rota is a pure function of the railway room tick (shape.ts `shiftAt`), so every page swaps on the
// same whistle with no state and no message; the whistle plays from the clock's edge, never on a first read or a restore.
// Mounted by the works seam (railway/works-live.ts) beside the Meet; reads the Aperture row and the accounts through
// `adapter.read.world()`, re-read at the head of every entry point; keeps nothing from a world.
import * as THREE from 'three/webgpu';
import { angleLerp } from '../../math.ts';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { conversation } from '../../player/conversation.ts';
import { me } from '../../player/player.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { camera } from '../../render/scene.ts';
import { babble } from '../../place/chatter.ts';
import { accounts, aperture } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { createSeen } from '../railway/ability-arrival.ts';
import { railwayGlideOpen } from '../railway/glide.ts';
import { ringIslandNear } from '../ring-island/state.ts';
import { ringUV } from '../ring-meet/shape.ts';
import { HOOTER } from './lines.ts';
import {
  CREW,
  HOOTER_UV,
  POST_UV,
  RIVET_CREW,
  FACE_AT,
  SQUINT_CREW,
  WET_S,
  YARD_Y,
  glidingTheGap,
  linesFor,
  shiftAt,
  shiftChange,
  standingUV,
  stationOf,
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
type Figure = { guy: Guy; uv: UV; route: UV[]; station: Station | null };

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
/** The whistle's cue: how long Hooter holds it up and it steams (the sound runs 1.5 s), the steam's rate, and how long
 * his line stays over his head. */
const BLAST = { holdS: 1.6, steamS: 1.1, perS: 46, barkS: 3.4, hideM: 30 } as const;
const STEAM = new THREE.Color('#f6f7f8');
const NAMES: Record<Who, string> = { rivet: 'Rivet', squint: 'Squint', hooter: 'Hooter' };
const VOICES: Record<Who, ReturnType<typeof voice>> = {
  rivet: voice(210, 1.05),
  squint: voice(300, 1.2),
  hooter: voice(170, 0.95),
};

export function createRingFolk(adapter: RailwayAdapter, owner: OwnedView) {
  /** The first whole state is in (`read.whole()`, a latch): never `read.ready()`, which is also false with a full pending window. */
  const firstReady = () => adapter.read.whole();
  const memory = createSeen('boogle.ring-folk.v0');
  let kit: Kit | null = null,
    talk: typeof import('../../place/talk.ts') | null = null,
    crew: Figure[] = [],
    hooter: Figure | null = null,
    lastShift: number | null = null,
    wasMounted = false,
    whistled = 0,
    steamOwed = 0,
    barkLeft = 0,
    lastSwim = -1e9,
    speaking: Who | null = null;
  const cursor: Record<Who, number> = { rivet: 0, squint: 0, hooter: 0 };
  const stats = { whistles: 0, snaps: 0 };
  // Hooter's line at the whistle, in the town's bark bubble (town.css `.place-bark`, loaded with the railway).
  const bubble = document.createElement('div');
  bubble.className = 'place-bark';
  (document.querySelector('.hud') ?? document.body).append(bubble);
  owner.cleanup(() => bubble.remove());
  const screen = new THREE.Vector3();
  function stopBark() {
    if (barkLeft <= 0 && !bubble.classList.contains('on')) return;
    barkLeft = 0;
    bubble.classList.remove('on');
    if (hooter && speaking !== 'hooter') hooter.guy.chat = 0;
  }
  /** Steam from the whistle's mouth while it blows, and the bubble kept over Hooter's hat. */
  function blast(dt: number, k: Kit, h: Figure) {
    if (whistled > BLAST.holdS - BLAST.steamS) {
      const g = h.guy,
        top = k.WHISTLE_TOP,
        sin = Math.sin(g.yaw),
        cos = Math.cos(g.yaw);
      const x = g.x + top.x * cos + top.z * sin,
        z = g.z - top.x * sin + top.z * cos;
      for (steamOwed += dt * BLAST.perS; steamOwed >= 1; steamOwed--)
        emit({
          x: x + (Math.random() - 0.5) * 0.06,
          y: YARD_Y + top.y,
          z: z + (Math.random() - 0.5) * 0.06,
          vx: (Math.random() - 0.5) * 0.9,
          vy: 3.4 + Math.random() * 1.6,
          vz: (Math.random() - 0.5) * 0.9,
          life: 0.9 + Math.random() * 0.6,
          size: 0.13,
          color: STEAM,
          alpha: 0.85,
          gravity: -0.4,
          drag: 2.2,
          grow: [0.7, 3.6],
          fade: 0.65,
        });
    }
    if (barkLeft <= 0) return;
    barkLeft -= dt;
    const g = h.guy;
    if (
      barkLeft <= 0 ||
      conversation.open ||
      Math.hypot(g.x - camera.position.x, g.z - camera.position.z) > BLAST.hideM
    )
      return stopBark();
    screen.set(g.x, YARD_Y + 1.5, g.z).project(camera);
    const on = screen.z < 1 && Math.abs(screen.x) < 1.1 && Math.abs(screen.y) < 1.1;
    bubble.classList.toggle('on', on);
    bubble.style.transform = `translate(-50%, -100%) translate(${(((screen.x + 1) / 2) * innerWidth).toFixed(1)}px, ${(((1 - screen.y) / 2) * innerHeight).toFixed(1)}px)`;
  }

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
      stopBark();
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
      c = FACE_AT;
    const guy = k.addLooker(w.x, YARD_Y, w.z, Math.atan2(c.x - w.x, c.z - w.z), color);
    return { guy, uv: { ...uv }, route: [], station: null };
  }
  const place = (f: Figure) => {
    const w = worldOf(f.uv);
    f.guy.x = w.x;
    f.guy.z = w.z;
    f.guy.fy = YARD_Y;
  };
  const faceShard = (f: Figure, dt: number, k = 5) => {
    const w = worldOf(f.uv),
      c = FACE_AT;
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
      place(f);
      faceShard(f, 1, 100);
    }
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
      whistled = BLAST.holdS;
      steamOwed = 0;
      // His line with the whistle, rotating (the Copy table): the shift picks it, so every page reads the same one.
      if (!conversation.open) {
        bubble.textContent = HOOTER[shift % HOOTER.length]!;
        barkLeft = BLAST.barkS;
        hooter.guy.chat = 1;
        babble(shift, hooter.guy.k, w.x, w.z);
      }
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
        whistled = 0;
        stopBark();
        return;
      }
      const shift = shiftAt(adapter.read.tick());
      // A remount (the camera came back within range) is a first look: no whistle for a swap you didn't see.
      const change = wasMounted ? shiftChange(lastShift, shift) : 'snap';
      wasMounted = true;
      if (change === 'snap') snap(shift);
      else if (change === 'whistle') swap(shift);
      lastShift = shift;

      for (let c = 0; c < crew.length; c++) {
        const f = crew[c]!,
          g = f.guy,
          was = worldOf(f.uv);
        const walking = f.route.length > 0 && walkStep(f.uv, f.route, dt);
        place(f);
        const talking =
          speaking !== null && c === (speaking === 'rivet' ? RIVET_CREW : speaking === 'squint' ? SQUINT_CREW : -1);
        if (walking) {
          g.mood = 'walk';
          g.yaw = angleLerp(g.yaw, Math.atan2(g.x - was.x, g.z - was.z), Math.min(1, dt * 10));
        } else {
          // Rivet off shift tosses a rivet and catches it (the plan's "rivet toss"): a fidget, nothing to do with it.
          g.mood = c === RIVET_CREW && f.station?.kind === 'rest' && !talking ? 'toss' : 'idle';
          if (talking) facePlayer(f, dt);
          else if (f.station?.kind === 'rest' && near(f, 5)) facePlayer(f, dt);
          else faceShard(f, dt);
        }
      }
      // Hooter: by the board, the whistle held up and steaming as it sounds; turns to a player nearby.
      whistled = Math.max(0, whistled - dt);
      hooter.guy.mood = whistled > 0 ? 'whistle' : 'idle';
      place(hooter);
      blast(dt, kit, hooter);
      if (near(hooter, 6) || speaking === 'hooter') facePlayer(hooter, dt);
      else faceShard(hooter, dt);
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
        bark: barkLeft > 0 ? bubble.textContent : null,
        snaps: stats.snaps,
        posts: POST_UV.length,
        crew: crew.map((f) => ({
          at: f.station ? `${f.station.kind}${f.station.slot}` : null,
          walking: f.route.length > 0,
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
