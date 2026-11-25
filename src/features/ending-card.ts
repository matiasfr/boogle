// Local ending card. A rebuilt mirror supplies a baseline, never a live arrival.
import './ending-card.css';
import { defineKind, spawn } from '../entity/entity.ts';
import { onRailwayCommands, railwayCommands } from '../entities/railway/state.ts';
import { railwayGlideOpen } from '../entities/railway/glide.ts';
import { seated } from '../entities/railway/seat.ts';
import { fallArrival } from '../fall/arrival.ts';
import { onStart } from '../loop.ts';
import { wrapAction } from '../player/controls.ts';
import { inputState } from '../player/input-state.ts';
import { me } from '../player/player.ts';
import { holdCamera, momentBusy } from '../render/buddy-frame.ts';
import { routeRow } from '../sim/railway-queries-route.ts';

let previous: number | undefined;
let owed = false;
let mine = false;
let card: HTMLElement | null = null;
let dismissAt = 0;

function close() {
  if (card) holdCamera(card, false);
  card?.remove();
  card = null;
  if (inputState.holder === 'ending-card') {
    inputState.held = false;
    inputState.holder = null;
  }
}

function dismiss() {
  if (performance.now() >= dismissAt) close();
}

function show() {
  owed = false;
  card = document.createElement('section');
  card.className = 'ending-card';
  const line = document.createElement('p');
  line.textContent = 'Thanks for playing (placeholder)';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Close';
  button.onclick = dismiss;
  card.append(line, button);
  (document.querySelector('.hud') ?? document.body).append(card);
  dismissAt = performance.now() + (mine ? 1500 : 0);
  if (mine) {
    holdCamera(card, true);
    inputState.holder = 'ending-card';
    inputState.held = true;
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

onStart(() => {
  let unsubscribe = () => {};
  onRailwayCommands((session) => {
    unsubscribe();
    close();
    previous = undefined;
    mine = owed = false;
    if (!session) return;
    const reset = session.onReset(() => {
      previous = routeRow(session.read.world()).arrived;
      mine = owed = false;
    });
    const receipt = session.onAccepted((e) => {
      if (e.op === 'rail.arrive') mine = true;
    }, 'command');
    unsubscribe = () => {
      reset();
      receipt();
    };
  });
  wrapAction('interact', {
    down(next) {
      if (card && inputState.holder === 'ending-card') dismiss();
      else next();
    },
  });
});

defineKind('ending-card', { lateUpdate: 43 });
spawn({
  kind: 'ending-card',
  lateUpdate() {
    const read = railwayCommands()?.read;
    if (!read?.whole()) return;
    const arrived = routeRow(read.world()).arrived;
    if (previous === -1 && arrived >= 0) owed = true;
    previous = arrived;
    if (
      owed &&
      me.entered &&
      me.coyote > 0 &&
      !me.swimming &&
      !fallArrival.active &&
      !inputState.seated &&
      !inputState.held &&
      !seated() &&
      !railwayGlideOpen() &&
      !momentBusy()
    )
      show();
  },
});
