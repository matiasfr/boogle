// Coming back where you left off: each room's memory (src/player/arrival.ts) keeps the last place you stood, and a
// returning visit starts there, facing the same way (docs/game-design/first-run.md). Anywhere it can't trust gets the usual
// spawn: no record, a different world, or ground that's moved or gone under the sea. Only a place you were standing still
// counts, never a deck, a seat or the water. Local: this browser's own. Serves DESIGN.md 8 (Designed for drop-in).
import { SEA, SOFT_WALL } from '../constants.ts';
import { onEntered } from '../entities/player/state.ts';
import { groundHeight } from '../island/heights.ts';
import { getRoomId } from '../netplay/net.ts';
import { teleport } from '../physics/engine.ts';
import { carry } from '../physics/platforms.ts';
import { addWelcomeItem, isFirstVisit, roomMemory, SPOT_KEY } from '../player/arrival.ts';
import { inputState } from '../player/input-state.ts';
import { cam, me } from '../player/player.ts';
import { PROTO, productionRailway } from '../proto/flags.ts';
import { WORLD_NS } from '../world/namespace.ts';

type Spot = { x: number; y: number; z: number; yaw: number; ns: string };
const LIFT = 0.1; // m, so you don't start in the ground you stood on

const standing = () => me.coyote > 0 && !me.swimming && !me.down && !inputState.seated && !carry.x && !carry.z;

addWelcomeItem({
  key: SPOT_KEY,
  save() {
    if (!me.body || !standing()) return undefined; // keep the last good one
    const { x, y, z } = me.body.position;
    return { x, y, z, yaw: cam.yaw, ns: WORLD_NS } satisfies Spot;
  },
  since: () => null, // it's where you are, not news
});

function trusted(v: unknown): Spot | null {
  const s = v as Spot | null | undefined;
  if (!s || s.ns !== WORLD_NS) return null;
  if (![s.x, s.y, s.z, s.yaw].every(Number.isFinite)) return null;
  if (Math.abs(s.x) > SOFT_WALL || Math.abs(s.z) > SOFT_WALL) return null;
  const ground = groundHeight(s.x, s.z);
  return ground > SEA && s.y >= ground - 0.2 ? s : null; // under the ground: a cave, or ground that has moved
}

onEntered(() => {
  if (isFirstVisit() || PROTO || productionRailway) return; // a prototype, and the current game, have their own spawn
  const s = trusted(roomMemory(getRoomId())?.items[SPOT_KEY]);
  if (!s) return;
  teleport(me.body!, s.x, s.y + LIFT, s.z);
  cam.yaw = s.yaw; // enterIsland faces you this way
});
