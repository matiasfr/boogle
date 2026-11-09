import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { activeMode, agents } from '../dev/models.ts';

test('agent frontmatter matches dev/models.ts', () => {
  for (const [name, want] of Object.entries(agents)) {
    const text = fs.readFileSync(new URL(`../.claude/agents/${name}.md`, import.meta.url), 'utf8');
    const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
    const field = (key: string) => new RegExp(`^${key}: (.+)$`, 'm').exec(front)?.[1]?.trim();
    assert.equal(field('model'), want.model, `${name} model`);
    assert.equal(field('effort'), want.effort, `${name} effort`);
  }
});

test('withCodex starts on its codexFrom day', () => {
  assert.equal(activeMode(new Date(2026, 10, 12, 23, 59), '2026-11-13'), 'normal');
  assert.equal(activeMode(new Date(2026, 10, 13, 0, 1), '2026-11-13'), 'withCodex');
  assert.equal(activeMode(new Date(), null), 'normal');
});
