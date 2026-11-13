import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compile, writeArtifacts } from '../dev/prefab/compiler.ts';
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
