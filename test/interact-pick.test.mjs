import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickInteract, FACING } from '../src/sim/interact-pick.js';

// You stand at the origin looking along -z (three.js forward at yaw 0); +x and -x are beside you, +z is behind.
const pick = (targets) => pickInteract(targets, 0, 0, 0, -1);
const run = () => {};
const at = (id, x, z, more = {}) => ({ id, at: { x, z }, run, ...more });
const blocked = (id, x, z) => ({ id, at: { x, z }, blocked: 'Hotbar full' });

test('the nearest target wins', () => {
  assert.equal(pick([at('far', 2, 0), at('near', -1.5, 0)]).id, 'near');
  assert.equal(pick([at('near', 1, 0), at('far', 0, -2.2)]).id, 'near');
});

test('a target straight ahead beats a slightly nearer one beside you, but not a much nearer one', () => {
  assert.equal(pick([at('beside', 1, 0), at('ahead', 0, -1.4)]).id, 'ahead');
  assert.equal(pick([at('beside', 1, 0), at('ahead', 0, -(1 + FACING + 0.1))]).id, 'beside');
  // Behind you counts as farther.
  assert.equal(pick([at('behind', 0, 1), at('beside', 1.3, 0)]).id, 'beside');
});

test('r measures to the edge: The Boogler at 2.6 m beats a ball at 1.9 m, and a ball at his feet', () => {
  const boogler = at('boogler', 2.6, 0, { r: 0.8 });
  assert.equal(pick([at('ball', -1.9, 0), boogler]).id, 'boogler');
  assert.equal(pick([at('ball', 1.9, 0), boogler]).id, 'boogler');
  assert.equal(pick([at('ball', 0, -1.9), at('boogler', 0, -2.6, { r: 0.8 })]).id, 'boogler');
});

test('a runnable target wins over a nearer blocked one, in either order', () => {
  assert.equal(pick([blocked('shell', 1, 0), at('boogler', 2.2, 0)]).id, 'boogler');
  assert.equal(pick([at('boogler', 2.2, 0), blocked('shell', 0, -0.5)]).id, 'boogler');
});

test('a blocked target shows when nothing runnable is in reach, nearest first', () => {
  assert.equal(pick([blocked('far', 2, 0), null, blocked('near', 1, 0)]).id, 'near');
  assert.equal(pick([null, blocked('shell', 1, 0)]).blocked, 'Hotbar full');
});

test('nothing in reach picks nothing', () => {
  assert.equal(pick([]), null);
  assert.equal(pick([null, null, null]), null);
});

test('ties go to the earlier target, and standing on one does not divide by zero', () => {
  assert.equal(pick([at('a', 1, 0), at('b', -1, 0)]).id, 'a');
  assert.equal(pick([at('here', 0, 0), at('near', 0.3, 0)]).id, 'here');
});

test('among several of one kind the nudge still decides: a palm ahead beats a shell behind', () => {
  assert.equal(pick([at('item1', 0, 1), at('palm0', 0, -1.9)]).id, 'palm0');
  // The seeds ahead are not hidden by the can beside you.
  assert.equal(pick([at('stall-can', 1.2, 0), at('stall-seeds', 0.4, -1.45)]).id, 'stall-seeds');
});

test('the order targets come in does not change the pick', () => {
  const ts = [at('a', 1.1, 0.3), blocked('b', 0.2, 0.1), at('c', -0.4, -1.6), at('d', 2, -1), blocked('e', 0, -0.3)];
  for (let k = 0; k < ts.length; k++) assert.equal(pick([...ts.slice(k), ...ts.slice(0, k)]).id, 'c');
});
