// The preferred point, then the same six approaches used for shared jump landings.
const offsets = [
  { x: 0, z: 0 },
  ...Array.from({ length: 6 }, (_, k) => ({
    x: 1.4 * Math.sin((k * Math.PI) / 3),
    z: 1.4 * Math.cos((k * Math.PI) / 3),
  })),
];

export function freeLanding(center: { x: number; z: number }, available: (x: number, z: number) => boolean) {
  for (const offset of offsets) {
    const x = center.x + offset.x,
      z = center.z + offset.z;
    if (available(x, z)) return { x, z };
  }
  return null;
}
