// Which way of moving logs the haul prototype is testing (docs/game-design/haul.md, "Prototype: haul variants"):
// `?proto=haul&v=barrow` (push a wheelbarrow), `&v=toss` (throw logs at the site), `&v=wave` (the richest bundles
// sit on a sandbar a wave sweeps) or `&v=magnet` (today's loop with Ratchet-style bolt pickups: piles notice you from
// further off and fly in one by one); none is today's loop. The variant's code lives in src/proto/haul/ and loads only
// with the flag; the eager haul modules (work-sites, piles, log-sources) read this to step aside. Local: only this tab.
import { protoOn, protoV } from '../proto/flags.ts';

const q = new URLSearchParams(location.search);
const v = protoOn('haul') ? protoV('haul') : null;
export type HaulVariant = 'barrow' | 'toss' | 'wave' | 'magnet' | null;
export const haulVariant: HaulVariant = v === 'barrow' || v === 'toss' || v === 'wave' || v === 'magnet' ? v : null;
/** The barrow's tray: in a `proto-` room it raises the room's hard cap to this (src/proto/haul/barrow.ts). */
export const BARROW_CAP = 150;
/** The variant replaces walking into a ring as the way logs reach a site (barrow tips, toss throws). */
export const pourByHand = haulVariant === 'barrow' || haulVariant === 'toss';
// How far from a pile's centre walking takes it (metres). The host doesn't check reach, so it is a Local dial: the
// magnet variant's 3.0 m (docs/research/ratchet-and-clank-feel.md rec 1), `&reach=` to compare 2.2 and 4.0.
const reach = Number(q.get('reach'));
export const pickReach = haulVariant === 'magnet' ? (reach > 0 && reach <= 8 ? reach : 3) : 1.3;

// Seams the variant fills in when it loads: why you can't take logs from a bundle at (x, z) right now (null: you can),
// and whether a palm's bundle (by source id) lies somewhere else instead (the wave's sandbar draws and takes it).
export const haulHooks: { takeBlocked: (x: number, z: number) => string | null; moved: (id: number) => boolean } = {
  takeBlocked: () => null,
  moved: () => false,
};
