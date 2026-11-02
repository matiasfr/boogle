// ?proto=onehand: do you miss the hotbar? One thing in your hands: picking something up replaces what you hold, which
// lands by your feet as a short toss, through the same toss everything else uses (`gift.toss`; the ball through its own
// throw). The slots stay underneath, as the rest of the game knows them, and this keeps at most one filled: it only
// watches them, so pickup, throwing, the Boogler's gift talk (he takes what's in your hand) and the ball following
// ownership all run as they do in the game. No hotbar on screen, and LB, RB and 1-5 change nothing. Local: no new state.
import './onehand.css';
import * as THREE from 'three';
import { onStart } from '../../loop.ts';
import { throwItem } from '../../adapters/gifts.ts';
import { throwBall } from '../../entities/ball/state.ts';
import { describeControl, wrapAction } from '../../player/controls.ts';
import { inv, onHotbarChange } from '../../player/inventory.ts';
import { cam, me } from '../../player/player.ts';
import { launch } from '../../player/throw.ts';
import { giftIndex } from '../../sim/gift-catalog.ts';

const DROP = { forward: 2.2, up: 3.2 }; // m/s: lands a step or two ahead, in reach to swap back

// Your saved hotbar sits this test out: it starts empty-handed, and the normal game gets it back on the way out.
const STORE = 'boogle.hotbar'; // src/player/inventory.ts
let saved: string | null = null;
try {
  saved = localStorage.getItem(STORE);
  addEventListener('pagehide', () => {
    if (saved === null) localStorage.removeItem(STORE);
    else localStorage.setItem(STORE, saved);
  });
} catch {
  // storage unavailable: the hotbar was never saved either
}
inv.slots.fill(null);
inv.sel = -1;
inv.version++;

function dropIt(id: string) {
  const { p } = launch(id, 0);
  const v = new THREE.Vector3(-Math.sin(cam.yaw) * DROP.forward, DROP.up, -Math.cos(cam.yaw) * DROP.forward);
  if (id === 'ball') {
    me.holding = true; // src/player/hands.ts has already put it on your back: a throw takes it from the hand
    throwBall(p, v);
    return true;
  }
  return throwItem(giftIndex(id), p, v);
}

const filled = () => inv.slots.map((s) => s?.id ?? '').join();
let was = filled();
let hand = inv.sel;
onHotbarChange(() => {
  if (filled() === was) inv.sel = hand; // a digit, LB or RB: only the selection changed
  // What isn't in your hand has to go. If it can't be sent it stays, and goes with the next change.
  inv.slots.forEach((s, k) => {
    if (s && k !== inv.sel && dropIt(s.id)) inv.slots[k] = null;
  });
  was = filled();
  hand = inv.sel;
});

onStart(() => {
  // A press would still run the hotbar's change listeners, and an empty slot in hand would put a wind-up away.
  wrapAction('slot-prev', { down: () => {} });
  wrapAction('slot-next', { down: () => {} });
  describeControl('hotbar', {
    label: 'Hold one thing at a time',
    detail: 'Picking something up drops what you hold',
    group: 'hands',
    order: 2,
  });
});
