// Local ending card. A rebuilt mirror supplies a baseline, never a live arrival.
import './ending-card.css';
import { defineKind, spawn } from '../entity/entity.ts';
import { onRailwayCommands, railwayCommands } from '../entities/railway/state.ts';
import { railwayGlideOpen } from '../entities/railway/glide.ts';
import { railwayMirror } from '../world/game-world.ts';
import { fallArrival } from '../fall/arrival.ts';
import { onStart } from '../loop.ts';
import { wrapAction } from '../player/controls.ts';
import { closeModal, openModal } from '../player/modal.ts';
import { inputState } from '../player/input-state.ts';
import { me } from '../player/player.ts';
import { momentBusy } from '../render/buddy-frame.ts';
import { routeRow } from '../sim/railway-queries-route.ts';

let previous: number | undefined;
let owed = false;
let mine = false;
let card: HTMLElement | null = null;
let dismissAt = 0;

function close() {
  if (card && mine) closeModal();
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
    openModal({
      passKeys: true,
      onPad: (slot) => {
        if (slot === 'x') dismiss();
      },
    });
    inputState.holder = 'ending-card';
    inputState.held = true;
  }
}

onStart(() => {
  railwayMirror?.mirror.onPacket((packet) => {
    const pid = railwayCommands()?.read.pid;
    if (pid && packet.ev?.some((e) => e.op === 'rail.arrive' && e.pid === pid && e.accepted === 1)) mine = true;
  });
  let unsubscribe = () => {};
  onRailwayCommands((session) => {
    unsubscribe();
    close();
    previous = undefined;
    mine = owed = false;
    if (!session) return;
    const reset = session.onReset(() => {
      previous = routeRow(session.read.world()).arrived;
      if (!card) mine = false;
      owed = false;
    });
    unsubscribe = reset;
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
      !railwayMirror?.seats.seatOf(read.pid) &&
      !railwayGlideOpen() &&
      !momentBusy()
    )
      show();
  },
});
