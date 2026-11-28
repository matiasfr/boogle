// Local conversations and unread cues; the camp handoff submits the existing shared starter-tool action.
import * as THREE from 'three/webgpu';
import { angleLerp } from '../../math.ts';
import { makeAxeModel } from '../../render/axe-models.ts';
import { conversation } from '../../player/conversation.ts';
import { me } from '../../player/player.ts';
import type { Interactable } from '../../player/hands.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { ReadWorld } from '../../sim/railway-rows.ts';
import { createPhaseGuide } from '../../components/phase-guide/view.ts';
import type { GuideLines } from '../../components/phase-guide/stages.ts';
import { createSpeechCue } from '../../components/speech-cue/view.ts';
import { RAILWAY_T1 as T1 } from '../../sim/railway-layout.ts';
import { railEngineStart } from '../../sim/railway-queries-line1.ts';
import { forge, rail } from '../../sim/railway-rows.ts';
import { line2Completed, line2SeaOpen } from '../../sim/railway-queries-line2.ts';
import type { railPhase } from '../../sim/railway-queries-line1.ts';

// New opening lines are drafts for the owner; the later authored lines stay verbatim.
export const GREETER_LINES = {
  asleep: [
    'Follow the path up to the camp. Someone there has an axe for you.',
    'Fill the first frame with logs. That should get the track layer going.',
    "I'm in charge of welcoming. You're doing splendidly at arriving.",
  ],
  logs: ['You have the axe. The first frame needs logs before the engine can start.'],
  forge: [
    "It's awake! Keep feeding those frames up the path. The forge is waiting for its big moment.",
    "A railway! With places to go! I've been practising leaving and coming back.",
    'The forge takes logs. I offered encouragement. Apparently that burns terribly.',
  ],
  cart: [
    'Forge is lit! Keep building towards the quarry. The log cart will bring the heavy conversation.',
    "We've made rails out of logs. I tried making a sandwich. Less success.",
    'Give the cart room. It has logs to be and places to do.',
  ],
  needle: [
    "Keep building past the quarry. Needle Bell's switch is up the hook rings. I'll supervise from down here.",
    'The cart brings logs now. Nobody brings me biscuits. A gap in the network.',
    "That bell's very high. Presumably to keep the noise off the floor.",
  ],
  onward: [
    "Needle Bell's open! Follow the railway onwards. I'll keep this end attached to the town.",
    "Look how far you've built! I was here for the welcoming. Crucial department.",
    'If you see the cart, tell it good job. Not while standing in front of it.',
  ],
};

/** What the greeter reads of the railway: the world the views see, line one's phase this frame and whether an action
 * can be sent (the read facade's). */
export type GreeterRead = {
  world: () => ReadWorld;
  phase: () => ReturnType<typeof railPhase>;
  ready: () => boolean;
  takeAxe: () => void;
};
export async function createTownGreeter(owner: OwnedView, read: GreeterRead) {
  const [folk, talk, layout, land] = await Promise.all([
    import('../../place/folk.ts'),
    import('../../place/talk.ts'),
    import('../../place/layout.ts'),
    import('../../place/land.ts'),
  ]);
  if (!owner.alive)
    return {
      update: () => {},
      lateUpdate: () => {},
      targets: (): Interactable[] => [],
      handoff: (out: THREE.Vector3) => void out,
    };
  const g = folk.addGreeter(layout.toWorld(layout.GREETER.x), layout.VILLAGE.y, layout.GREETER.z);
  // Ground the original shore worker beside the path, without adding a blocking body.
  g.fy = land.H(g.x, g.z);
  const voice = {
    baseHz: 330,
    rangeSemis: 3,
    formantScale: 1.25,
    brightnessHz: 4200,
    cps: 34,
    grainMs: [55, 85] as [number, number],
    vowels: [0.3, 0.15, 0.2, 0.25, 0.1] as const,
  };
  const stage = (): keyof typeof GREETER_LINES => {
    const phase = read.phase();
    if (phase === 'asleep' || phase === 'waking') return 'asleep';
    const w = read.world();
    if (line2SeaOpen(w)) return 'onward';
    if (line2Completed(w) >= 2) return 'needle';
    if (forge(w).lit >= 0) return 'cart';
    return railEngineStart(w) < 0 ? 'logs' : 'forge';
  };
  const sleevesLines: Record<keyof typeof GREETER_LINES, GuideLines> = {
    asleep: { talk: GREETER_LINES.asleep },
    logs: { talk: GREETER_LINES.logs },
    forge: { talk: GREETER_LINES.forge },
    cart: { talk: GREETER_LINES.cart },
    needle: { talk: GREETER_LINES.needle },
    onward: { talk: GREETER_LINES.onward },
  };
  const sleeves = createPhaseGuide(owner, {
    id: 'railway-talk-greeter',
    name: 'Sleeves',
    color: '#f0c030',
    voice,
    body: () => g,
    stage,
    lines: sleevesLines,
    ready: read.ready,
  });
  // Beside the existing wake reach, on the camp side of the parked machine; no collider or new shared state.
  const camp = folk.addGreeter(T1.wake.x / 100 - 3, 0, T1.wake.z / 100 + 4.2);
  camp.fy = land.H(camp.x, camp.z);
  const campAt = new THREE.Vector3(camp.x, camp.fy + 1.5, camp.z);
  const campCue = createSpeechCue(
    owner,
    campAt,
    'Take this axe. Fill the first frame with logs and we can get the engine going.',
  );
  const axe = makeAxeModel('multi');
  owner.add(axe);
  owner.cleanup(() =>
    axe.traverse((part) => {
      if (part instanceof THREE.Mesh) part.material.dispose();
    }),
  );
  const hand = (out: THREE.Vector3) =>
    out.set(
      camp.x + 0.22 * Math.cos(camp.yaw) + 0.48 * Math.sin(camp.yaw),
      camp.fy! + 0.65,
      camp.z - 0.22 * Math.sin(camp.yaw) + 0.48 * Math.cos(camp.yaw),
    );
  let handing = 0;
  owner.cleanup(() => {
    for (const person of [g, camp]) {
      const k = folk.folk.guys.indexOf(person);
      if (k >= 0) folk.folk.guys.splice(k, 1);
    }
  });
  return {
    handoff(out: THREE.Vector3) {
      handing = 0.9;
      // The same right hand reached by folk's give pose, in the resident's facing frame.
      hand(out);
    },
    update(dt: number) {
      handing = Math.max(0, handing - dt);
      sleeves.update(dt);
      const p = me.body?.position;
      const needsAxe = read.ready() && rail(read.world()).awake < 0;
      camp.mood = needsAxe || handing > 0 ? 'give' : 'idle';
      if (p && Math.hypot(p.x - T1.wake.x / 100, p.z - T1.wake.z / 100) < 9) {
        if (needsAxe) {
          const dx = p.x - camp.x,
            dz = p.z - camp.z;
          const distance = Math.hypot(dx, dz);
          const step = Math.min(Math.max(0, distance - 1.8), dt * 2);
          const x = camp.x + (dx * step) / (distance || 1),
            z = camp.z + (dz * step) / (distance || 1);
          if (Math.hypot(x - T1.wake.x / 100, z - T1.wake.z / 100) <= T1.wake.reach / 100) {
            if (step > 0.001) camp.mood = 'offer';
            camp.x = x;
            camp.z = z;
            camp.fy = land.H(x, z);
            campAt.set(x, camp.fy + 1.5, z);
          }
        }
        camp.yaw = angleLerp(camp.yaw, Math.atan2(p.x - camp.x, p.z - camp.z), Math.min(1, dt * 5));
      }
      axe.visible = camp.on && needsAxe;
      if (axe.visible) {
        hand(axe.position);
        axe.rotation.y = camp.yaw + Math.PI / 2;
      }
      talk.updateTalkCard();
    },
    lateUpdate() {
      sleeves.lateUpdate();
      campCue.update(camp.on && read.ready() && rail(read.world()).awake < 0 && !conversation.open);
    },
    targets(): Interactable[] {
      const p = me.body?.position;
      if (!p || !read.ready() || conversation.open) return [];
      const targets: Interactable[] = [...sleeves.targets()];
      if (
        rail(read.world()).awake < 0 &&
        Math.hypot(p.x - camp.x, p.z - camp.z) < 3.3 &&
        Math.abs(p.y - camp.fy!) < 3 &&
        Math.hypot(p.x - T1.wake.x / 100, p.z - T1.wake.z / 100) <= T1.wake.reach / 100
      )
        targets.push({ id: 'railway-take-axe', verb: 'Take axe', at: campAt, run: read.takeAxe, show: campCue.show });
      return targets;
    },
  };
}
