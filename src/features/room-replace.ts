// Replace room with stage, as the players in the room see it (docs/plans/room-fast-forward.md; the control is Dev →
// Room, src/debug/dev/room.ts; docs/game-design/dev-menu.md):
// - The countdown: the server's one-off `replacing` notice (the room interface's onReplacing) shows in the notification
//   lane and counts down each second. The room then closes; every page reconnects, finds a new world and reloads
//   (src/features/room-reset.ts), so nothing held or ridden carries over.
// - The line: on that reload, once you're in, one notice says what happened. Only a browser that was in the replaced
//   room gets it (src/boot/world-reset.ts's replacedStage); a first visit reads nothing.
// The words are the plan's (src/net/ws-wire.ts), UI text and not The Boogler's. Local, DOM only.
import { productionRailway } from '../proto/flags.ts';
import { getRoomId, onRoomReady } from '../netplay/net.ts';
import { countdownAt, countdownText, startCountdown, type Countdown } from '../netplay/replace-countdown.ts';
import { replacedText } from '../net/ws-wire.ts';
import { replacedStage } from '../boot/world-reset.ts';
import { jumpOf } from '../world/railway-jump.ts';
import { notify } from '../ui/notify.ts';
import { me } from '../player/player.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../entity/entity.ts';

const KEY = 'room-replacing';
const LINE_DELAY_S = 4; // after entering, as the jump room's line waits (src/features/jump-in.ts)
const LINE_MS = 12000;

let countdown: Countdown | null = null;
let shown = -1;
let dismiss: (() => void) | null = null;
let timer = 0;
function tick() {
  const notice = countdown && countdownAt(countdown, performance.now());
  if (!notice) {
    clearInterval(timer);
    dismiss?.();
    countdown = dismiss = null;
    return;
  }
  if (notice.seconds === shown) return;
  // The first one pops; each second after refreshes it quietly.
  dismiss = notify(countdownText(notice), { kind: 'news', ttl: 0, key: KEY, quiet: shown >= 0 });
  shown = notice.seconds;
}

defineKind('room-replaced-line', { lateUpdate: 45 });
if (productionRailway) {
  onRoomReady((room) => {
    room.onReplacing((notice) => {
      countdown = startCountdown(notice, performance.now());
      shown = -1;
      clearInterval(timer);
      timer = window.setInterval(tick, 200); // wall clock: a paused or hidden game still counts down
      tick();
    });
  });
  if (replacedStage) line(jumpOf(replacedStage)?.label ?? replacedStage);
}

// The one line after a replacement, once you're in.
function line(label: string) {
  let since = -1;
  const waiting: GameEntity = spawn({
    kind: 'room-replaced-line',
    lateUpdate({ now }) {
      if (!me.entered) return;
      if (since < 0) since = now;
      if (now - since < LINE_DELAY_S * 1000) return;
      notify(replacedText(label, getRoomId() === 'boogle'), { kind: 'news', ttl: LINE_MS, key: 'room-replaced' });
      despawn(waiting);
    },
  });
}
