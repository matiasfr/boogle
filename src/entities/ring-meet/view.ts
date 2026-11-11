// The Meet and the first crossing (docs/plans/ring-island-build1.md, R4d): the rivet's stud and gold glint, its prompt
// ("Strike the rivet"), the 6 s shot every page plays when the ring joins, and each player's first ride over the joint.
// A Local view of accepted state, mounted by the railway's works seam (railway/works-live.ts) because it needs the
// adapter's accepted edges, which only that view holds. It reads the Aperture, Works and Boiler rows through
// `adapter.read.world()`, re-read at the head of every entry point (update, accepted, corrected, targets, restore);
// nothing is kept from a world. Plays effects only from the accepted edge, never from `apply` or a restore: a page that
// joins after the join, or reloads, is placed in the joined state with no shot and is owed the Meet's framing on its own
// first crossing (call 11). The shot is `createCameraPullOut`'s: nothing ends it but the one highlighted skip.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { camera } from '../../render/scene.ts';
import { createCameraPullOut } from '../../render/camera-pull-out.ts';
import { carry } from '../../physics/platforms.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { readableGlow, readableIntensity, readableUnlit } from '../../render/readable-unlit.ts';
import { emit } from '../../render/particles.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { showMomentBanner } from '../../ui/moment-banner.ts';
import { RING_RIVET } from '../../sim/railway-ring-layout.ts';
import { WORKS } from '../../sim/railway-works-layout.ts';
import { aperture, boiler, works as worksRow } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { createFirstReady } from '../railway/first-ready.ts';
import { createSeen } from '../railway/ability-arrival.ts';
import { playSharedMoment } from '../railway/shared-moment.ts';
import {
  CROSSING_SHOT,
  MEET_REPLAY,
  MEET_SHOT,
  RIVET_AT,
  crossedJoint,
  crossingShot,
  glintShown,
  meetKept,
  meetOffered,
  ringUV,
  strikeOffered,
  type MeetShot,
} from './shape.ts';

/** Owner-facing copy (Copy table: "Ring Island" over "The line has arrived", 4.5 s; not The Boogler's). */
const BANNER = ['Ring Island', 'The line has arrived'] as const;
const BANNER_S = 4.5;
const STRIKE_VERB = 'Strike the rivet';
/** Glints off the stud, seconds apart, only while the camera is within this many metres (it reads from the bents). */
const MOTE_S = 0.1;
const MOTE = new THREE.Color('#ffd25a');
const GLINT_RANGE = 160;
/** The memory keys (per room and player, createSeen): shown the Meet; shown the first-crossing pull-out. */
const SAW_MEET = 'meet';
const PULLED_OUT = 'crossing';

export function createRingMeet(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: { seated: () => boolean; busy: () => boolean; landed: () => boolean },
) {
  const shot = createCameraPullOut(deps.busy, true, deps.seated);
  const seen = createSeen('boogle.ring-meet.v0');
  const firstReady = createFirstReady(adapter.read.ready);
  owner.cleanup(() => shot.dispose());

  // The stud: a raised gold bolt head in the joint at the toe (lit metal, so it reads gold, not cream), with a thin gold
  // beacon over it that rises above Buddy from the follow camera. Both stay dull until the plate has visibly landed
  // (`deps.landed`), then pulse (strongly enough to see in a still pair); bright and steady once struck.
  const studMat = readableGlow(
    new THREE.MeshStandardNodeMaterial({ color: '#d99a14', metalness: 0.85, roughness: 0.35, emissive: '#ff9d00' }),
  );
  const studGeo = new THREE.CylinderGeometry(0.5, 0.58, 0.5, 24);
  const stud = new THREE.Mesh(studGeo, studMat);
  stud.position.set(RIVET_AT.x, RIVET_AT.y + 0.25, RIVET_AT.z);
  stud.castShadow = true;
  stud.visible = false;
  const beamMat = readableUnlit(
    new THREE.MeshBasicNodeMaterial({ color: '#ffc02e', transparent: true, opacity: 0.6, depthWrite: false }),
  );
  const beamGeo = new THREE.CylinderGeometry(0.07, 0.07, 3.4, 10, 1, true);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(RIVET_AT.x, RIVET_AT.y + 0.5 + 1.7, RIVET_AT.z);
  beam.visible = false;
  owner.add(stud, beam);
  owner.cleanup(() => {
    studGeo.dispose();
    studMat.dispose();
    beamGeo.dispose();
    beamMat.dispose();
  });

  /** The Meet shot has been offered on this page (so a second accepted strike, a race's loser, plays nothing more). */
  let played = false,
    placed = false,
    t = 0,
    mote = 0,
    prevU: number | null = null;

  const v3 = (v: { x: number; y: number; z: number }) => new THREE.Vector3(v.x, v.y, v.z);
  function play(s: MeetShot) {
    shot.play(v3(s.from), v3(s.to), v3(s.at), s.seconds, s.drift, {
      lead: s.lead,
      back: s.back,
      atFrom: s.atFrom ? v3(s.atFrom) : undefined,
    });
    return shot.active();
  }
  /** The rows' joined flag, or false when Q7 is not laid (a v26 room has no Aperture row). */
  function isJoined() {
    const wd = adapter.read.world();
    return !!line2Trains(wd) && aperture(wd).joined >= 0;
  }
  /** A restore (first readiness, a hard reset, a rebuild after a reconnect) places the stud and drops any shot: no replay. */
  function restore() {
    shot.reset();
    played = isJoined();
    prevU = null;
    mote = 0;
    draw();
  }
  /** Whether the glint is on: the leaf has visibly landed (not just `brace === 0`) and the rivet is not struck. */
  function lit(brace: number, joined: number) {
    return glintShown(brace, joined, deps.landed());
  }
  function draw() {
    const wd = adapter.read.world(),
      a = firstReady() && line2Trains(wd) ? aperture(wd) : null;
    stud.visible = !!a && a.set === WORKS.ring;
    beam.visible = false;
    if (!a) return;
    if (a.joined >= 0) {
      studMat.emissiveIntensity = 0.9;
    } else if (lit(a.brace, a.joined)) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      studMat.emissiveIntensity = 0.3 + 1.7 * pulse;
      beam.visible = true;
      beamMat.opacity = 0.3 + 0.55 * pulse;
    } else studMat.emissiveIntensity = 0;
  }
  /** The ride over the joint, once per player per room: the pull-out for a player who saw the Meet, the Meet's framing for
   * one who missed it (joined late, was seated, reduced motion). Marked only when a shot was actually queued. */
  function crossing() {
    const p = me.body?.position,
      riding = !!p && !!carry.on;
    if (!p || !riding) {
      prevU = null;
      return;
    }
    const { u, lat } = ringUV(p.x, p.z);
    // Only on the bents' strip; a platform elsewhere in the world never counts.
    const here = Math.abs(lat) < 2500 ? u : null;
    const crossed = here !== null && crossedJoint(prevU, here);
    prevU = here;
    const which = crossingShot({
      joined: isJoined(),
      riding,
      crossed,
      pulledOut: seen.has(PULLED_OUT),
      sawMeet: seen.has(SAW_MEET),
    });
    if (!which) return;
    if (play(which === 'meet' ? MEET_REPLAY : CROSSING_SHOT)) seen.add(PULLED_OUT);
  }
  function glint(dt: number) {
    const wd = adapter.read.world();
    if (!firstReady() || !line2Trains(wd)) return;
    const a = aperture(wd);
    if (!lit(a.brace, a.joined)) return;
    mote -= dt;
    if (mote > 0) return;
    mote = MOTE_S;
    if (Math.hypot(camera.position.x - RIVET_AT.x, camera.position.z - RIVET_AT.z) > GLINT_RANGE) return;
    // Glints (the star-shaped sprite, big enough to read from the bents) rising off the stud in a slow column.
    emit({
      x: RIVET_AT.x + (Math.random() - 0.5) * 0.6,
      y: RIVET_AT.y + 0.6,
      z: RIVET_AT.z + (Math.random() - 0.5) * 0.6,
      vx: (Math.random() - 0.5) * 0.3,
      vy: 0.9 + Math.random() * 0.5,
      vz: (Math.random() - 0.5) * 0.3,
      life: 1.8,
      size: 0.55,
      color: MOTE,
      intensity: readableIntensity() * 1.6,
      alpha: 0.95,
      grow: [0.6, 1],
      shrink: 0.5,
      fade: 0.6,
      shape: 'glint',
    });
  }
  restore();
  return {
    restore,
    update(dt: number) {
      t += dt;
      shot.update(dt);
      if (!firstReady()) return;
      // The frame the first whole state arrives is a restore: a joined room places the stud, plays nothing.
      if (!placed) {
        placed = true;
        restore();
      }
      draw();
      glint(dt);
      crossing();
    },
    accepted(e: RailwayAccepted) {
      if (e.op !== 'rail.strike' || e.id !== 2) return;
      if (!meetOffered(e)) return;
      // The clang and a burst of gold at the stud, for anyone in earshot; the shot and banner once per page.
      clank(RIVET_AT.x, RIVET_AT.z);
      thump(RIVET_AT.x, RIVET_AT.z);
      dustRing(RIVET_AT.x, RIVET_AT.y + 0.2, RIVET_AT.z, 10, 1.4, 0.3);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 + Math.random() * 0.3,
          v = 1.6 + Math.random() * 2.2;
        emit({
          x: RIVET_AT.x,
          y: RIVET_AT.y + 0.6,
          z: RIVET_AT.z,
          vx: Math.cos(a) * v,
          vy: 1.5 + Math.random() * 2,
          vz: Math.sin(a) * v,
          gravity: 4,
          life: 1.3,
          size: 0.7,
          color: MOTE,
          intensity: readableIntensity() * 2,
          alpha: 1,
          grow: [0.6, 1],
          shrink: 0.5,
          fade: 0.6,
          shape: 'glint',
        });
      }
      if (played) return;
      played = true;
      playSharedMoment('the meet', e, adapter.read.pid, () => {
        showMomentBanner(BANNER[0], BANNER[1], BANNER_S);
        const queued = play(MEET_SHOT);
        if (queued) seen.add(SAW_MEET);
        return queued;
      });
    },
    /** A predicted strike the server refused takes the shot back, unless the rivet is struck anyway (a same-moment
     * race: the winner's accepted edge is the Meet). */
    corrected(c: RailwayCorrection) {
      if (c.event.op !== 'rail.strike' || c.event.id !== 2) return;
      if (meetKept(isJoined())) return;
      shot.cancel();
      played = false;
      seen.forget(SAW_MEET);
    },
    /** The prompt: the leaf is down, the rivet is not struck, the room has the
     * breaker (`Works.breaker === 2`, room-wide, not a carry), you are within the rivet's reach. */
    targets(): Interactable[] {
      const p = me.body?.position,
        wd = adapter.read.world();
      if (!p || !adapter.read.ready() || !line2Trains(wd)) return [];
      const b = boiler(wd),
        a = aperture(wd);
      if (
        !strikeOffered({
          breaker: worksRow(wd).breaker,
          brace: a.brace,
          joined: a.joined,
          hauling: b.state === 'held' && b.holder === adapter.read.pid,
          landed: deps.landed(),
        })
      )
        return [];
      if (Math.hypot(p.x - RING_RIVET.x / 100, p.z - RING_RIVET.z / 100) > RING_RIVET.reach / 100 - 0.4) return [];
      if (Math.abs(p.y - RING_RIVET.y / 100) > 2.6) return [];
      return [
        {
          id: 'railway-strike-rivet',
          verb: STRIKE_VERB,
          at: new THREE.Vector3(RING_RIVET.x / 100, RING_RIVET.y / 100, RING_RIVET.z / 100),
          run: () => {
            if (!adapter.strike(2)) uiSound('deny');
          },
        },
      ];
    },
    inspect: () => ({
      meetView: {
        played,
        shot: shot.inspect(),
        stud: stud.visible,
        seenMeet: seen.has(SAW_MEET),
        pulledOut: seen.has(PULLED_OUT),
      },
    }),
  };
}
