// Which way of moving logs the haul prototype is testing (docs/game-design/haul.md, "Prototype: haul variants"):
// `?proto=haul&v=barrow` (push a wheelbarrow), `&v=toss` (throw logs at the site) or `&v=wave` (the richest bundles
// sit on a sandbar a wave sweeps); none is today's loop. The variant's code lives in src/proto/haul/ and loads only
// with the flag; the eager haul modules (work-sites, piles, log-sources) read this to step aside. Local: only this tab.
const q = new URLSearchParams(location.search);
const v = q.get('proto') === 'haul' ? q.get('v') : null;
export type HaulVariant = 'barrow' | 'toss' | 'wave' | null;
export const haulVariant: HaulVariant = v === 'barrow' || v === 'toss' || v === 'wave' ? v : null;
/** The variant replaces walking into a ring as the way logs reach a site (barrow tips, toss throws). */
export const pourByHand = haulVariant === 'barrow' || haulVariant === 'toss';

// Seams the variant fills in when it loads: why you can't take logs from a bundle at (x, z) right now (null: you can),
// and whether a palm's bundle (by source id) lies somewhere else instead (the wave's sandbar draws and takes it).
export const haulHooks: { takeBlocked: (x: number, z: number) => string | null; moved: (id: number) => boolean } = {
  takeBlocked: () => null,
  moved: () => false,
};
