// Which way of moving logs the haul prototype is testing (docs/game-design/haul.md, "Prototype: haul variants"):
// `?proto=haul&v=barrow` (push a wheelbarrow) or `&v=toss` (throw logs at the site); none is today's loop. The
// variant's code lives in src/proto/haul/ and loads only with the flag; the eager haul modules (work-sites, piles,
// log-sources) read this to step aside. Local: only this tab.
const q = new URLSearchParams(location.search);
const v = q.get('proto') === 'haul' ? q.get('v') : null;
export type HaulVariant = 'barrow' | 'toss' | null;
export const haulVariant: HaulVariant = v === 'barrow' || v === 'toss' ? v : null;

// Seams the variant fills in when it loads: why you can't take logs from a bundle at (x, z) right now (null: you can).
export const haulHooks: { takeBlocked: (x: number, z: number) => string | null } = {
  takeBlocked: () => null,
};
