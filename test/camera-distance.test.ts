import assert from 'node:assert/strict';
import { test } from 'node:test';
import { followDistance, readCameraDistance, setCameraDistance } from '../src/player/camera-distance.ts';

test('follow distance survives a fresh read and stays within the slider stops', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => values.get(key), setItem: (key: string, v: string) => values.set(key, v) },
  });
  assert.equal(readCameraDistance(), 100);
  setCameraDistance(111);
  assert.equal(readCameraDistance(), 110);
  setCameraDistance(200);
  assert.equal(readCameraDistance(), 130);
  setCameraDistance(10);
  assert.equal(readCameraDistance(), 70);
  assert.equal(followDistance(10), 7);
  values.set('boogle.cameraDistancePercent', '999');
  assert.equal(readCameraDistance(), 130);
  values.set('boogle.cameraDistancePercent', 'broken');
  assert.equal(readCameraDistance(), 100);
});
