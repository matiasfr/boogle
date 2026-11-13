// Playtest jump-ins in the game (docs/plans/playtest-jump-in.md; docs/game-design/dev-menu.md, "Jump in"):
// - Pause → More → Jump in: one button per stage (src/world/railway-jump.ts) that opens a fresh private room seeded
//   there (`/?from=<stage>`, src/boot/jump-in.ts). Shown with Dev on for this device, and inside any jump room.
// - One line per room on this device, through the notification lane: "A test room, started at <label>. The shared
//   island is unchanged." So a friend who joined by invite knows it's a test room. No HUD badge.
// The landing at the segment is the railway arrival's (src/entities/railway/arrival.ts). Local, DOM only.
import { productionRailway } from '../proto/flags.ts';
import { devEnabled } from '../dev-preferences.ts';
import { pausePages } from '../player/pause-pages.ts';
import { roomSeed } from '../netplay/room-seed.ts';
import { getRoomId } from '../netplay/net.ts';
import { railwayRoomId } from '../world/railway-namespace.ts';
import { JUMPS, jumpOf } from '../world/railway-jump.ts';
import type { RoomSeed } from '../world/railway-jump.ts';
import { notify } from '../ui/notify.ts';
import { me } from '../player/player.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { background } from '../async.ts';

const SEEN = (room: string) => `boogle.jump.seen.v1:${railwayRoomId(room)}`;
const NOTE_DELAY_S = 4; // after entering, so the welcome card and the late-join flourishes go first
const NOTE_MS = 7000;

const labelOf = (seed: RoomSeed) => jumpOf(seed.stage)?.label ?? seed.stage;

function mount(parent: HTMLElement) {
  const head = document.createElement('p');
  head.className = 'pause-note';
  head.textContent = 'Jump in opens a new private room. This world stays as it is.';
  const list = document.createElement('div');
  list.className = 'pause-list';
  const go = (text: string, line: string, href: string) => {
    const b = document.createElement('button');
    b.className = 'pause-btn';
    b.type = 'button';
    const strong = document.createElement('strong');
    strong.textContent = text;
    b.append(strong);
    if (line) {
      const small = document.createElement('small');
      small.textContent = ` ${line}`;
      b.append(small);
    }
    b.onclick = () => location.assign(href);
    list.append(b);
  };
  for (const j of JUMPS) go(j.label, j.line, `/?from=${j.stage}`);
  parent.append(head, list);
  let disposed = false;
  background(
    roomSeed().then((seed) => {
      if (disposed || !seed) return;
      head.replaceChildren(
        'This room started at ',
        Object.assign(document.createElement('strong'), { textContent: labelOf(seed) }),
      );
      go('Back to the shared island', '', '/');
    }),
    'jump-in page seed',
  );
  return () => {
    disposed = true;
  };
}

let registered = false;
function register() {
  if (registered) return;
  registered = true;
  pausePages.push({ id: 'jump-in', label: 'Jump in', mount });
}

if (productionRailway) {
  if (devEnabled) register();
  background(
    roomSeed().then((seed) => {
      if (!seed) return;
      register(); // inside a jump room, Dev or not: nothing there can be spoiled
      note(seed);
    }),
    'jump-in room seed',
  );
}

// The one arrival line per room, once you're in.
defineKind('jump-in-note', { lateUpdate: 45 });
function note(seed: RoomSeed) {
  const key = SEEN(getRoomId());
  try {
    if (localStorage.getItem(key)) return;
  } catch {
    // Without storage the line shows each visit, which is harmless.
  }
  let since = -1;
  const waiting: GameEntity = spawn({
    kind: 'jump-in-note',
    lateUpdate({ now }) {
      if (!me.entered) return;
      if (since < 0) since = now;
      if (now - since < NOTE_DELAY_S * 1000) return;
      notify(`A test room, started at ${labelOf(seed)}. The shared island is unchanged.`, {
        kind: 'info',
        ttl: NOTE_MS,
        key: 'jump-in',
      });
      try {
        localStorage.setItem(key, '1');
      } catch {
        // as above
      }
      despawn(waiting);
    },
  });
}
