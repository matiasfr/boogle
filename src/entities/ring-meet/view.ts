// The Meet and the first crossing (docs/plans/ring-island-build1.md, R4d): the rivet's stud and gold glint, its prompt
// ("Strike the rivet"), the 6 s shot every page plays when the ring joins, and each player's first ride over the joint.
// A Local view of accepted state, mounted by the railway's works seam (railway/works-live.ts) because it needs the
// adapter's accepted edges, which only that view holds. It reads the Aperture, Works and Boiler rows through
// `adapter.read.world()`, re-read at the head of every entry point (update, accepted, corrected, targets, restore);
// nothing is kept from a world. Plays effects only from the accepted edge, never from `apply` or a restore: a page that
// joins after the join, or reloads, is placed in the joined state with no shot and is owed the Meet's framing on its own
// first crossing (call 11). The shot is `createCameraPullOut`'s: nothing ends it but the one highlighted skip.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted, RailwayCorrection } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { camera } from '../../render/scene.ts';
import { createCameraPullOut } from '../../render/camera-pull-out.ts';
import { carry } from '../../physics/platforms.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { readableGlow, readableIntensity } from '../../render/readable-unlit.ts';
import { emit } from '../../render/particles.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { actShowing, showMomentBanner } from '../../ui/moment-banner.ts';
import { RING_RIVET } from '../../sim/railway-ring-layout.ts';
import { WORKS } from '../../sim/railway-works-layout.ts';
import { aperture, boiler, works as worksRow } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { createSeen } from '../railway/ability-arrival.ts';
import { playSharedMoment } from '../railway/shared-moment.ts';
import {
  CROSSING_SHOT,
  STUD,
  glintPlan,
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
const BANNER_S = 4.35;
const STRIKE_VERB = 'Strike the rivet';
const MOTE = new THREE.Color('#ffd25a');
/** Glints are emitted only while the camera is within this many metres (it reads from the bents). */
const GLINT_RANGE = 240;
/** The memory keys (per room and player, createSeen): shown the Meet; shown the first-crossing pull-out. */
const SAW_MEET = 'meet';
const PULLED_OUT = 'crossing';

export function createRingMeet(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: { busy: () => boolean; landed: () => boolean },
) {
  // A reward card or an act card has the screen: the shot waits for it (it joins the camera's one list while it plays or
  // waits, buddy-frame.ts), and the banner queues behind an act card (moment-banner.ts).
  const shot = createCameraPullOut(() => deps.busy() || actShowing(), true);
  const seen = createSeen('boogle.ring-meet.v0');
  /** The first whole state is in (`read.whole()`, a latch): never `read.ready()`, which is also false with a full pending window. */
  const firstReady = () => adapter.read.whole();
  owner.cleanup(() => shot.dispose());

  // The stud: a raised gold bolt head in the joint at the toe (lit metal, so it reads gold, not cream). It stays dull until the plate has visibly landed
  // (`deps.landed`), then pulse (strongly enough to see in a still pair); bright and steady once struck.
  const studMat = readableGlow(
    new THREE.MeshStandardNodeMaterial({ color: '#d99a14', metalness: 0.85, roughness: 0.35, emissive: '#ff9d00' }),
  );
  const studGeo = new THREE.CylinderGeometry(STUD.rTop, STUD.rFoot, STUD.h, 24);
  const stud = new THREE.Mesh(studGeo, studMat);
  stud.position.set(RIVET_AT.x, RIVET_AT.y + STUD.h / 2, RIVET_AT.z);
  stud.castShadow = true;
  stud.visible = false;
  owner.add(stud);
  owner.cleanup(() => {
    studGeo.dispose();
    studMat.dispose();
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
      cutIn: s.cutIn,
      atFrom: s.atFrom ? v3(s.atFrom) : undefined,
      end: s.end ? { pos: v3(s.end.pos), at: v3(s.end.at) } : undefined,
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
    if (!a) return;
    if (a.joined >= 0) {
      studMat.emissiveIntensity = 0.9;
    } else if (lit(a.brace, a.joined)) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      studMat.emissiveIntensity = 0.3 + 1.7 * pulse;
    } else studMat.emissiveIntensity = 0;
  }
  /** The ride over the joint, once per player per room: the pull-out for a player who saw the Meet, the Meet's framing for
   * one who missed it (joined late, reduced motion). Marked only when a shot was actually queued. */
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
    const d = Math.hypot(
      camera.position.x - RIVET_AT.x,
      camera.position.y - RIVET_AT.y,
      camera.position.z - RIVET_AT.z,
    );
    const plan = glintPlan(d);
    mote = plan.interval;
    if (d > GLINT_RANGE) return;
    // The breaker seam's language (particles `emit`, gold, the `glint` sprite, as breaker-view.ts's goldMote), rising
    // FROM the stud a few at a time: slim and sparse when you stand at it, a taller column of larger glints from afar
    // (glintPlan). Sized and brightened with the stud's pulse; never a floating cloud.
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    emit({
      x: RIVET_AT.x + (Math.random() - 0.5) * 0.3,
      y: RIVET_AT.y + STUD.h,
      z: RIVET_AT.z + (Math.random() - 0.5) * 0.3,
      vx: 0,
      vy: plan.rise / plan.life,
      vz: 0,
      life: plan.life,
      size: plan.size * (0.85 + 0.3 * pulse),
      color: MOTE,
      intensity: readableIntensity() * (1.4 + 1.0 * pulse),
      alpha: 1,
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
