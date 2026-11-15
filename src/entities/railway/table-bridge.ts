// The turntable's bridge as geometry, with no three.js: the deck's size, the two yaws it rests at, where its handle
// stands, and whether a player is clear of the deck's volume. Shared by the view that draws and collides the bridge
// (./roundhouse-view.ts) and the cue that points at its handle (./works-view.ts), so both read one pose. Local.
import { PLAYER_R } from '../../constants.ts';
import { ROTUNDA_HOME, TABLE } from '../../place/home-station.ts';
import { bayFrame } from '../../place/rotunda.ts';

type XZ = { x: number; z: number };
/** The timber deck's width and thickness (m); the view adds 0.9 m girders below its edges. */
export const BRIDGE = { w: 3.2, h: 0.4 } as const;
/** The handle's place on the deck: this far short of the deck's end, and in from its edge (m). */
const HANDLE = { fromEnd: 0.8, inset: 0.15 };
/** The deck's half length on a table of radius `r`: a hand short of the rim. */
const halfLength = (r: number) => r - 0.15;

/** The deck's yaw at the table's two stops (`shed.table`): toward the working bay's road, and down the spur. */
export function tableYaws(): [number, number] {
  const spur = (TABLE.spur * Math.PI) / 180;
  return [bayFrame(ROTUNDA_HOME, ROTUNDA_HOME.order[0]!).yaw, Math.atan2(Math.sin(spur), -Math.cos(spur))];
}
/** The handle on a deck turned `yaw` on a table at `table` of radius `r`: beside the deck's far end, on it. */
export function bridgeHandle(table: XZ, r: number, yaw: number): XZ {
  const along = r - HANDLE.fromEnd,
    across = BRIDGE.w / 2 - HANDLE.inset;
  return {
    x: table.x + Math.sin(yaw) * along + Math.cos(yaw) * across,
    z: table.z + Math.cos(yaw) * along - Math.sin(yaw) * across,
  };
}
/** Whether a player's body (its centre, `PLAYER_R` over its feet) is clear of the deck resting at `yaw`, whose top is
 * at `top`: off its footprint by the body's own radius, or standing at its top or higher. The deck's collider is put
 * back only then, so it never returns through someone who dropped into the pit while it turned. No player is clear. */
export function clearOfBridge(
  table: XZ,
  r: number,
  yaw: number,
  top: number,
  body: { x: number; y: number; z: number } | null | undefined,
): boolean {
  if (!body) return true;
  if (body.y - PLAYER_R >= top - 0.05) return true;
  const dx = body.x - table.x,
    dz = body.z - table.z;
  const along = dx * Math.sin(yaw) + dz * Math.cos(yaw),
    across = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  return Math.abs(across) >= BRIDGE.w / 2 + PLAYER_R || Math.abs(along) >= r + PLAYER_R;
}
/** The deck's collider box on a table of radius `r`: half its width, depth and length. */
export const bridgeHalf = (r: number) => ({ hx: BRIDGE.w / 2, hy: BRIDGE.h / 2, hz: halfLength(r) });
