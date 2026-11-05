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
const {
  registerGraphics,
  setGraphics,
  resetGraphics,
  graphicsSnapshot,
  graphicsOverrides,
  restoreGraphics,
  setPlayerGraphics,
  setGraphicsPreset,
} = await import('../src/graphics-settings.ts');

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

test('Dev overrides and reset preserve the saved player choice', async () => {
  let resolution: string | number = 'auto';
  const stop = registerGraphics({
    id: 'resolution',
    label: 'Resolution',
    choices: ['auto', 1, 0.8, 0.6],
    default: 'auto',
    applyMode: 'live',
    cost: 'pixels',
    skips: 'pixels',
    read: () => resolution,
    apply: (value) => {
      resolution = value as string | number;
    },
  });
  try {
    await setPlayerGraphics('resolution', 0.6);
    const player = saved.get('boogle.graphics.v1');
    await setGraphics('resolution', 1);
    assert.equal(resolution, 1);
    await resetGraphics();
    assert.equal(resolution, 0.6);
    assert.equal(saved.get('boogle.graphics.v1'), player);
    await setGraphicsPreset('auto');
    assert.equal(resolution, 'auto');
    assert.equal(saved.has('boogle.graphics.v1'), false);
  } finally {
    stop();
  }
});

test('an explicit baseline override still applies to a late owner with another current look', async () => {
  await restoreGraphics({ bloom: false });
  let bloom = true;
  const stop = registerGraphics({
    id: 'bloom',
    label: 'Bloom',
    choices: [true, false],
    default: false,
    applyMode: 'live',
    cost: 'passes',
    skips: 'passes',
    read: () => bloom,
    apply: (value) => {
      bloom = value === true;
    },
  });
  try {
    await Promise.resolve();
    assert.equal(bloom, false);
  } finally {
    stop();
    await resetGraphics();
  }
});
