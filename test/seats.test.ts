import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  createSeats,
  SEAT_ID,
  pickSeat,
  sit,
  stand,
  releasePid,
  clear,
  seatOf,
  occupant,
  invariants,
} from '../src/sim/seats.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import type { PrefabArtifact, LevelArtifact } from '../src/prefab/types.ts';

test('seats choose in list order, never displace, and moving frees the old chair', () => {
  const s = createSeats();
  assert.equal(pickSeat(s, 'a', ['one', 'two']), 'one');
  assert.equal(sit(s, 'a', 'one'), true);
  assert.equal(sit(s, 'b', 'one'), false);
  assert.equal(pickSeat(s, 'b', ['one', 'three', 'two']), 'three');
  assert.equal(sit(s, 'a', 'two'), true);
  assert.equal(occupant(s, 'one'), null);
  assert.equal(seatOf(s, 'a'), 'two');
  assert.equal(pickSeat(s, 'a', ['two']), 'two');
  assert.equal(stand(s, 'b'), false);
  assert.equal(occupant(s, 'two'), 'a');
  releasePid(s, 'a');
  assert.equal(seatOf(s, 'a'), null);
  assert.equal(invariants(s), null);
});

test('malformed ids and oversized lists are refused without mutation', () => {
  const s = createSeats();
  for (const ids of [[], [''], ['bad id'], ['x'.repeat(65)], [null], [{}], ['ok', 3], Array(9).fill('ok')])
    assert.equal(pickSeat(s, 'a', ids), null);
  for (const id of ['', 'bad id', 'a\n', 'x'.repeat(65)]) assert.equal(sit(s, 'a', id), false);
  assert.equal(invariants(s), null);
});

test('the maps stay inverse through 5000 seeded sit, stand and departure calls', () => {
  const s = createSeats(),
    random = mulberry32(913);
  for (let k = 0; k < 5000; k++) {
    const pid = `p${Math.floor(random() * 8)}`;
    const op = Math.floor(random() * 3);
    if (op === 0) sit(s, pid, `chair-${Math.floor(random() * 12)}`);
    else if (op === 1) stand(s, pid);
    else releasePid(s, pid);
    assert.equal(invariants(s), null, `operation ${k}`);
  }
  clear(s);
  assert.equal(s.byPid.size, 0);
  assert.equal(s.bySeat.size, 0);
});

test('SEAT_ID accepts every current machine, train and compiled prefab seat id', () => {
  // These are the three registration sites: track-machine, train-view and prefab/instantiate.
  const ids = ['machine-deck-0', 'machine-deck-1'];
  RAIL_TRAINS.forEach((_, slot) => {
    for (let i = 0; i < 4; i++) ids.push(`railway:train${slot}-1-seat${i}`);
  });
  const built = new URL('../content/built/', import.meta.url);
  const prefabs = JSON.parse(readFileSync(new URL('prefabs.json', built), 'utf8')) as PrefabArtifact;
  const prefabIds: string[] = [];
  for (const file of readdirSync(new URL('levels/', built)).filter((f) => f.endsWith('.json'))) {
    const level = JSON.parse(readFileSync(new URL(`levels/${file}`, built), 'utf8')) as LevelArtifact;
    for (const p of level.placements) {
      const attachments = Object.entries(prefabs.prefabs[p.prefab]!.attach ?? {}).filter(([, a]) => a.kind === 'seat');
      for (const [name] of attachments) prefabIds.push(attachments.length === 1 ? p.id : `${p.id}/${name}`);
    }
  }
  assert.deepEqual(prefabIds, ['forge-workshop']);
  ids.push(...prefabIds);
  for (const id of ids) assert.match(id, SEAT_ID, id);
  console.log(`Seat ids (${ids.length}): ${ids.join(', ')}`);
});
