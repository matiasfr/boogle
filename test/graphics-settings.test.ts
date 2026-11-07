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

test('the detail ladder: the governor and a fixed Detail choice move the owners it names, explicit values win', async () => {
  const { setAutoDetail, autoDetail } = await import('../src/graphics-settings.ts');
  const state: Record<string, boolean | string> = { seaDetail: 'full', shadows: true, detail: 'auto' };
  const own = (id: string, choices: (boolean | string)[], baseline: boolean | string) =>
    registerGraphics({
      id,
      label: id,
      choices,
      default: baseline,
      applyMode: 'live',
      cost: 'draw',
      skips: 'draw',
      read: () => state[id]!,
      apply: (value) => {
        state[id] = value as boolean | string;
      },
    });
  const stops = [
    own('seaDetail', ['full', 'low'], 'full'),
    own('shadows', [true, false], true),
    own('detail', ['auto', 'full', 'sea', 'shadows', 'lowest'], 'auto'),
  ];
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  try {
    setAutoDetail(1, false);
    await settle();
    assert.deepEqual([state.seaDetail, state.shadows], ['low', true]);
    setAutoDetail(2, false);
    await settle();
    assert.deepEqual([state.seaDetail, state.shadows], ['low', false]);
    assert.equal(JSON.parse(saved.get('boogle.detail.v1')!).rung, 2);
    await setPlayerGraphics('detail', 'full'); // a fixed rung holds the owners and forgets the governor's
    assert.deepEqual([state.seaDetail, state.shadows], ['full', true]);
    assert.equal(autoDetail().governing, false);
    assert.equal(saved.has('boogle.detail.v1'), false);
    await setPlayerGraphics('detail', 'shadows');
    assert.deepEqual([state.seaDetail, state.shadows], ['low', false]);
    await setGraphics('shadows', true); // Dev's explicit value beats the rung
    assert.deepEqual([state.seaDetail, state.shadows], ['low', true]);
  } finally {
    for (const stop of stops) stop();
    await setGraphicsPreset('auto');
    await resetGraphics();
  }
});
