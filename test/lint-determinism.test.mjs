// The determinism lint (eslint.config.js) fires on lockstep code: browser-rounded math, Math.random and clocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) });
const lint = async (code) => {
  const [result] = await eslint.lintText(code, { filePath: 'src/sim/lint-probe.js' });
  return result.messages.map((m) => m.ruleId);
};

test('lockstep code may not use Math.random, Math.sin, ** or Date.now', async () => {
  for (const code of ['Math.random();', 'Math.sin(1);', 'export const x = 2 ** 3;', 'Date.now();', 'new Date();']) {
    const rules = await lint(code);
    assert.ok(
      rules.some((r) => r?.startsWith('no-restricted-')),
      `${code} should be reported, got ${rules}`,
    );
  }
});

test('nor sneak them past the lint as Date() or globalThis.Math.*', async () => {
  for (const code of ['Date();', 'globalThis.Math.sin(1);', 'window.Math.random();', 'self.Math.pow(2, 3);']) {
    const rules = await lint(code);
    assert.ok(
      rules.some((r) => r?.startsWith('no-restricted-')),
      `${code} should be reported, got ${rules}`,
    );
  }
});

test('Math.sqrt and plain arithmetic are allowed', async () => {
  assert.deepEqual(await lint('export const x = Math.sqrt(2) * 3 + 1 / 4 - Math.floor(0.5);\n'), []);
});
