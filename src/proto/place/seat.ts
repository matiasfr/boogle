// Sitting on a deck in ?proto=place (owner: "be able to press X or square and have a sitting pose. That way I'm just not
// worried about falling off ... It just feels more relaxing"; docs/proposals/boogle-2.md, "you can sit on the train").
// Interact sits you where you stand on a train or the machine, a little inboard if you were at the edge; Interact or Jump
// stands you up. You stay held at that spot in the deck's frame through curves and stops; the camera stays yours and works
// as ever. The pose is the avatars' own seated clip (`seatedAt`, src/player/buddy/body.ts), as the soapbox does it. Local.
import { FIXED, PLAYER_R } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { onPreStep } from '../../physics/engine.ts';
import { carry, fromPlatform, toPlatform, type Local, type Platform } from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';

const INBOARD = 0.25; // m the seat keeps from the deck's edge
const SHUFFLE = 1.6; // m/s you shift inboard as you sit
const LOST = 1.5; // m from the seat: you were moved (a teleport, Start over, the panel), so you aren't sitting any more
const LOWER = 0.14; // m the seated avatar sits below where the body's sphere would put it

const seat = { on: null as Platform | null, l: { x: 0, y: 0, z: 0, yaw: 0 } as Local, yaw: 0 };
const at: Local = { x: 0, y: 0, z: 0, yaw: 0 };

export const seated = () => seat.on !== null;
/** Down onto the deck under you. */
export function sitDown() {
  const b = me.body,
    p = carry.on;
  if (!b || !p) return;
  toPlatform(p, b.position, 0, seat.l);
  seat.l.x = Math.max(-p.hx + INBOARD, Math.min(p.hx - INBOARD, seat.l.x));
  seat.l.z = Math.max(-p.hz + INBOARD, Math.min(p.hz - INBOARD, seat.l.z));
  seat.l.y = (p.topAt?.(seat.l.x, seat.l.z) ?? p.top) + PLAYER_R;
  seat.on = p;
  seat.yaw = me.yaw;
  b.velocity.set(carry.x, carry.y, carry.z);
}
export function standUp() {
  seat.on = null;
}

// Before the player's controller (40): no steering and no jump get through, a Jump stands you up, and the deck's carry
// (the controller's own) does the riding; this only takes out what drift there is.
onPreStep(
  () => {
    const b = me.body,
      p = seat.on;
    if (!p || !b) return;
    if (me.jumpQueued > 0) {
      me.jumpQueued = 0;
      standUp();
      return;
    }
    me.wish.set(0, 0, 0);
    // Cargo can change the deck beneath a seated player; follow the same surface as platform carry.
    seat.l.y = (p.topAt?.(seat.l.x, seat.l.z) ?? p.top) + PLAYER_R;
    fromPlatform(p, seat.l, false, at);
    const dx = at.x - b.position.x,
      dy = at.y - b.position.y,
      dz = at.z - b.position.z,
      d = Math.hypot(dx, dy, dz);
    if (d > LOST) return standUp();
    const most = SHUFFLE * FIXED;
    if (d > 0.002) {
      const k = Math.min(1, most / d);
      b.position.set(b.position.x + dx * k, b.position.y + dy * k, b.position.z + dz * k);
    }
  },
  { order: 21 },
);

// The stick still turns you in updateIntent: seated, you keep facing the way you sat, turning only with the deck
// (turnWithDeck, in the player's view at -290).
onFrame(
  () => {
    if (seat.on) me.yaw = seat.yaw;
  },
  { phase: 'world', order: 100 },
);
onFrame(
  () => {
    if (!seat.on) return;
    seat.yaw = me.yaw;
    const a = me.avatar;
    if (!a) return;
    const u = a.userData as { inner?: { position: { y: number } }; seatedAt?: number };
    u.seatedAt = performance.now();
    if (u.inner) u.inner.position.y -= LOWER;
  },
  { phase: 'update', order: 20 },
);
