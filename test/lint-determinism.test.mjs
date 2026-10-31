// The determinism lint (eslint.config.js) fires on lockstep code: browser-rounded math, Math.random and clocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { LOCKSTEP_FILES } from '../eslint.config.js';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) });
const lint = async (code, filePath = 'src/sim/lint-probe.js') => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => m.ruleId);
};

test('lockstep code may not use Math.random, Math.sin, ** or Date.now', async () => {
  for (const code of [
    'Math.random();',
    'Math.sin(1);',
    'Math.atanh(0.5);',
    'export const x = 2 ** 3;',
    'Date.now();',
    'new Date();',
    'crypto.getRandomValues(new Uint8Array(1));',
    'crypto.randomUUID();',
  ]) {
    const rules = await lint(code);
    assert.ok(
      rules.some((r) => r?.startsWith('no-restricted-')),
      `${code} should be reported, got ${rules}`,
    );
  }
});

test('nor sneak them past the lint as Date() or globalThis.Math.*', async () => {
  for (const code of [
    'Date();',
    'globalThis.Math.sin(1);',
    'window.Math.random();',
    'self.Math.pow(2, 3);',
    'globalThis.crypto.randomUUID();',
  ]) {
    const rules = await lint(code);
    assert.ok(
      rules.some((r) => r?.startsWith('no-restricted-')),
      `${code} should be reported, got ${rules}`,
    );
  }
});

// A renamed or moved rules module would otherwise silently drop out of the lint (flat config never warns).
test('every named lockstep file exists and is linted', async () => {
  for (const named of LOCKSTEP_FILES.filter((f) => !f.includes('*'))) {
    // `grid.{js,ts}`: whichever of the two exists (modules move from .js to .ts).
    const entry = ['.js', '.ts']
      .map((ext) => named.replace('.{js,ts}', ext))
      .find((f) => existsSync(new URL('../' + f, import.meta.url)));
    assert.ok(entry, `${named} is in LOCKSTEP_FILES but missing: update eslint.config.js`);
    const rules = await lint('Math.random();', entry);
    assert.ok(rules.includes('no-restricted-properties'), `${entry} should be linted, got ${rules}`);
  }
});

test('Math.sqrt and plain arithmetic are allowed', async () => {
  assert.deepEqual(await lint('export const x = Math.sqrt(2) * 3 + 1 / 4 - Math.floor(0.5);\n'), []);
});
