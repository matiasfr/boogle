import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launchQuery, describeLaunch, fromCookie, COOKIE } from '../src/last-launch.ts';

test('a bare visit or one with only debug flags opens nothing special', () => {
  assert.equal(launchQuery(''), '');
  assert.equal(launchQuery('?dpr=fixed&debugcam=1'), '');
  assert.equal(launchQuery('?room='), '');
});

test('room and prototype are kept with their parameters, debug flags dropped', () => {
  assert.equal(launchQuery('?room=test-xyz'), 'room=test-xyz');
  assert.equal(launchQuery('?dpr=fixed&proto=arrive&v=lobby&netdebug=1'), 'proto=arrive&v=lobby');
  assert.equal(launchQuery('?room=a&proto=lay&hero=bare'), 'room=a&proto=lay&hero=bare');
});

test('the playtest playlist is kept, and named', () => {
  assert.equal(launchQuery('?play&dpr=fixed'), 'play=');
  assert.equal(describeLaunch('play='), 'the playtest playlist');
});

test('the Continue label names the room and the prototype', () => {
  assert.equal(describeLaunch('room=test-xyz'), 'room test-xyz');
  assert.equal(describeLaunch('proto=arrive&v=lobby'), 'prototype arrive (lobby)');
  assert.equal(describeLaunch('room=a&proto=lay'), 'room a · prototype lay');
});

test('the cookie round-trips and ignores other cookies and bad encodings', () => {
  const q = 'room=a&proto=arrive&v=lobby';
  assert.equal(fromCookie(`x=1; ${COOKIE}=${encodeURIComponent(q)}; y=2`), q);
  assert.equal(fromCookie('x=1'), '');
  assert.equal(fromCookie(`${COOKIE}=%E0%A4%A`), '');
});
