// Shared validation and --key=value parsing for the offline economy tools.
export function number(value: number, label: string, minimum = 0, integer = false) {
  if (!Number.isFinite(value) || value < minimum || (integer && !Number.isSafeInteger(value)))
    throw new Error(`${label}: expected ${integer ? 'integer' : 'number'} >= ${minimum}, got ${value}`);
  return value;
}

export function parseOption(arg: string): [string, string] | undefined {
  const [key, value] = arg.slice(2).split('=');
  if (!arg.startsWith('--') || value === undefined || value.trim() === '') return;
  return [key!, value];
}
