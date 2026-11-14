// Local residency and completed-mount notifications; importing this never starts an entity or builds scenery.
export const routeAreas = new Map<string, { x: number; z: number; mounted: boolean }>();
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
