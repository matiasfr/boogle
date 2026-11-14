// A room whose world started over since this browser was last in it (an operator reset or restore: `npm run server`,
// server/src/admin.ts) starts the player over too, as a world reset does (docs/decisions.md, 2026-11-09): the next load
// forgets this room's progress and is a first visit, the fall and the card (src/boot/world-reset.ts). It reloads rather
// than clearing here, because this page's pagehide handlers would write the old progress back. Railway rooms only.
// Serves DESIGN.md 8 (Designed for drop-in).
import { getRoomId, onRoomReady } from '../netplay/net.ts';
import { roomReplacedNow } from '../netplay/room-seed.ts';
import { roomReborn, roomResetNote, ROOM_RESET_KEY } from '../player/world-reset.ts';
import { background } from '../async.ts';
import { productionRailway } from '../proto/flags.ts';
import { railwayRoomId } from '../world/railway-namespace.ts';

if (productionRailway)
  onRoomReady((room) => {
    const id = railwayRoomId(getRoomId());
    const check = () => {
      const born = room.born();
      if (!born) return;
      try {
        if (!roomReborn(localStorage, id, born)) return;
        sessionStorage.setItem(ROOM_RESET_KEY, roomResetNote(id, getRoomId()));
      } catch {
        return; // no storage: nothing to forget
      }
      // One short question before the reload: a world that is a replacement by a stage is named in the note, so the
      // next load lands at the stage and shows the line (src/features/room-replace.ts). No answer: an ordinary reset.
      background(
        roomReplacedNow().then((replaced) => {
          try {
            if (replaced?.born === born)
              sessionStorage.setItem(ROOM_RESET_KEY, roomResetNote(id, getRoomId(), replaced.stage));
          } catch {
            // as above
          }
          location.reload();
        }),
        'room reset',
      );
    };
    check();
    room.onConnection((connected) => connected && check()); // a reset while playing: everyone reconnects into it
  });
