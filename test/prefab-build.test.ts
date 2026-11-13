import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compile, writeArtifacts } from '../dev/prefab/compiler.ts';
import { validateLevel } from '../src/prefab/validate.ts';
import type { PrefabDef, LevelDef } from '../src/prefab/types.ts';
test('--check rejects hand-edited and stale artifacts without rewriting them', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prefab-build-'));
  try {
    const outputs = compile([], []);
    writeArtifacts(outputs, dir, false);
    writeArtifacts(outputs, dir, true);
    const file = path.join(dir, 'prefabs.json');
    fs.appendFileSync(file, ' ');
    assert.throws(() => writeArtifacts(outputs, dir, true), /differs/);
    assert.ok(fs.readFileSync(file, 'utf8').endsWith(' '));
    writeArtifacts(outputs, dir, false);
    fs.writeFileSync(path.join(dir, 'stale.json'), '{}');
    assert.throws(() => writeArtifacts(outputs, dir, true), /stale/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('review-4: orthogonal quarter-turn under a stretched parent compiles', () => {
  const frame: PrefabDef = { key: 'town.frame', visual: { none: true }, colliders: [], scope: 'owner' };
  const box: PrefabDef = {
    key: 'town.box',
    visual: { none: true },
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [1, 1, 1] }],
    scope: 'owner',
  };
  const level: LevelDef = {
    place: 'town',
    placements: [
      { id: 'parent', prefab: frame.key, pos: [0, 0, 0], scale: [2, 1, 1] },
      { id: 'child', prefab: box.key, pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], parent: 'parent' },
    ],
  };
  assert.doesNotThrow(() => validateLevel(level, { [frame.key]: frame, [box.key]: box }));
  assert.doesNotThrow(() => compile([frame, box], [level]));
});
