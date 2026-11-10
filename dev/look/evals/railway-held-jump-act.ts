// Action half of railway-held-jump.ts: jump, air jump while still rising, and hold Jump for six seconds.
const { hold } = (await import(
  '/dev/look/bots/railway-held-jump.ts' as string
)) as typeof import('../bots/railway-held-jump.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background(hold(), 'double jump and hold Jump');
export {};
