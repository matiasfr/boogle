// What the Interact button does in ?proto=place: one list of everything in reach right now. Also the way back up if you fall.
import * as THREE from 'three/webgpu';
import { NO_TARGETS, registerInteractable, type Interactable } from '../../player/hands.ts';
import { myBundleNext } from '../../features/haul-stack.ts';
import { me } from '../../player/player.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { PLAYER_R } from '../../constants.ts';
import { teleport } from '../../physics/engine.ts';
import { carry } from '../../physics/platforms.ts';
import { clank } from '../../render/machine-sfx.ts';
import { protoCount } from '../count.ts';
import { playMark } from '../mark.ts';
import { knock, pop } from '../minis/common.ts';
import { drawHeaps, topSlot } from '../net/crates.ts';
import { wakeTrains } from './cargo.ts';
import {
  ROCK_LIST,
  TREES,
  back,
  breakRock,
  chop,
  putDownBig,
  standing,
  trunkAt,
  trunkDown,
  whole,
  type Tree,
} from './chop.ts';
import { coop } from './coop.ts';
import { onCart, rack, rackTake } from './depot.ts';
import { forge, rackFrom, rackTop, takeRail } from './forge.ts';
import { nearestCrate, openCrate, owned, shelfSpot, showing, swapSlot } from './gifts.ts';
import { H, PATH_SAMPLES } from './land.ts';
import { job, save } from './job.ts';
import { ORIGIN, SHELF, SPAWN, TUNE, VILLAGE, lineAt, railY, toWorld } from './layout.ts';
import { L1, allHeaps, hub, lines, machine } from './lines.ts';
import { send } from './pieces.ts';
import { SCOPE_AT, boilerAt, lookThrough } from './props.ts';
import { activeFrame, mark, run, wake } from './run.ts';
import { seated, sitDown, standUp } from './seat.ts';
import { SHORE_SAMPLES } from './terrain.ts';

const SHELF_AT = { x: toWorld(SHELF.x), z: SHELF.z };
const atPrompt = new THREE.Vector3();
const prompts = new Map<string, THREE.Vector3>();
const promptAt = (id: string, x: number, y: number, z: number) => {
  let v = prompts.get(id);
  if (!v) prompts.set(id, (v = new THREE.Vector3()));
  return v.set(x, y, z);
};
// ---------------------------------------------------------------- never stuck
const nearestSample = (x: number, z: number) => {
  let bd = Infinity,
    best: [number, number, number] = [SPAWN.x, SPAWN.z, VILLAGE.y];
  for (const path of [...PATH_SAMPLES, SHORE_SAMPLES])
    for (let n = 0; n < path.length; n += 2) {
      const q = path[n]!;
      const d = (q[0] + ORIGIN.x - x) ** 2 + (q[1] - z) ** 2;
      if (d < bd && q[2] > 1.6) {
        bd = d;
        best = q;
      }
    }
  // The track you've laid counts as a path: a long swim home off a trestle isn't anybody's idea of fun.
  const at = { x: 0, z: 0, ux: 0, uz: 1 };
  for (const l of lines) {
    const { line } = l.spec;
    // Opening Far Head does not build the pier. Recover only onto an existing two-metre track collider.
    for (const solid of l.track.solids) {
      if (!solid.on || solid.s === undefined) continue;
      const s = solid.s;
      lineAt(line, s, at);
      const d = (at.x + ORIGIN.x - x) ** 2 + (at.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = [at.x, at.z, railY(line, s) + 0.2];
      }
    }
  }
  return best;
};
export const offThePath = (x: number, z: number) => {
  const q = nearestSample(x, z);
  return Math.hypot(q[0] + ORIGIN.x - x, q[1] - z) > 20;
};
export function backUp() {
  const b = me.body;
  if (!b) return;
  const q = nearestSample(b.position.x, b.position.z);
  teleport(b, q[0] + ORIGIN.x, Math.max(H(q[0] + ORIGIN.x, q[1]), q[2] + 0.12) + PLAYER_R + 0.4, q[1]); // a bridge's samples are over water
  b.velocity.set(0, 0, 0);
  carry.x = carry.z = 0;
}

// ---------------------------------------------------------------- taking things
export const incoming = { rails: 0, logs: 0 };
const scratch = new THREE.Vector3(),
  scratch2 = new THREE.Vector3(),
  bundleRot = new THREE.Quaternion();
function takeRails() {
  const st = activeFrame();
  if (!st) return;
  const want = Math.min(st.wants('rails') - back.rails - incoming.rails, back.room(), forge.rails);
  for (let k = 0; k < want; k++) {
    rackTop(forge.rails, scratch);
    takeRail();
    back.incoming++;
    incoming.rails++;
    send('rail', scratch, scratch, {
      dur: 0.3 + k * 0.05,
      apex: 1,
      aim: (to) => {
        if (me.body) to.set(me.body.position.x, me.body.position.y + 0.8, me.body.position.z);
      },
      land: () => {
        back.incoming--;
        incoming.rails--;
        back.rails++;
        clank(rackFrom.x, rackFrom.z);
      },
    });
  }
  if (want > 0) mark('took rails');
  coop.took('rails', want);
  save();
}
function flyLogToBack(from: THREE.Vector3, k: number) {
  back.incoming++;
  incoming.logs++;
  send('log', from, from, {
    dur: 0.3 + k * 0.04,
    apex: 1,
    aim: (to) => {
      if (myBundleNext(back.logs, scratch, bundleRot)) to.copy(scratch);
    },
    land: () => {
      back.incoming--;
      incoming.logs--;
      back.logs++;
      pop(k, 0.45);
    },
  });
}
function takeTimber() {
  const st = activeFrame();
  if (!st) return;
  const want = Math.min(st.wants('logs') - back.logs - incoming.logs, back.room());
  let sent = 0;
  for (let k = 0; k < want; k++) {
    if (job.loose <= 0) {
      if (!hub.list.length) break;
      topSlot(hub, scratch2);
      hub.list.pop();
      job.loose += TUNE.crateLogs;
      drawHeaps(allHeaps);
    } else topSlot(hub, scratch2);
    job.loose--;
    sent++;
    flyLogToBack(scratch2, k);
  }
  if (sent) {
    coop.took('timber', sent);
    knock(0.6, 0.8);
    save();
  }
}
const hasTimber = () => hub.list.length > 0 || job.loose > 0;
/** Off the rack by the frame: logs and rails, as the frame still wants them. */
function takeFromRack() {
  const st = activeFrame();
  if (!st) return;
  const room = () => back.room();
  const rails = Math.max(0, Math.min(st.wants('rails') - back.rails - incoming.rails, rack.rails, room()));
  for (let k = 0; k < rails; k++) {
    back.incoming++;
    incoming.rails++;
    send('rail', rack.at, rack.at, {
      dur: 0.3 + k * 0.04,
      apex: 1,
      aim: (to) => {
        if (me.body) to.set(me.body.position.x, me.body.position.y + 0.8, me.body.position.z);
      },
      land: () => {
        back.incoming--;
        incoming.rails--;
        back.rails++;
        clank(rack.x, rack.z);
      },
    });
  }
  const logs = Math.max(0, Math.min(st.wants('logs') - back.logs - incoming.logs, rack.logs, room()));
  for (let k = 0; k < logs; k++) flyLogToBack(rack.at, k);
  rackTake(logs, rails);
  if (logs + rails) {
    coop.took('rack', logs, rails);
    knock(0.6, 0.8);
    save();
  }
}

// ---------------------------------------------------------------- the button
const sitAt = new THREE.Vector3();
export const onDeck = () =>
  machine.onMachine(carry.on) || lines.some((l) => l.train.onTrain(carry.on)) || onCart(carry.on);
function chopTree(t: Tree) {
  if (!chop(t)) return;
  if (t.strokes === 0) {
    protoCount('chops');
    playMark('chop', { great: t.great });
  }
}
registerInteractable(() => {
  if (!me.body || fallArrival.active) return NO_TARGETS;
  const p = me.body.interpolatedPosition;
  let out: Interactable[] | null = null;
  // Sitting, the one thing the button does is stand you up.
  if (seated()) {
    sitAt.set(p.x, p.y + 1.1, p.z);
    return [{ id: 'place-stand', verb: 'Stand up', at: sitAt, r: 100, run: standUp }];
  }
  // In the water, or down on a shore or a river bank well off every path: never stuck with no way back.
  if (me.swimming || (p.y < VILLAGE.y - 6 && offThePath(p.x, p.z))) {
    atPrompt.set(p.x, p.y + 1.2, p.z);
    return [{ id: 'place-back', verb: 'Back up the path', at: atPrompt, run: backUp }];
  }
  const crate = nearestCrate(p.x, p.z, 3.4);
  if (crate && !showing())
    (out ??= []).push({
      id: 'place-crate',
      verb: crate.c.content === 'axe' || crate.c.content === 'pack' ? 'Open the chest' : 'Open the crate',
      at: crate.at,
      run: () => {
        openCrate(crate.c);
        protoCount('gifts');
      },
    });
  if (run.mode === 'asleep' && machine.distance(p.x, p.z) < 6)
    (out ??= []).push({
      id: 'place-wake',
      verb: 'Wake it up',
      at: promptAt('wake', machine.flatbed.x, machine.flatbed.y + 2.4, machine.flatbed.z),
      run: () => wake(),
    });
  if (job.awake && job.rung.multi) {
    for (const t of TREES) {
      if (!standing(t)) continue;
      const reach = t.great ? 4.6 : 3.2;
      if (Math.hypot(p.x - t.x, p.z - t.z) > reach) continue;
      if (t.great) {
        (out ??= []).push(
          back.big
            ? { id: 'place-great', verb: 'Chop', at: t.at, click: true, blocked: 'Your hands are full' }
            : { id: 'place-great', verb: 'Chop', at: t.at, click: true, run: () => void chopTree(t) },
        );
        continue;
      }
      (out ??= []).push({
        id: `place-tree${t.index}`,
        verb: 'Chop',
        at: t.at,
        click: true,
        run: () => void chopTree(t),
      });
    }
    for (const q of job.rung.multi ? ROCK_LIST : []) {
      if (!whole(q) || Math.hypot(p.x - q.x, p.z - q.z) > q.r + 2.6) continue;
      (out ??= []).push(
        back.room() <= 0
          ? { id: `place-rock${q.index}`, verb: 'Break', at: q.at, click: true, blocked: 'Your back is full' }
          : { id: `place-rock${q.index}`, verb: 'Break', at: q.at, click: true, run: () => void breakRock(q) },
      );
    }
    if (trunkDown()) {
      const q = trunkAt();
      if (Math.hypot(p.x - q.x, p.z - q.z) < 6.5)
        (out ??= []).push({
          id: 'place-trunk',
          verb: 'Shoulder the trunk',
          at: promptAt('trunk', q.x, q.y, q.z),
          r: 10,
          run: () => {
            coop.big('beam');
          },
        });
    }
  }
  // The rack by the forge, and the village's heap: there while line 2 needs them.
  const st = activeFrame();
  if (st && job.turned) {
    if (Math.hypot(p.x - rackFrom.x, p.z - rackFrom.z) < 4)
      (out ??= []).push(
        st.wants('rails') - back.rails - incoming.rails <= 0
          ? { id: 'place-rack', verb: 'Take rails', at: rackFrom, blocked: 'Station has enough' }
          : back.room() <= 0
            ? { id: 'place-rack', verb: 'Take rails', at: rackFrom, blocked: 'Your back is full' }
            : forge.rails <= 0
              ? { id: 'place-rack', verb: 'Take rails', at: rackFrom, blocked: 'Forge is pouring' }
              : { id: 'place-rack', verb: 'Take rails', at: rackFrom, run: takeRails },
      );
    if (hasTimber() && Math.hypot(p.x - hub.x, p.z - hub.z) < 4.2) {
      const at = promptAt('heap', hub.x, VILLAGE.y + 2, hub.z);
      (out ??= []).push(
        st.wants('logs') - back.logs - incoming.logs <= 0
          ? { id: 'place-heap', verb: 'Take timber', at, blocked: 'Station has enough' }
          : back.room() <= 0
            ? { id: 'place-heap', verb: 'Take timber', at, blocked: 'Your back is full' }
            : { id: 'place-heap', verb: 'Take timber', at, run: takeTimber },
      );
    }
    if (rack.on && rack.logs + rack.rails > 0 && Math.hypot(p.x - rack.x, p.z - rack.z) < 3.6)
      (out ??= []).push(
        back.room() <= 0
          ? { id: 'place-rack2', verb: 'Take from the rack', at: rack.promptAt, blocked: 'Your back is full' }
          : { id: 'place-rack2', verb: 'Take from the rack', at: rack.promptAt, run: takeFromRack },
      );
  }
  // The boiler: the last thing by hand.
  if (job.boiler === 1) {
    const q = boilerAt();
    if (Math.hypot(p.x - q.x, p.z - q.z) < 3.6)
      (out ??= []).push({
        id: 'place-boiler',
        verb: 'Shoulder the boiler',
        at: promptAt('boiler', q.x, q.y + 0.6, q.z),
        run: () => {
          coop.big('boiler');
        },
      });
  }
  if (back.big === 'boiler') {
    const c = L1.train.tr.cars[0]!;
    if (Math.hypot(p.x - c.x, p.z - c.z) < 7)
      (out ??= []).push({
        id: 'place-fit',
        verb: 'Fit the boiler',
        at: promptAt('fit', c.x, c.y + 2, c.z),
        run: () => {
          if (coop.bigBusy()) return;
          putDownBig();
          wakeTrains();
          playMark('boiler fitted');
        },
      });
  }
  // The shelf's your wardrobe: swap what's in a slot.
  if (Math.hypot(p.x - SHELF_AT.x, p.z - SHELF_AT.z) < 4.4)
    for (const slot of ['hat', 'accessory', 'outfit', 'pet'] as const)
      if (owned(slot).length)
        (out ??= []).push({
          id: `place-swap-${slot}`,
          verb: `Swap ${slot}`,
          at: shelfSpot(slot, promptAt(slot, 0, 0, 0)),
          run: () => swapSlot(slot),
        });
  // The old telescope on the ridge: it's pointed at something.
  if (Math.hypot(p.x - SCOPE_AT.x, p.z - SCOPE_AT.z) < 3.4)
    (out ??= []).push({ id: 'place-scope', verb: 'Look through it', at: SCOPE_AT, run: lookThrough });
  // On a deck, with nothing else to press for: sit. Far down the pick's order (r), so anything nearer that acts wins.
  if (onDeck() && !out?.some((t) => t.run)) {
    sitAt.set(p.x, p.y + 1.1, p.z);
    (out ??= []).push({ id: 'place-sit', verb: 'Sit', at: sitAt, r: -100, run: sitDown });
  }
  return out ?? NO_TARGETS;
});
