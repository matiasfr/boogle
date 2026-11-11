// Local town welcome. Reads accepted progress; talking never changes the railway.
import * as THREE from 'three/webgpu';
import { angleLerp } from '../../math.ts';
import { conversation } from '../../player/conversation.ts';
import { me } from '../../player/player.ts';
import type { Interactable } from '../../player/hands.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { ReadWorld } from '../../sim/railway-rows.ts';
import { forge } from '../../sim/railway-rows.ts';
import { line2Completed, line2SeaOpen } from '../../sim/railway-queries-line2.ts';
import type { railPhase } from '../../sim/railway-queries-line1.ts';

export const GREETER_LINES = {
  asleep: [
    'Follow the path up to the machine. We need a hand getting the rail running. Mine are mostly sleeves.',
    "Track layer's asleep. Very qualified. Just needs someone to wake it up.",
    "I'm in charge of welcoming. You're doing splendidly at arriving.",
  ],
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
};
export async function createTownGreeter(owner: OwnedView, read: GreeterRead) {
  const [folk, talk, layout, shore, land] = await Promise.all([
    import('../../place/folk.ts'),
    import('../../place/talk.ts'),
    import('../../place/layout.ts'),
    import('../../place/shore-layout.ts'),
    import('../../place/land.ts'),
  ]);
  if (!owner.alive) return { update: () => {}, targets: (): Interactable[] => [] };
  const g = folk.addGreeter(layout.toWorld(shore.SHORE_WORKER.x), layout.VILLAGE.y, shore.SHORE_WORKER.z);
  // Ground the original shore worker beside the path, without adding a blocking body.
  g.fy = land.H(g.x, g.z);
  const at = new THREE.Vector3(g.x, g.fy + 1.5, g.z);
  const who = {
    name: 'Sleeves',
    x: g.x,
    z: g.z,
    color: '#f0c030',
    voice: {
      baseHz: 330,
      rangeSemis: 3,
      formantScale: 1.25,
      brightnessHz: 4200,
      cps: 34,
      grainMs: [55, 85] as [number, number],
      vowels: [0.3, 0.15, 0.2, 0.25, 0.1] as const,
    },
  };
  let speaking = false;
  let lastStage = '';
  let cursor = 0;
  const stage = () => {
    const phase = read.phase();
    if (phase === 'asleep' || phase === 'waking') return 'asleep';
    const w = read.world();
    if (line2SeaOpen(w)) return 'onward';
    if (line2Completed(w) >= 2) return 'needle';
    if (forge(w).lit >= 0) return 'cart';
    return 'forge';
  };
  const open = () => {
    const current = stage();
    if (lastStage !== current) cursor = 0;
    const lines = GREETER_LINES[current];
    if (
      talk.startTalk(
        who,
        {
          say: lines[cursor % lines.length]!,
          answers: [{ label: 'Bye', then: () => null }],
        },
        () => {
          speaking = false;
        },
      )
    ) {
      speaking = true;
      lastStage = current;
      cursor++;
    }
  };
  owner.cleanup(() => {
    if (speaking) talk.endTalk();
    const k = folk.folk.guys.indexOf(g);
    if (k >= 0) folk.folk.guys.splice(k, 1);
  });
  return {
    update(dt: number) {
      const p = me.body?.position;
      if (p && Math.hypot(p.x - g.x, p.z - g.z) < 8) {
        g.yaw = angleLerp(g.yaw, Math.atan2(p.x - g.x, p.z - g.z), Math.min(1, dt * 5));
        g.mood = speaking ? 'chat' : 'wave';
      } else g.mood = 'idle';
      talk.updateTalkCard();
    },
    targets(): Interactable[] {
      const p = me.body?.position;
      return p &&
        read.ready() &&
        !conversation.open &&
        Math.hypot(p.x - g.x, p.z - g.z) < 3.3 &&
        Math.abs(p.y - g.fy!) < 3
        ? [{ id: 'railway-talk-greeter', verb: 'Talk', at, run: open }]
        : [];
    },
  };
}
