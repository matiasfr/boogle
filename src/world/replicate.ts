// Replication core, shared part (docs/plans/replication.md, "Change tracking and delta encoding"): the component
// schema and the wire shapes both ends agree on. Headless and pure. Not yet used by any state (R0); the server side is
// ./replicate-server.ts, the client mirror and prediction hooks ./replicate-client.ts.
//
// A schema is language-neutral and storage-neutral: a kind name and a field -> type table, nothing about how the
// rules store it. One schema drives the codec, the client mirror's validation and (later) the save rows.
//
//   const tree = defineReplicated('tree', { left: 'u8', work: 'u8', fallYaw: 'q16', fell: 'bool' })
//   validFields(tree, value, partial)   a decoded field object is well-formed for the kind (all fields unless partial)
//   cellOf(xCm, zCm)                    the relevancy cell of a world position; GLOBAL_CELL for room-wide state
//
// Wire (JSON over the room's ordered socket, one or more chunks per send, each under MAX_PACKET_CHARS):
//   server -> client  { t:'s', tk, ack?, rej?, ids?, x?, c? }
//       tk    the room clock step this packet is current to (src/world/room-clock.ts)
//       ack   [epoch, request]: the highest action of this client's session applied (the existing railway pair)
//       rej   [[epoch, request, reason], ...] refused actions
//       ids   [[tempId, serverId], ...] predicted spawns re-keyed
//       x     [[kind, id], ...] despawns, applied before c
//       c     [[kind, id, { field: value }], ...] changed fields of changed components; a spawn carries every field
//       w     1 on the last chunk of a client's first send after it joined: its mirror is whole from here on
//       ev    [{ field: value }, ...] one-off events since the last send (accepted actions, for effects), read after
//             x and c are applied; never part of the mirror, never re-sent to a late joiner
//   client -> server  { t:'a', ep, rq, op, ...fields }   an action, identified by (epoch, request)
export type FieldType = 'bool' | 'u8' | 'u16' | 'u32' | 'i32' | 'int' | 'q16' | 'f32' | 'str';
export type FieldValue = number | boolean | string;
export type Fields = Record<string, FieldValue>;
export type EntityId = number | string;
export type Schema = Readonly<{ kind: string; fields: Readonly<Record<string, FieldType>>; names: readonly string[] }>;

export type ActionId = readonly [epoch: number, request: number];
export type Change = [kind: string, id: EntityId, fields: Fields];
export type Despawn = [kind: string, id: EntityId];
export type ServerPacket = {
  t: 's';
  tk: number;
  ack?: ActionId;
  rej?: [epoch: number, request: number, reason: string][];
  ids?: [temp: string, id: EntityId][];
  x?: Despawn[];
  c?: Change[];
  ev?: Fields[];
  w?: 1;
};

export const GLOBAL_CELL = 'g';
/** Relevancy cell edge in centimetres (64 m to start). */
export const CELL_CM = 6400;
/** The room caps messages at 16 KB; escaping can grow a packet, so chunks stay well under it. */
export const MAX_PACKET_CHARS = 12000;
export const MAX_STR = 64;

const KIND = /^[a-z][a-zA-Z0-9]{0,23}$/;
const TYPES: ReadonlySet<string> = new Set(['bool', 'u8', 'u16', 'u32', 'i32', 'int', 'q16', 'f32', 'str']);

export function defineReplicated(kind: string, fields: Record<string, FieldType>): Schema {
  if (!KIND.test(kind)) throw new Error(`replicated kind name ${kind}`);
  const names = Object.keys(fields);
  if (!names.length) throw new Error(`replicated kind ${kind} has no fields`);
  for (const f of names) if (!KIND.test(f) || !TYPES.has(fields[f]!)) throw new Error(`replicated field ${kind}.${f}`);
  return Object.freeze({ kind, fields: Object.freeze({ ...fields }), names: Object.freeze(names) });
}

export function validValue(type: FieldType, v: unknown): v is FieldValue {
  switch (type) {
    case 'bool':
      return typeof v === 'boolean';
    case 'u8':
      return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0xff;
    case 'u16':
    case 'q16':
      return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0xffff;
    case 'u32':
      return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0xffffffff;
    case 'i32':
      return Number.isInteger(v) && (v as number) >= -0x80000000 && (v as number) <= 0x7fffffff;
    case 'int':
      return Number.isSafeInteger(v);
    case 'f32':
      return typeof v === 'number' && Number.isFinite(v);
    case 'str':
      return typeof v === 'string' && v.length <= MAX_STR;
  }
}

export const validId = (v: unknown): v is EntityId =>
  (Number.isSafeInteger(v) && (v as number) >= 0) || (typeof v === 'string' && v.length > 0 && v.length <= MAX_STR);

/** A decoded field object: only declared fields, each well-typed; every field unless partial. */
export function validFields(schema: Schema, value: unknown, partial: boolean): value is Fields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  let n = 0;
  for (const k in o) {
    const type = schema.fields[k];
    if (!type || !Object.hasOwn(o, k) || !validValue(type, o[k])) return false;
    n++;
  }
  return partial ? n > 0 : n === schema.names.length;
}

export const cellOf = (xCm: number, zCm: number, size = CELL_CM) =>
  `${Math.floor(xCm / size)},${Math.floor(zCm / size)}`;

/** Cells whose square overlaps a circle of radiusCm around (x, z), plus the global cell. */
export function cellsNear(xCm: number, zCm: number, radiusCm: number, size = CELL_CM) {
  const out = [GLOBAL_CELL];
  const x0 = Math.floor((xCm - radiusCm) / size),
    x1 = Math.floor((xCm + radiusCm) / size);
  const z0 = Math.floor((zCm - radiusCm) / size),
    z1 = Math.floor((zCm + radiusCm) / size);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) out.push(`${i},${j}`);
  return out;
}

/** A one-off event: a flat object of up to MAX_EVENT_KEYS well-formed scalar fields. */
export const MAX_EVENT_KEYS = 24;
export function validEvent(v: unknown): v is Fields {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  let n = 0;
  for (const k in v as Record<string, unknown>) {
    const x = (v as Record<string, unknown>)[k];
    if (!KIND.test(k) || ++n > MAX_EVENT_KEYS) return false;
    if (!(typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x)) || validValue('str', x)))
      return false;
  }
  return n > 0;
}

export const entityKey = (kind: string, id: EntityId) => `${kind}:${typeof id === 'number' ? id : `s${id}`}`;
