// The pure parts of Help carry (src/entities/railway/help-carry.ts; docs/plans/boiler-first-choice.md, step 6, and
// docs/plans/works-late-game.md, step 4: reach is measured to the grip, 5 m to start and 8 m to keep).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHelpCarry,
  easeToward,
  HELP_STALE_MS,
  type HelpBody,
  type HelpPoint,
} from '../src/entities/railway/help-carry.ts';

function room() {
  const at = (x: number, y = 0, z = 0): HelpBody => ({ position: { x, y, z } });
  const bodies = new Map<string, HelpBody>([
    ['me', at(0)],
    ['holder', at(3)],
    ['friend', at(4)],
  ]);
  const peers = new Map([['p-friend', 'friend']]);
  // The grip trails the holder by 4 m (a load on a rope behind them), from the holder's pose alone.
  const s = { holder: 'holder', busy: new Set<string>(), now: 1000, trail: -4 };
  const help = createHelpCarry({
    holds: (pid) => pid === s.holder,
    free: (pid) => !s.busy.has(pid),
    avatarOf: (pid) => bodies.get(pid) ?? null,
    gripOf: (holder): HelpPoint | null => {
      const p = bodies.get(holder)?.position;
      return p ? { x: p.x + s.trail, y: p.y, z: p.z } : null;
    },
    self: () => 'me',
    pidOf: (peer) => peers.get(peer) ?? null,
    now: () => s.now,
  });
  return { help, bodies, s, at };
}

test('help carry: your own claim holds only near the grip of a holder still holding, with an empty back', () => {
  const { help, bodies, s, at } = room();
  assert.equal(help.presence(), null);
  assert.ok(help.canStart('holder'));
  help.start('holder');
  assert.equal(help.presence(), 'holder');
  assert.equal(help.helperOf('holder'), bodies.get('me'));
  bodies.set('me', at(-10));
  assert.equal(help.presence(), null, 'more than 8 m flat from the grip');
  bodies.set('me', at(-1, 3.5));
  assert.equal(help.presence(), null, 'more than 3 m of height');
  bodies.set('me', at(-1));
  s.busy.add('me');
  assert.equal(help.presence(), null, 'a loaded back');
  s.busy.clear();
  s.holder = '';
  assert.equal(help.helping(), null, 'the holder put it down: the claim is dropped');
  s.holder = 'holder';
  assert.equal(help.helping(), null, 'and stays dropped');
});

test('help carry: measured to the grip, not the holder; 5 m to start, 8 m to keep', () => {
  const { help, bodies, at } = room();
  // At the grip (-1) but 4 m from the holder: the old rule measured the holder.
  bodies.set('me', at(-1));
  assert.ok(help.canStart('holder'));
  // 7 m past the grip, 11 m from the holder: too far to start ...
  bodies.set('me', at(-8));
  assert.equal(help.canStart('holder'), false, 'more than 5 m from the grip');
  bodies.set('me', at(-3));
  help.start('holder');
  // ... but a started claim keeps hold out to 8 m of lag, with a deck's height between them.
  bodies.set('me', at(-8, 2.5));
  assert.equal(help.helping(), 'holder', 'within 8 m of the grip and 3 m of height');
  bodies.set('me', at(-9.5));
  assert.equal(help.helping(), null, 'past 8 m');
  assert.equal(help.canStart('me'), false, 'never yourself');
});

test("help carry: a remote's claim lifts the load until it goes stale", () => {
  const { help, bodies, s, at } = room();
  help.hear('p-friend', 'holder');
  assert.equal(help.helperOf('holder'), bodies.get('friend'));
  assert.equal(help.helperOf('friend'), null, 'only for the holder they named');
  bodies.set('friend', at(-6));
  assert.equal(help.helperOf('holder'), bodies.get('friend'), 'a remote keeps hold out to 8 m of the grip');
  bodies.set('friend', at(-10));
  assert.equal(help.helperOf('holder'), null, 'past 8 m');
  bodies.set('friend', at(4));
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

test('help carry: the helper is eased toward the grip, never past a unit wish', () => {
  const still = easeToward({ x: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 });
  assert.deepEqual(still, { x: 0, z: 0 }, 'no pull inside the slack');
  const lag = easeToward({ x: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 6, y: 0, z: 0 });
  assert.equal(lag.x, 1, 'a full pull when lagging');
  assert.equal(lag.z, 0);
  const steering = easeToward({ x: 0, z: 1 }, { x: 0, y: 0, z: 0 }, { x: 6, y: 0, z: 0 });
  assert.ok(Math.abs(Math.hypot(steering.x, steering.z) - 1) < 1e-9, 'clamped to a unit wish');
  assert.ok(steering.x > 0 && steering.z > 0, 'blended with your own steering');
  const { help, bodies, at } = room();
  const wish = { x: 0, z: 0 };
  help.ease(wish);
  assert.deepEqual(wish, { x: 0, z: 0 }, 'not helping: untouched');
  help.start('holder');
  bodies.set('me', at(2));
  help.ease(wish);
  assert.ok(wish.x < 0, 'toward the grip behind the holder');
});
