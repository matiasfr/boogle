// The haul's Local feel numbers (only this tab, never sent): how fast you pour into a work site and how fast pickups
// fly to your back. src/features/haul-stack.ts and work-sites.ts read them every frame; the haul playtest kit
// (?proto=haul, src/debug/haul-kit.ts) changes them live. Pours stay safe to speed up: the host checks each one against
// your own stack. Defaults are the shipped values.
export const HAUL_FEEL_DEFAULTS = {
  pourMs: 300, // one site.stock this often while you stand in a ring
  pourN: 2, // pieces per pour
  flyMs: 380, // pickups flying to your back
};
export type HaulFeel = typeof HAUL_FEEL_DEFAULTS;
export const haulFeel: HaulFeel = { ...HAUL_FEEL_DEFAULTS };
