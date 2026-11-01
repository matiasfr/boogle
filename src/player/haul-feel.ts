// The haul's Local feel numbers (only this tab, never sent): how the stack on your back sways, and how fast you pour
// into a work site. src/features/haul-stack.ts and work-sites.ts read them every frame; the haul playtest kit
// (?proto=haul, src/debug/haul-kit.ts) changes them live. Pours stay safe to speed up: the host checks each one against
// your own stack. Defaults are the shipped values.
export const HAUL_FEEL_DEFAULTS = {
  sway: 0.012, // metres of sway per piece at or under the soft cap
  swayOver: 0.05, // extra sway per piece at twice the soft cap
  swayHz: 2.2, // sway speed (radians per second, plus the overload)
  pourMs: 300, // one site.stock this often while you stand in a ring
  pourN: 2, // pieces per pour
  flyMs: 380, // pickups flying to your back
};
export type HaulFeel = typeof HAUL_FEEL_DEFAULTS;
export const haulFeel: HaulFeel = { ...HAUL_FEEL_DEFAULTS };
