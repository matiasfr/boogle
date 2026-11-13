// Display data only: keep native libm's last bits out of committed page bytes. Three decimals preserve millimetres
// (and milliradians) while existing coarser per-field rounding still applies. Never use this for the sim catalog.
export const pageNumber = (value: number) => Number(value.toFixed(3));
export const pageJson = (value: unknown, space?: number) =>
  JSON.stringify(value, (_key, item: unknown) => (typeof item === 'number' ? pageNumber(item) : item), space);
