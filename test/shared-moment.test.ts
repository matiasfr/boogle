// Shared moments play for everyone (decisions.md, 10 November): the gate shots, the Works throat and the glider's take
// play on every page from the accepted edge, and each page leaves a `moment played` mark of who saw what.
import test from 'node:test';
import assert from 'node:assert/strict';
import { playSharedMoment } from '../src/entities/railway/shared-moment.ts';
import { watchPlayMarks, type PlayData } from '../src/proto/mark.ts';
import { beatsOf } from '../dev/playtest/beats.ts';
import type { RailwayAccepted } from '../src/adapters/railway-effects.ts';

const marks: [string, PlayData | undefined][] = [];
watchPlayMarks((name, data) => marks.push([name, data]));
const lever = (pid: string, predicted?: boolean): RailwayAccepted =>
  ({ op: 'rail.lever', pid, request: 1, accepted: 1, status: 'accepted', tick: 0, predicted }) as RailwayAccepted;

test('the puller and a friend both play the gate shot, and each page marks it', () => {
  marks.length = 0;
  const shown: boolean[] = [];
  playSharedMoment('quarry gate', lever('a', true), 'a', (mine) => (shown.push(mine), true));
  playSharedMoment('quarry gate', lever('a'), 'b', (mine) => (shown.push(mine), false));
  assert.deepEqual(shown, [true, false]);
  assert.deepEqual(marks, [
    ['moment played', { moment: 'quarry gate', mine: true, shot: true, authority: 'local', edge: 'predicted' }],
    ['moment played', { moment: 'quarry gate', mine: false, shot: false, authority: 'local', edge: 'server' }],
  ]);
  assert.ok(beatsOf('place', true).some(([, pattern]) => pattern.test('moment played')));
});
