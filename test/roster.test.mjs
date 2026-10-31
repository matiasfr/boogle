// The roster (src/sim/roster.js): dense indexes by first sight, clean names, the cap, no-op refusal, and a
// serialize/load round-trip with the same hash.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRoster,
  ensure,
  indexOf,
  canSet,
  setWho,
  serializeRoster,
  loadRoster,
  hashRoster,
  cleanName,
  MAX_PLAYERS,
} from '../src/sim/roster.js';

test('players get dense indexes in order of first sight', () => {
  const r = createRoster();
  assert.equal(ensure(r, 'ana'), 0);
  assert.equal(ensure(r, 'bo'), 1);
  assert.equal(ensure(r, 'ana'), 0);
  assert.equal(indexOf(r, 'bo'), 1);
  assert.equal(indexOf(r, 'cy'), -1);
  assert.equal(ensure(r, 'Not A Pid'), -1);
});

test('names are cleaned like the lobby does; an unchanged set and a bad colour are refused', () => {
  assert.equal(cleanName('  Zoë \u0000 the   great and powerful '), 'Zoë the great an');
  const r = createRoster();
  assert.equal(canSet(r, 'ana', 'Ana', 2), true);
  setWho(r, 'ana', '  Ana ', 2);
  assert.equal(r.names[0], 'Ana');
  assert.equal(canSet(r, 'ana', 'Ana', 2), false, 'nothing changes');
  assert.equal(canSet(r, 'ana', 'Ana', 3), true);
  assert.equal(canSet(r, 'ana', '   ', 3), false, 'blank name');
  assert.equal(canSet(r, 'ana', 'Ana', 8), false);
  assert.equal(canSet(r, 'ana', 5, 1), false);
});

test('the roster caps at MAX_PLAYERS; known players can still rename', () => {
  const r = createRoster();
  for (let k = 0; k < MAX_PLAYERS; k++) setWho(r, 'p' + k, 'P' + k, k % 8);
  assert.equal(canSet(r, 'newcomer', 'New', 1), false);
  assert.equal(ensure(r, 'newcomer'), -1);
  assert.equal(canSet(r, 'p7', 'Seven', 1), true);
});

test('serialize/load round-trips with the same hash; bad rows throw', () => {
  const r = createRoster();
  setWho(r, 'ana', 'Ana', 2);
  setWho(r, 'bo', 'Bo', 5);
  const json = JSON.parse(JSON.stringify(serializeRoster(r)));
  const t = createRoster();
  loadRoster(t, json);
  assert.equal(hashRoster(t), hashRoster(r));
  assert.equal(indexOf(t, 'bo'), 1);
  assert.notEqual(hashRoster(createRoster()), hashRoster(r));
  assert.throws(
    () =>
      loadRoster(t, [
        ['ana', 'A', 1],
        ['ana', 'B', 2],
      ]),
    /bad row/,
  );
  assert.throws(() => loadRoster(t, { x: 1 }));
  assert.equal(indexOf(t, 'bo'), 1, 'a failed load changes nothing');
});
