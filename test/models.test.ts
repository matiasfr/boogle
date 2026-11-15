import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { agents, fableTopEffort, routes } from '../dev/models.ts';

test('agent frontmatter matches dev/models.ts', () => {
  for (const [name, want] of Object.entries(agents)) {
    const text = fs.readFileSync(new URL(`../.claude/agents/${name}.md`, import.meta.url), 'utf8');
    const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
    const field = (key: string) => new RegExp(`^${key}: (.+)$`, 'm').exec(front)?.[1]?.trim();
    assert.equal(field('model'), want.model, `${name} model`);
    assert.equal(field('effort'), want.effort, `${name} effort`);
  }
});

test('no route or agent runs Fable above its top effort', () => {
  const order = ['low', 'medium', 'high', 'xhigh', 'max'];
  const top = order.indexOf(fableTopEffort);
  const picks = [...routes, ...Object.values(agents)];
  for (const pick of picks) {
    if (pick.model !== 'fable') continue;
    assert.ok(order.indexOf(pick.effort) <= top, `fable at ${pick.effort}`);
  }
  for (const r of routes) assert.doesNotMatch(r.effort, /(xhigh|max) for fable/, r.work);
});
