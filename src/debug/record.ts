// `?record=1` (src/features/record.ts): writes down what this tab's player does, for `npm run sim -- replay` to play back
// headless on another build (dev/sim/README.md). Each frame, before anything reads them: the frame's dt, what changed in
// `input`, `inputState` and the camera's yaw and pitch, and the presses since the frame before. Each frame, after the
// world phase: the state the replay will be compared with.
//
//   boogle.record.start()   starts over, from the next frame you have a body in. ?record=1 has already called it
//   boogle.record.stop()    stops, and returns the recording
//   boogle.record.save()    downloads it, as the pill on screen does
//
// Presses come from the wrapped actions (every pad slot: keys, the pad, touch buttons and triggerAction reach them) and
// from what input.ts binds by hand (Space, E, R, the touch jump and grab buttons), read on their way in. A press also
// says what it acted on, and a release the throw it made, since those read the camera and the wall clock, which a
// replay doesn't have.
import './record.css';
import { BUILD } from '../build-id.ts';
import { ball } from '../entities/ball/state.ts';
import { onFrame } from '../loop.ts';
import { net, remotes } from '../netplay/net.ts';
import { physicsClock } from '../physics/engine.ts';
import { actionForSlot, isTyping, PAD, wrapAction, type Action } from '../player/controls.ts';
import { dom } from '../player/dom.ts';
import { interactTarget } from '../player/hands.ts';
import { input, inputState } from '../player/input-state.ts';
import { cam, me } from '../player/state.ts';
import { aimPoint, chargeAmount } from '../player/throw.ts';
import {
  stringifyRecording,
  traceRow,
  type FrameChanges,
  type Press,
  type PressData,
  type Recording,
} from './record-format.ts';

const MOVE_KEYS = /^(Key[WASD]$|Arrow|Shift)/; // in input.keys every frame already
const xyz = (v: { x: number; y: number; z: number }) => [v.x, v.y, v.z];
const xyzw = (q: { x: number; y: number; z: number; w: number }) => [q.x, q.y, q.z, q.w];

function snapshot() {
  return {
    yaw: cam.yaw,
    pitch: cam.pitch,
    keys: [...input.keys].sort().join(),
    stickX: input.stickX,
    stickY: input.stickY,
    sprint: input.sprint,
    triggerL: input.triggerL,
    triggerR: input.triggerR,
    charging: me.charging,
    mine: ball.mine,
    state: { ...inputState },
  };
}

let waiting = false;
let rec: Recording | null = null;
let last: Recording | null = null; // the one stop() ended
let pending: Press[] = [];
let was = snapshot();

function begin() {
  const b = me.body!;
  rec = {
    version: 1,
    build: BUILD,
    room: new URLSearchParams(location.search).get('room') ?? '',
    peers: remotes.size,
    start: {
      clock: physicsClock(),
      player: {
        p: xyz(b.position),
        v: xyz(b.velocity),
        yaw: me.yaw,
        coyote: me.coyote,
        jumpQueued: me.jumpQueued,
        jumpHeld: me.jumpHeld,
        swimming: me.swimming,
        holding: me.holding,
        charging: me.charging,
      },
      cam: { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist },
      input: {
        keys: [...input.keys].sort(),
        stickX: input.stickX,
        stickY: input.stickY,
        sprint: input.sprint,
        triggerL: input.triggerL,
        triggerR: input.triggerR,
      },
      state: { ...inputState },
      ball: {
        p: xyz(ball.pose.p),
        q: xyzw(ball.pose.q),
        v: xyz(ball.body.velocity),
        w: xyz(ball.body.angularVelocity),
        mine: ball.mine,
        held: ball.held,
      },
    },
    frames: [],
    trace: [],
  };
  pending = [];
  was = snapshot();
}

// The frame's input, as updateIntent is about to read it.
function changesSince() {
  const now = snapshot();
  const out: FrameChanges = {};
  if (now.yaw !== was.yaw) out.yaw = now.yaw;
  if (now.pitch !== was.pitch) out.pitch = now.pitch;
  if (now.keys !== was.keys) out.keys = [...input.keys].sort();
  for (const k of ['stickX', 'stickY', 'triggerL', 'triggerR'] as const) if (now[k] !== was[k]) out[k] = now[k];
  for (const k of ['sprint', 'charging', 'mine'] as const) if (now[k] !== was[k]) out[k] = now[k];
  for (const [k, v] of Object.entries(now.state)) {
    if (v !== was.state[k as keyof typeof was.state]) (out.state ??= {})[k] = v;
  }
  if (pending.length) out.presses = pending;
  pending = [];
  was = now;
  return Object.keys(out).length ? out : undefined;
}

function note(id: string, down: 0 | 1, data?: PressData) {
  if (rec) pending.push(data ? [id, down, data] : [id, down]);
}
// What a press would act on, only when it can (not winding up, nothing blocked).
function pressData(): PressData | undefined {
  const t = me.charging ? null : interactTarget();
  return t?.run ? { t: t.id } : undefined;
}
// The throw a release is about to make: its charge and aim read the wall clock and the camera.
function releaseData(): PressData | undefined {
  if (!me.charging || me.suppressUp) return undefined;
  const { x, y, z } = aimPoint();
  return { c: chargeAmount(), aim: [x, y, z] };
}

// Only the outermost press of a chain.
let depth = 0;
const pass = (next: () => void) => {
  depth++;
  try {
    next();
  } finally {
    depth--;
  }
};
const wrapped = new WeakSet<Action>();
function wrapNewActions() {
  for (const slot of PAD) {
    const action = actionForSlot(slot);
    if (!action || wrapped.has(action)) continue;
    wrapped.add(action);
    wrapAction(action.id, {
      down(next) {
        if (!depth) note(action.id, 1, action.id === 'use' ? undefined : pressData());
        pass(next);
      },
      up(next) {
        // The throw reads the clock too, a tick later (100 us here), and a tick of charge is 2 mm/s off by the first
        // bounce. So the clock stands still from here until it has thrown.
        const at = performance.now();
        performance.now = () => at;
        try {
          if (!depth) note(action.id, 0, releaseData());
          pass(next);
        } finally {
          delete (performance as { now?: unknown }).now;
        }
      },
    });
  }
}

// Read on the way in, ahead of input.ts's own listeners, since what they're about to do reads the same state.
addEventListener(
  'keydown',
  (e) => {
    if (!me.entered || isTyping(e)) return;
    if (e.code === 'Space')
      note('jump', 1); // repeats too: holding Space queues the next jump
    else if (e.repeat || MOVE_KEYS.test(e.code)) return;
    else if (e.code === 'KeyE') note('e', 1, pressData());
    else if (e.code === 'KeyR') note('respawn', 1);
    else note(`key:${e.code}`, 1);
  },
  { capture: true },
);
addEventListener(
  'keyup',
  (e) => {
    if (e.code === 'Space') note('jump', 0);
    else if (e.code === 'KeyE') note('e', 0);
    else if (e.code !== 'KeyR' && !MOVE_KEYS.test(e.code)) note(`key:${e.code}`, 0);
  },
  { capture: true },
);
const onButton = (el: HTMLElement, ev: string, fn: () => void) => el.addEventListener(ev, fn, { capture: true });
onButton(dom.jumpBtn, 'pointerdown', () => note('jump', 1));
onButton(dom.jumpBtn, 'pointerup', () => note('jump', 0));
onButton(dom.jumpBtn, 'pointercancel', () => note('jump', 0));
onButton(dom.grabBtn, 'pointerdown', () => note('touch', 1, pressData()));
onButton(dom.grabBtn, 'pointerup', () => note('touch', 0, releaseData()));

onFrame(
  ({ dt }) => {
    wrapNewActions();
    if (waiting && me.body) {
      waiting = false;
      begin();
    }
    if (!rec) return;
    rec.peers = Math.max(rec.peers, remotes.size);
    const changes = changesSince();
    rec.frames.push(changes ? [dt, changes] : [dt]);
  },
  { phase: 'prePhysics', order: -1000, name: 'record: input' },
);
// Right after the ball's -90, where the room settles who owns it: that belongs to this frame, not the next.
onFrame(
  () => {
    if (!rec || ball.mine === was.mine) return;
    was.mine = ball.mine;
    const frame = rec.frames.at(-1)!;
    frame[1] = { ...frame[1], mine: ball.mine };
  },
  { phase: 'prePhysics', order: -85, name: 'record: ball owner' },
);
onFrame(
  () => {
    if (!rec) return;
    rec.trace.push(traceRow(me, ball));
    if (rec.trace.length % 30 === 0) showPill();
  },
  { phase: 'world', order: 9000, name: 'record: trace' },
);

// Pointer lock has the mouse: Esc gives it back, for the pill.
const pill = document.createElement('button');
pill.type = 'button';
pill.className = 'record-pill';
document.body.append(pill);
pill.addEventListener('click', () => {
  if (rec) stop();
  save();
});
function showPill() {
  pill.textContent = rec ? `Recording ${(rec.trace.length / 60).toFixed(0)} s: stop and save` : 'Save the recording';
}

function start() {
  rec = null;
  waiting = true;
  pill.textContent = 'Recording';
}
function stop() {
  waiting = false;
  last = rec ?? last;
  rec = null;
  showPill();
  return last;
}
function save() {
  if (!last) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([stringifyRecording(last)], { type: 'application/json' }));
  a.download = `boogle-recording-${last.room || net.myPeer || 'room'}-${last.frames.length}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

window.boogle.record = { start, stop, save };
start();
