// Owner-requested regression: reset must reach a registered owner even while its effect is absent.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const saved = new Map<string, string>();
Object.defineProperty(globalThis, 'location', { value: new URL('http://localhost/?dev=1'), configurable: true });
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  },
  configurable: true,
});
const { registerGraphics, setGraphics, resetGraphics, graphicsSnapshot, graphicsOverrides } =
  await import('../src/graphics-settings.ts');

test('baseline restores absent owners before their effects become available again', async () => {
  let absent = false;
  const values = new Map<string, boolean>();
  const stops = ['foliage', 'lab-effects'].map((id) => {
    values.set(id, true);
    return registerGraphics({
      id,
      label: id,
      choices: [true, false],
      default: true,
      applyMode: 'live',
      cost: 'draw',
      skips: 'effect draw',
      available: () => (absent ? 'Effect absent in this preset' : null),
      read: () => values.get(id)!,
      apply: (value) => {
        values.set(id, value === true);
      },
    });
  });
  try {
    for (const id of values.keys()) await setGraphics(id, false);
    absent = true;
    await assert.rejects(setGraphics('foliage', true), /Effect absent/);
    await resetGraphics();
    assert.deepEqual([...values.values()], [true, true]);
    assert.deepEqual(graphicsOverrides(), {});
    assert.equal(saved.has('boogle.dev.graphics.v1'), false);
    absent = false;
    assert.ok(graphicsSnapshot().every((row) => row.available && row.effective === true && !row.pending));
  } finally {
    for (const stop of stops) stop();
  }
});
