// The protos page's retained variant links and recorded answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWERED, PROTOS } from '../protos/protos.ts';

test('variant names are unique per card and the variant urls name their variant', () => {
  for (const p of PROTOS) {
    const names = (p.variants ?? []).map((v) => v.name);
    assert.equal(new Set(names).size, names.length, p.id);
    for (const v of p.variants ?? [])
      assert.equal(new URLSearchParams(v.url.split('?')[1]).get('v'), v.name, `${p.id}/${v.name}: add &v=${v.name}`);
  }
});

test("graduated, answered and parked cards carry the owner's verdict and what comes next", () => {
  for (const p of PROTOS.filter((q) => ANSWERED.includes(q.status)))
    assert.ok(p.answer?.verdict && p.answer.next && p.answer.on, `${p.id}: add its answer`);
});
