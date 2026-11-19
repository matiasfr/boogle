// The forge's crane holds what the forge cast (docs/plans/forge-call-handoff.md, step 2): the boiler, then the breaker,
// hangs 1.6 m over the pedestal, turning slowly, so it clears the apron's racks and heap from every approach, and three
// little guys stand round it on the forge side and wave at a player within 30 m. Local dress over accepted state: the
// part's row stays on the pedestal (the take, its reach and its collider are unchanged). A live cast swings the jib
// over and lifts on the forge's call (forge-call.ts's cue, which a completion show holds for its cut, so the lift is
// what the cut shows); a restore shows it held at once. Owner call: "Machines show their work physically".
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { me } from '../../player/player.ts';
import { camera } from '../../render/scene.ts';
import { clank } from '../../render/machine-sfx.ts';
import { reducedMotion } from '../../constants.ts';
import { clamp, smoothstep } from '../../math-pure.ts';
import { LINE2_BOILER } from '../../sim/railway-line2-layout.ts';
import { forgeCue } from './forge-call.ts';

/** Metres the part hangs over its rest on the pedestal, seconds the lift and the jib's swing take, radians a second it
 * turns, and the range the little guys wave within. `yaw0` is the heading it is lifted on: side-on to the hand-off
 * cut's camera (forge-cut.ts) half-way through the cut's 2.5 s, so the cut never opens on the boiler's black end. */
export const HOIST = { lift: 1.6, liftS: 1.4, swingS: 1.6, turn: 0.45, wave: 30, guys: 3, yaw0: 1.2 } as const;

/** What the boiler's and the breaker's views read to draw the part held (and write: the world height of its top, where
 * the hook sits). `lift` is metres over its rest; `yaw` its slow turn. */
export const pedestalHold = { lift: 0, yaw: HOIST.yaw0 as number, top: 0 };

type Crane = {
  jib: THREE.Object3D;
  rope: THREE.Object3D;
  hook: THREE.Object3D;
  CX: number;
  CY: number;
  CZ: number;
  MAST: number;
};
type Kit = typeof import('../../place/folk.ts');
type Deps = {
  crane: Crane;
  land: typeof import('../../place/land.ts');
  /** What waits on the pedestal now, from accepted state. */
  waits: () => 'boiler' | 'breaker' | null;
};
const COATS = ['#e2742e', '#d95f3c', '#e89a2c'] as const;
/** The middle one, facing the part from the forge, is the crew's foreman (forge-guide.ts, owner 18 November: "The forge
 * crew's foreman"): a deep blue coat among the oranges and a hammer always in hand, so he reads at a glance. His look is a
 * placeholder for the owner's. */
export const FOREMAN = { index: 1, coat: '#2f5d8a' } as const;

export function createPartHoist(owner: OwnedView, { crane, land, waits }: Deps) {
  const px = LINE2_BOILER.x / 100,
    py = LINE2_BOILER.y / 100,
    pz = LINE2_BOILER.z / 100;
  // The crane at rest, as opening-view.ts leaves it: the jib east, the hook 3 m out and 8 m up.
  const REST = { yaw: Math.PI / 2, out: 3, y: crane.CY + 8 };
  const over = { yaw: Math.atan2(px - crane.CX, pz - crane.CZ), out: Math.hypot(px - crane.CX, pz - crane.CZ) };
  const top = crane.CY + crane.MAST - 0.25;
  let part: 'boiler' | 'breaker' | null | undefined,
    swing = 0, // 0 the jib at rest, 1 over the pedestal with the hook on the part
    lift = 0, // 0 on the pedestal, 1 held
    cueSeen = forgeCue.count,
    lifting = false,
    lifts = 0;
  // The three: on the forge's side of the pedestal, off road 1 (which runs along its other side), facing the part.
  const toForge = Math.atan2(-11, -10); // the forge stands about 10 m west and 11 m north of the pedestal
  const spots = [-0.95, 0, 0.95].map((a) => {
    const x = px + Math.sin(toForge + a) * 3.1,
      z = pz + Math.cos(toForge + a) * 3.1;
    return { x, z, y: land.H(x, z) };
  });
  let kit: Kit | null = null;
  let guys: ReturnType<Kit['addLooker']>[] = [];
  void import('../../place/folk.ts').then((k) => {
    if (!owner.alive) return;
    kit = k;
    guys = spots.map((s, n) => {
      const foreman = n === FOREMAN.index;
      const yaw = Math.atan2(px - s.x, pz - s.z);
      return k.addLooker(s.x, s.y, s.z, yaw, foreman ? FOREMAN.coat : COATS[n % COATS.length]!, {
        on: false,
        tool: foreman,
      });
    });
    owner.cleanup(() => {
      for (const g of guys) {
        const i = k.folk.guys.indexOf(g);
        if (i >= 0) k.folk.guys.splice(i, 1);
      }
      guys = [];
    });
  });
  owner.cleanup(() => {
    pedestalHold.lift = 0;
    pedestalHold.yaw = HOIST.yaw0;
  });
  function pose() {
    const s = smoothstep(0, 1, swing);
    const yaw = REST.yaw + (over.yaw - REST.yaw) * s,
      out = REST.out + (over.out - REST.out) * s;
    // The hook rides down onto the part as the jib arrives, then up with it.
    const y = REST.y + (pedestalHold.top + 0.12 - REST.y) * s;
    const x = crane.CX + Math.sin(yaw) * out,
      z = crane.CZ + Math.cos(yaw) * out;
    crane.jib.rotation.y = yaw;
    crane.hook.position.set(x, y, z);
    crane.rope.position.set(x, (top + y) / 2, z);
    crane.rope.scale.y = Math.max(0.2, top - y);
  }
  function folkUpdate() {
    // They wave at whoever is looking: you within 30 m, or the camera while a show's cut stands at the pedestal (you
    // are 500 m off at Far Head or the pier then, and the cut is the one time everyone sees them).
    const body = me.body?.position,
      eye = camera.position;
    const p = body && Math.hypot(body.x - px, body.z - pz) <= HOIST.wave ? body : eye;
    for (const g of guys) {
      g.on = !!part;
      if (!part) continue;
      const near = Math.hypot(p.x - g.x, p.z - g.z) <= HOIST.wave;
      g.mood = near ? 'wave' : 'idle';
      g.yaw = near ? Math.atan2(p.x - g.x, p.z - g.z) : Math.atan2(px - g.x, pz - g.z);
    }
  }
  return {
    /** The foreman's body once the kit has loaded; forge-guide.ts directs him after `update`. */
    foreman: () => guys[FOREMAN.index] ?? null,
    /** Snap to the state (first frame, reload, late join, resync): a waiting part is held already. */
    restore() {
      part = waits();
      swing = lift = part ? 1 : 0;
      lifting = false;
      cueSeen = forgeCue.count;
      pedestalHold.lift = lift * HOIST.lift;
      if (!pedestalHold.top) pedestalHold.top = py + 2;
      pose();
      folkUpdate();
    },
    /** Before the boiler's and the breaker's views, which draw the part at `pedestalHold`. */
    update(dt: number) {
      const now = waits();
      if (part === undefined) {
        part = now;
        swing = lift = now ? 1 : 0;
      }
      if (now && now !== part) {
        // A live cast: down on the pedestal until the call sounds.
        lift = 0;
        lifting = false;
        cueSeen = forgeCue.count;
      }
      part = now;
      if (!pedestalHold.top) pedestalHold.top = py + 2;
      swing = clamp(swing + (part ? dt : -dt) / HOIST.swingS, 0, 1);
      if (part && !lifting && lift < 1 && forgeCue.count !== cueSeen) lifting = true;
      if (!part) lift = 0;
      else if (lifting && swing >= 1) {
        if (lift === 0) {
          clank(px, pz);
          lifts++;
        }
        lift = reducedMotion ? 1 : Math.min(1, lift + dt / HOIST.liftS);
        if (lift >= 1) lifting = false;
      }
      pedestalHold.lift = smoothstep(0, 1, lift) * HOIST.lift;
      pedestalHold.yaw = part && lift > 0 ? pedestalHold.yaw + dt * HOIST.turn * (reducedMotion ? 0.3 : 1) : HOIST.yaw0;
      pose();
      folkUpdate();
    },
    inspect: () => ({
      hoist: {
        part: part ?? null,
        swing,
        lift: pedestalHold.lift,
        yaw: pedestalHold.yaw,
        lifts,
        hook: { x: crane.hook.position.x, y: crane.hook.position.y, z: crane.hook.position.z },
        guys: guys.map((g) => ({ on: g.on, mood: g.mood, x: g.x, z: g.z })),
        mounted: !!kit,
      },
    }),
  };
}
