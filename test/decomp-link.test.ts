import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directLink } from '../src/decomp/link.ts';

test('directLink: a Dropbox share page becomes its direct download, keeping the key', () => {
  assert.equal(
    directLink(' https://www.dropbox.com/scl/fi/abc123/engine.wasm?rlkey=k9&dl=0 '),
    'https://dl.dropboxusercontent.com/scl/fi/abc123/engine.wasm?rlkey=k9',
  );
  assert.equal(
    directLink('https://dropbox.com/s/xyz/game.z64?raw=1'),
    'https://dl.dropboxusercontent.com/s/xyz/game.z64',
  );
});

test('directLink: other links pass through, junk and non-web links are refused', () => {
  assert.equal(directLink('https://example.com/f/engine.wasm'), 'https://example.com/f/engine.wasm');
  assert.equal(directLink('not a link'), null);
  assert.equal(directLink('file:///home/me/game.z64'), null);
  assert.equal(directLink('javascript:alert(1)'), null);
});
