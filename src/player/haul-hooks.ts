// The seam a world that moves the palms' log bundles elsewhere fills in (the Place and net prototypes, the railway
// arrival): whether a palm's bundle (by source id) lies somewhere else instead, so log-sources leaves it alone.
export const haulHooks: { moved: (id: number) => boolean } = {
  moved: () => false,
};
