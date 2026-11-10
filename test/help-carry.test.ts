// The pure parts of Help carry (src/entities/railway/help-carry.ts; docs/plans/boiler-first-choice.md, step 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHelpCarry, HELP_STALE_MS, type HelpBody } from '../src/entities/railway/help-carry.ts';

function room() {
  const at = (x: number, y = 0, z = 0): HelpBody => ({ position: { x, y, z } });
  const bodies = new Map<string, HelpBody>([
    ['me', at(0)],
    ['holder', at(3)],
    ['friend', at(4)],
  ]);
  const peers = new Map([['p-friend', 'friend']]);
  const s = { holder: 'holder', busy: new Set<string>(), now: 1000 };
  const help = createHelpCarry({
    holds: (pid) => pid === s.holder,
    free: (pid) => !s.busy.has(pid),
    avatarOf: (pid) => bodies.get(pid) ?? null,
    self: () => 'me',
    pidOf: (peer) => peers.get(peer) ?? null,
    now: () => s.now,
  });
  return { help, bodies, s, at };
}

test('help carry: your own claim holds only near a holder still holding, with an empty back', () => {
  const { help, bodies, s, at } = room();
  assert.equal(help.presence(), null);
  help.start('holder');
  assert.equal(help.presence(), 'holder');
  assert.equal(help.helperOf('holder'), bodies.get('me'));
  bodies.set('me', at(9));
  assert.equal(help.presence(), null, 'more than 5 m flat');
  bodies.set('me', at(0, 2.5));
  assert.equal(help.presence(), null, 'more than 2 m of height');
  bodies.set('me', at(0));
  s.busy.add('me');
  assert.equal(help.presence(), null, 'a loaded back');
  s.busy.clear();
  s.holder = '';
  assert.equal(help.helping(), null, 'the holder put it down: the claim is dropped');
  s.holder = 'holder';
  assert.equal(help.helping(), null, 'and stays dropped');
});

test("help carry: a remote's claim lifts the load until it goes stale", () => {
  const { help, bodies, s } = room();
  help.hear('p-friend', 'holder');
  assert.equal(help.helperOf('holder'), bodies.get('friend'));
  assert.equal(help.helperOf('friend'), null, 'only for the holder they named');
  s.now += HELP_STALE_MS + 1;
  assert.equal(help.helperOf('holder'), null, 'stale');
  help.hear('p-friend', 'holder');
  help.hear('p-friend', null);
  assert.equal(help.helperOf('holder'), null, 'a cleared value is off');
  help.hear('p-friend', 'x'.repeat(65));
  assert.equal(help.helperOf('holder'), null, 'malformed');
  help.hear('p-friend', 'holder');
  s.busy.add('friend');
  assert.equal(help.helperOf('holder'), null, "a friend with a loaded back doesn't lift");
});
