// Local residency and completed-mount notifications; importing this never starts an entity or builds scenery.
export const routeAreas = new Map<string, { x: number; z: number; mounted: boolean }>();
/** The saved ride's platform can request its scenery while the loading cover is still up. */
export const returnArea = { platform: null as { x: number; z: number } | null };
const listeners = new Set<() => void>();
export const routeAreasPending = (x: number, z: number) =>
  [...routeAreas.values()].some((area) => Math.hypot(x - area.x, z - area.z) < 400 && !area.mounted);
export function onRouteSceneryMounted(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function routeSceneryMounted() {
  for (const fn of listeners) fn();
}
/** A mounted area's labels by text key (`bell.pad-gorge`): repaints the label's lines while its area stands. The leg
 * view (which reads the room) relabels a pad as its stall connects; the massing itself reads no progress. */
export const areaLabels = new Map<string, (lines: readonly string[]) => void>();
export const areaBoardVisibility = new Map<string, (visible: boolean) => void>();
