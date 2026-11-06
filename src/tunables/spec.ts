// The bounds check every tunable number shares; no imports, so owners and the catalog can both use it.
export type NumberBounds = { min: number; max: number; integer: boolean };
export function validValue(spec: NumberBounds, value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    !Object.is(value, -0) &&
    (!spec.integer || Number.isSafeInteger(value)) &&
    value >= spec.min &&
    value <= spec.max
  );
}
