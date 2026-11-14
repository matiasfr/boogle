/** Conservative tripwire for committed content, not a serializer or precision conversion.
 * Longer numeric literals must be reviewed/expressed as authored operands, never rounded.
 * Generic compile() remains lossless for every finite authored JS number.
 */
export function assertAuthoredNumbers(value: unknown, path = '$'): void {
  if (typeof value === 'number') {
    const digits = String(value)
      .split('e')[0]!
      .replace(/[^0-9]/g, '')
      .replace(/^0+/, '')
      .replace(/0+$/, '');
    if (digits.length > 12) throw new Error(`${path}: ${value} looks derived; store authored operands, do not round`);
  } else if (Array.isArray(value)) value.forEach((v, i) => assertAuthoredNumbers(v, `${path}[${i}]`));
  else if (value && typeof value === 'object')
    for (const [key, v] of Object.entries(value)) assertAuthoredNumbers(v, path + '.' + key);
}
