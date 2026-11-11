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
import { readableUnlit } from '../../render/readable-unlit.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { showMomentBanner } from '../../ui/moment-banner.ts';
import { RING_RIVET } from '../../sim/railway-ring-layout.ts';
import { WORKS } from '../../sim/railway-works-layout.ts';
import { aperture, boiler, works as worksRow } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { createFirstReady } from '../railway/first-ready.ts';
import { createSeen } from '../railway/ability-arrival.ts';
import { goldMote } from '../railway/breaker-view.ts';
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
/** Gold motes at the stud, seconds apart, only while the camera is within this many metres (it reads from the bents). */
const MOTE_S = 0.35;
const GLINT_RANGE = 160;
/** The memory keys (per room and player, createSeen): shown the Meet; shown the first-crossing pull-out. */
const SAW_MEET = 'meet';
const PULLED_OUT = 'crossing';

export function createRingMeet(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: { seated: () => boolean; busy: () => boolean },
) {
  const shot = createCameraPullOut(deps.busy, true, deps.seated);
  const seen = createSeen('boogle.ring-meet.v0');
  const firstReady = createFirstReady(adapter.read.ready);
  owner.cleanup(() => shot.dispose());

  // The stud: a brass disc in the joint at the toe, dull until the leaf is down, gold and pulsing then, bright once struck.
  const studMat = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: new THREE.Color('#6b5a30') }));
  const studGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20);
  const stud = new THREE.Mesh(studGeo, studMat);
  stud.position.set(RIVET_AT.x, RIVET_AT.y + 0.06, RIVET_AT.z);
  stud.visible = false;
  owner.add(stud);
  owner.cleanup(() => {
    studGeo.dispose();
    studMat.dispose();
  });
  const DULL = new THREE.Color('#6b5a30'),
    GOLD = new THREE.Color(3.2, 2.3, 0.8);

  /** The Meet shot has been offered on this page (so a second accepted strike, a race's loser, plays nothing more). */
  let played = false,
    placed = false,
    t = 0,
    mote = 0,
    prevU: number | null = null;

  function play(s: MeetShot) {
    shot.play(
      new THREE.Vector3(s.from.x, s.from.y, s.from.z),
      new THREE.Vector3(s.to.x, s.to.y, s.to.z),
      new THREE.Vector3(s.at.x, s.at.y, s.at.z),
      s.seconds,
    );
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
  function draw() {
    const wd = adapter.read.world(),
      a = firstReady() && line2Trains(wd) ? aperture(wd) : null;
    stud.visible = !!a && a.set === WORKS.ring;
    if (!a) return;
    const lit = glintShown(a.brace, a.joined);
    if (a.joined >= 0) studMat.color.copy(GOLD).multiplyScalar(0.8);
    else if (lit) studMat.color.copy(GOLD).multiplyScalar(0.7 + 0.3 * Math.sin(t * 5));
    else studMat.color.copy(DULL);
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
    if (!glintShown(a.brace, a.joined)) return;
    mote -= dt;
    if (mote > 0) return;
    mote = MOTE_S;
    if (Math.hypot(camera.position.x - RIVET_AT.x, camera.position.z - RIVET_AT.z) > GLINT_RANGE) return;
    goldMote(
      RIVET_AT.x + (Math.random() - 0.5) * 0.5,
      RIVET_AT.y + 0.2,
      RIVET_AT.z + (Math.random() - 0.5) * 0.5,
      Math.random() < 0.5 ? -1 : 1,
      0.22,
    );
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
      for (let i = 0; i < 12; i++)
        goldMote(
          RIVET_AT.x + (Math.random() - 0.5),
          RIVET_AT.y + 0.3,
          RIVET_AT.z + (Math.random() - 0.5),
          i % 2 ? 1 : -1,
          0.3,
        );
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
    /** The prompt: the leaf is down, the rivet is not struck, the breaker is in your hands, within the rivet's reach. */
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
