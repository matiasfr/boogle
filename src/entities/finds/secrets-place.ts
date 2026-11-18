// Where a secret's fixed thing stands: content/levels/secrets.ts's operands (its header says what each means), resolved
// against Place's pads and secrets (src/place/tech-layout.ts, which stays the authority) and the ground. Pure: the
// secrets view, the level check's drawn census and the tests resolve the same placements through it.
import type { Placement } from '../../prefab/types.ts';
import type { Pad, Secret } from '../../place/tech-layout.ts';

export type SecretsFrame = {
  /** ORIGIN.x: Place's frame to the world's. */
  ox: number;
  H(x: number, z: number): number;
  pad(id: string): Pad;
  secret(id: string): Secret;
};

const num = (v: unknown, name: string) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`secrets: expected finite ${name}`);
  return v;
};

/** The placement in the world, or null where it has nothing to stand on (a support whose ledge is under the ground). */
export function placeSecretThing(p: Placement, f: SecretsFrame): Placement | null {
  const params = p.params ?? {};
  const [kind, id] = String(params.on).split(':');
  if (!id || (kind !== 'pad' && kind !== 'secret')) throw new Error(`secrets: ${p.id} stands on nothing`);
  const pad = kind === 'pad' ? f.pad(id) : null;
  const s = kind === 'secret' ? f.secret(id) : null;
  const a = pad
    ? { x: pad.x, y: pad.top, z: pad.z }
    : { x: s!.x, y: s!.y === null ? f.H(s!.x + f.ox, s!.z) : s!.y, z: s!.z };
  const [dx, dy, dz] = p.pos;
  let x = a.x + dx,
    z = a.z + dz;
  if (params.edge !== undefined) {
    if (!pad || !Array.isArray(params.edge)) throw new Error(`secrets: ${p.id} has no pad edge`);
    x += num(params.edge[0], 'edge') * pad.hx;
    z += num(params.edge[1], 'edge') * pad.hz;
  }
  let y = params.ground === true ? f.H(x + f.ox, z) + dy : a.y + dy;
  let scale = p.scale;
  if (params.fit !== undefined) {
    if (!pad) throw new Error(`secrets: ${p.id} fits no pad`);
    if (params.fit === 'slab') {
      const thick = num(params.thick, 'thick');
      y -= thick / 2;
      scale = [pad.hx * 2, thick, pad.hz * 2];
    } else if (params.fit === 'block' || params.fit === 'column') {
      const ground = f.H(x + f.ox, z) - 0.5;
      const base = params.fit === 'block' ? ground : Math.min(ground, y - 1),
        h = y - base;
      if (h <= 0) return null;
      y = base + h / 2;
      const inset = params.fit === 'block' ? num(params.inset, 'inset') : 0;
      scale = params.fit === 'block' ? [pad.hx * 2 - inset, h, pad.hz * 2 - inset] : [1, h, 1];
    } else throw new Error(`secrets: ${p.id} has an unknown fit`);
  }
  const extra = {
    ...(params.face === true ? { yaw: Math.atan2(z - a.z, a.x - x) } : {}),
  };
  return {
    ...p,
    pos: [x + f.ox, y, z],
    ...(params.tilt !== undefined ? { rot: [0, num(params.tilt, 'tilt') * Math.PI * 2, 0] as const } : {}),
    ...(scale ? { scale } : {}),
    params: { ...params, ...extra },
  };
}
