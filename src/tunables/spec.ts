// The shape and bounds check every tunable number shares; no imports, so owners and the catalog can both use it.
export type NumberSpec = {
  id: string;
  type: 'number';
  scope: 'local' | 'owner' | 'lockstep';
  default: number;
  min: number;
  max: number;
  integer: boolean;
  units: string;
  at: string;
  owner: string;
  meaning?: string;
};
export function validValue(spec: NumberSpec, value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    !Object.is(value, -0) &&
    (!spec.integer || Number.isSafeInteger(value)) &&
    value >= spec.min &&
    value <= spec.max
  );
}
