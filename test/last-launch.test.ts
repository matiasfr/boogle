import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launchQuery, fromCookie, COOKIE } from '../src/last-launch.ts';

test('only a room or prototype is reopened, with its parameters and without debug flags', () => {
  assert.equal(launchQuery('?dpr=fixed&debugcam=1'), '');
  assert.equal(launchQuery('?room='), '');
  assert.equal(launchQuery('?dpr=fixed&proto=arrive&v=lobby&netdebug=1'), 'proto=arrive&v=lobby');
});

test('the cookie round-trips and ignores other cookies and bad encodings', () => {
  const q = 'room=a&proto=arrive&v=lobby';
  assert.equal(fromCookie(`x=1; ${COOKIE}=${encodeURIComponent(q)}; y=2`), q);
  assert.equal(fromCookie('x=1'), '');
  assert.equal(fromCookie(`${COOKIE}=%E0%A4%A`), '');
});
