// ?proto=place's shore worker: the yellow little guy on the coast path who steps out, waves and asks a newcomer for a hand
// with the sleeping machine. Moved out of ./residents.ts unchanged (place-retirement T2); the live game has Sleeves
// (src/entities/railway/greeter.ts) instead. Goes with Place in place-retirement D1. Per-person presentation only: the
// railway never waits for this invitation. Local.
import * as THREE from 'three/webgpu';
import { angleLerp } from '../../math.ts';
import { rayHit, raycastClosest } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { isFirstVisit } from '../../player/arrival.ts';
import { conversation } from '../../player/conversation.ts';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { camera } from '../../render/scene.ts';
import { playMark } from '../mark.ts';
import { pageQuery } from '../flags.ts';
import { addGreeter } from '../../place/folk.ts';
import { job, save } from './job.ts';
import { VILLAGE, toWorld } from '../../place/layout.ts';
import { indoors } from './place-rooms.ts';
import { CAST, type Residents } from './residents.ts';
import { SHORE_COAST, SHORE_WORKER, SHORE_WORKER_LOOK } from '../../place/shore-layout.ts';
import { endTalk, startTalk } from '../../place/talk.ts';
import { BYE, SHORE_ASK } from './town-lines.ts';

export function createShoreWorker(residents: Residents) {
  const shoreWorker = SHORE_COAST ? addGreeter(toWorld(SHORE_WORKER.x), VILLAGE.y, SHORE_WORKER.z) : null;
  const shoreLine = SHORE_COAST && pageQuery().get('greeting') !== 'off';
  let shoreGesture = -1;
  let shoreTalking = false;
  const shorePrompt = new THREE.Vector3();
  const shoreSight = rayHit();
  // A reload on the walk retains eligibility; an ordinary returning player doesn't acquire it.
  const seen = { shoreNewcomer: SHORE_COAST && isFirstVisit(), shoreAsk: false };

  function heardShoreAsk(via: 'bark' | 'talk') {
    if (seen.shoreAsk) return;
    playMark('ask heard', { via });
    seen.shoreAsk = true;
    save();
  }
  function targets(): Interactable[] {
    const b = me.body;
    if (!b || !shoreWorker || !shoreLine || job.awake || indoors.room) return NO_TARGETS;
    const p = b.interpolatedPosition;
    if (Math.hypot(p.x - shoreWorker.x, p.z - shoreWorker.z) >= 3.3 || Math.abs(p.y - VILLAGE.y) >= 3)
      return NO_TARGETS;
    shorePrompt.set(shoreWorker.x, VILLAGE.y + 1.5, shoreWorker.z);
    return [
      {
        id: 'place-talk-shore',
        verb: 'Talk',
        at: shorePrompt,
        run: () => {
          if (job.awake) return;
          residents.stopBark();
          const started = startTalk(
            { name: 'Worker', voice: CAST.pip.voice, x: shoreWorker.x, z: shoreWorker.z, color: '#f0c030' },
            { say: SHORE_ASK, answers: [{ label: BYE, then: () => null }] },
            () => {
              shoreTalking = false;
            },
          );
          if (started) {
            shoreTalking = true;
            seen.shoreNewcomer = false;
            heardShoreAsk('talk');
          }
        },
      },
    ];
  }
  function update(dt: number) {
    const g = shoreWorker;
    if (!g) return;
    if (job.awake) {
      // Also cancels a step-out or bubble if a partner wakes it during the approach.
      seen.shoreNewcomer = false;
      shoreGesture = -1;
      g.mood = 'idle';
      if (residents.barker() === g) residents.stopBark();
      if (shoreTalking) endTalk();
      return;
    }
    const b = me.body;
    if (!b) return;
    if (shoreGesture < 0) {
      if (
        !seen.shoreNewcomer ||
        me.down ||
        me.swimming ||
        me.coyote <= 0 ||
        conversation.open ||
        residents.barker() ||
        indoors.room
      )
        return;
      if (Math.hypot(b.position.x - g.x, b.position.z - g.z) > 6 || Math.abs(b.position.y - VILLAGE.y) > 3) return;
      if (!residents.inView(g.x, VILLAGE.y + 0.7, g.z, 0.85, true)) return;
      shorePrompt.set(g.x, VILLAGE.y + 0.7, g.z);
      if (raycastClosest(camera.position, shorePrompt, { mask: GROUP.SCENERY }, shoreSight)) return;
      seen.shoreNewcomer = false;
      shoreGesture = 0;
    }
    const was = shoreGesture;
    shoreGesture += dt;
    g.x = toWorld(SHORE_WORKER.x) - 1.5 * Math.min(1, shoreGesture / 0.9);
    const yaw =
      shoreGesture < 2.6
        ? Math.atan2(b.position.x - g.x, b.position.z - g.z)
        : Math.atan2(toWorld(SHORE_WORKER_LOOK.x) - g.x, SHORE_WORKER_LOOK.z - g.z);
    g.yaw = angleLerp(g.yaw, yaw, Math.min(1, dt * 5));
    g.mood = shoreGesture < 0.9 ? 'walk' : shoreGesture < 2.6 ? 'wave' : 'idle';
    if (was < 0.9 && shoreGesture >= 0.9 && shoreLine && !conversation.open) {
      residents.bark(g, SHORE_ASK, false, 5);
      heardShoreAsk('bark');
    }
  }
  function reset() {
    seen.shoreNewcomer = SHORE_COAST && isFirstVisit();
    seen.shoreAsk = false;
    shoreGesture = -1;
    if (shoreWorker) shoreWorker.x = toWorld(SHORE_WORKER.x);
  }
  return {
    targets,
    update,
    reset,
    /** For ?proto=place's save: kept with the residents' memory, under the same slice. */
    seen,
    restore(v: { shoreNewcomer?: unknown; shoreAsk?: unknown }) {
      seen.shoreNewcomer = v.shoreNewcomer === true;
      seen.shoreAsk = v.shoreAsk === true;
    },
  };
}
