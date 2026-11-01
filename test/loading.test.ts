// The loading system's pure parts: the service worker's cache rules (src/boot/sw-policy.ts) and the content manifest's
// matching and prefetch list (src/render/asset-manifest.ts). docs/plans/loading.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheable, stale, cacheName } from '../src/boot/sw-policy.ts';
import { applies, prefetchList, registerAsset, assetUrl, type AssetEntry } from '../src/render/asset-manifest.ts';

const scope = 'https://boogle.club/';

test('sw: only hashed build files under the scope are cached', () => {
  assert.equal(cacheable('GET', scope + 'assets/three-Cno8Qovv.js', scope), true);
  assert.equal(cacheable('GET', scope + 'assets/rapier_wasm3d_bg-B4SxS5fb.wasm?x=1', scope), true);
  assert.equal(cacheable('POST', scope + 'assets/three-Cno8Qovv.js', scope), false);
  for (const path of ['', 'index.html', 'version.json', 'sw.js', 'icon-192.png', 'manifest.webmanifest', 'assets/'])
    assert.equal(cacheable('GET', scope + path, scope), false, path);
  assert.equal(cacheable('GET', 'https://fonts.gstatic.com/assets/x.woff2', scope), false);
  // A subpath deploy (BASE=/boogle/): the page's own scope only.
  assert.equal(cacheable('GET', 'https://x.github.io/boogle/assets/a-1.js', 'https://x.github.io/boogle/'), true);
  assert.equal(cacheable('GET', 'https://x.github.io/other/assets/a-1.js', 'https://x.github.io/boogle/'), false);
});

test('sw: a new build keeps itself and the build before it', () => {
  const names = ['other-cache', cacheName('a'), cacheName('b'), cacheName('c')];
  assert.deepEqual(stale(names, 'c'), [cacheName('a')]);
  assert.deepEqual(stale([cacheName('a')], 'a'), []);
  assert.deepEqual(stale([cacheName('a')], 'b'), []);
  // Rolled back to a build whose cache is older than the newest: the newest other one stays.
  assert.deepEqual(stale([cacheName('a'), cacheName('b'), cacheName('c')], 'a'), [cacheName('b')]);
});

const e = (id: string, priority: AssetEntry['priority'], when?: AssetEntry['when']): AssetEntry => ({
  id,
  url: `/assets/${id}.glb`,
  kind: 'model',
  priority,
  when,
});

test('manifest: when narrows by prototype, area and era', () => {
  assert.equal(applies(e('a', 'soon'), { proto: null }), true);
  assert.equal(applies(e('a', 'soon', { proto: 'assets' }), { proto: null }), false);
  assert.equal(applies(e('a', 'soon', { proto: 'assets' }), { proto: 'assets' }), true);
  assert.equal(applies(e('a', 'soon', { area: 'reef' }), { proto: null }), false);
  assert.equal(applies(e('a', 'soon', { area: 'reef', era: '2' }), { proto: null, area: 'reef', era: '2' }), true);
  assert.equal(applies(e('a', 'soon', { area: 'reef', era: '2' }), { proto: null, area: 'reef', era: '3' }), false);
});

test('manifest: only soon files that apply are prefetched, in order', () => {
  const list = [e('a', 'first'), e('b', 'soon'), e('c', 'later'), e('d', 'soon', { proto: 'x' }), e('f', 'soon')];
  assert.deepEqual(prefetchList(list, { proto: null }), ['/assets/b.glb', '/assets/f.glb']);
  assert.deepEqual(prefetchList(list, { proto: 'x' }), ['/assets/b.glb', '/assets/d.glb', '/assets/f.glb']);
});

test('manifest: ids are unique and lookups fail loudly', () => {
  registerAsset(e('test-one', 'later'));
  registerAsset(e('test-one', 'later')); // the same file again (a module evaluated twice) is fine
  assert.equal(assetUrl('test-one'), '/assets/test-one.glb');
  assert.throws(() => registerAsset({ ...e('test-one', 'later'), url: '/assets/other.glb' }), /taken/);
  assert.throws(() => assetUrl('nope'), /no asset/);
});
