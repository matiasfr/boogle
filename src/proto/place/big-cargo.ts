// Shared prototype cargo ledger, owned by coop.ts. No physics or lockstep state.
export type BigCargo = 'beam' | 'boiler';
export type GroundCargo = { x: number; y: number; z: number; yaw: number };
export type CargoState = { revision: number; holder: string | null; ground: GroundCargo | null };
export const freshCargo = (): CargoState => ({ revision: 0, holder: null, ground: null });
export const bigCargo = { beam: freshCargo(), boiler: freshCargo() };
export const isBigCargo = (v: unknown): v is BigCargo => v === 'beam' || v === 'boiler';
export function validGround(v: unknown): v is GroundCargo {
  const p = v as GroundCargo | null;
  return !!p && [p.x, p.y, p.z, p.yaw].every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 10000);
}
export function validCargo(v: unknown): v is CargoState {
  const s = v as CargoState | null;
  return (
    !!s &&
    Number.isSafeInteger(s.revision) &&
    s.revision >= 0 &&
    (s.holder === null || (typeof s.holder === 'string' && s.holder.length > 0 && s.holder.length <= 128)) &&
    (s.ground === null || (s.holder === null && validGround(s.ground)))
  );
}
/** A revision spends one availability/hold exactly once, including delayed duplicate requests. */
export function moveCargo(
  s: CargoState,
  by: string,
  revision: number,
  action: 'pick' | 'drop',
  ground: GroundCargo | null,
): CargoState | null {
  if (revision !== s.revision || (action === 'pick' ? s.holder !== null : s.holder !== by)) return null;
  return { revision: s.revision + 1, holder: action === 'pick' ? by : null, ground: action === 'pick' ? null : ground };
}
/** Conservative dry terrain footprint; bridges, roofs, steep slopes and obstructed approaches return to source. */
export function cargoGround(
  kind: BigCargo,
  p: GroundCargo,
  height: (x: number, z: number) => number | null,
  clear: (x: number, y: number, z: number) => boolean,
): GroundCargo | null {
  const x = p.x - Math.sin(p.yaw) * 2.4,
    z = p.z - Math.cos(p.yaw) * 2.4;
  const y = height(x, z);
  if (y === null || y < 2.5 || Math.abs(y - p.y) > 0.8) return null;
  const yaw = p.yaw + Math.PI / 2;
  const ground = { x, y, z, yaw };
  return cargoFootprint(kind, ground, height, clear) ? ground : null;
}
/** Recheck saved ground cargo too: terrain and obstructions can change after Drop. */
export function cargoFootprint(
  kind: BigCargo,
  p: GroundCargo,
  height: (x: number, z: number) => number | null,
  clear: (x: number, y: number, z: number) => boolean,
): boolean {
  if (!validGround(p)) return false;
  const { x, y, z, yaw } = p;
  const half = kind === 'beam' ? 5.25 : 0.8;
  for (let d = -half; d <= half + 0.01; d += half / 6) {
    const sx = x + Math.sin(yaw) * d,
      sz = z + Math.cos(yaw) * d;
    for (const side of [-0.8, 0, 0.8]) {
      const px = sx + Math.cos(yaw) * side,
        pz = sz - Math.sin(yaw) * side;
      const h = height(px, pz);
      if (h === null || !Number.isFinite(h) || h < 2.5 || Math.abs(h - y) > 0.4 || !clear(px, y + 1.1, pz))
        return false;
    }
  }
  return true;
}
