// src/player/arrival.ts: first vs returning visit, and the welcome-back memory of a room (items saved, then compared).
import { test } from 'node:test';
import assert from 'node:assert/strict';

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
const local = new MemStorage();
local.setItem('boogle.name', 'Ana');
local.setItem('boogle.lastVisit', JSON.stringify({ at: 1000, room: 'island' }));
local.setItem('boogle.visit.island', JSON.stringify({ at: 1000, items: { laid: 1, gone: 'x' } }));
Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: new MemStorage(), configurable: true });

const A = await import('../src/player/arrival.ts');

test('a saved name makes a returning visit, with the last visit read at load', () => {
  assert.equal(A.isFirstVisit(), false);
  assert.equal(A.showCard(), false);
  assert.deepEqual(A.lastVisit, { at: 1000, room: 'island' });
});

test('welcome lines compare with the memory read before this visit saved over it', () => {
  let laid = 3;
  A.addWelcomeItem({
    key: 'laid',
    save: () => laid,
    since: (then) => (laid > (then as number) ? `${laid - (then as number)} laid` : null),
  });
  A.addWelcomeItem({ key: 'quiet', save: () => undefined, since: () => 'never asked: not remembered last time' });
  A.addWelcomeItem({
    key: 'gone',
    save: () => 'x',
    since: () => {
      throw new Error('old shape');
    },
  });
  const then = A.roomMemory('island');
  A.rememberVisit('island', 2000);
  assert.deepEqual(A.welcomeLines(then), ['2 laid']);
  assert.deepEqual(A.welcomeLines(A.roomMemory('island')), ['2 laid']); // still last visit's memory
  const saved = JSON.parse(local.getItem('boogle.visit.island')!);
  assert.deepEqual(saved, { at: 2000, items: { laid: 3, gone: 'x' } });
  assert.deepEqual(JSON.parse(local.getItem('boogle.lastVisit')!), { at: 2000, room: 'island' });
  laid = 3;
  assert.deepEqual(A.welcomeLines(null), []);
});

test('names read naturally', () => {
  assert.equal(A.nameList(['Ana']), 'Ana');
  assert.equal(A.nameList(['Ana', 'Bo']), 'Ana and Bo');
  assert.equal(A.nameList(['Ana', 'Bo', 'Cy']), 'Ana, Bo and Cy');
  assert.equal(A.nameList(['Ana', 'Bo', 'Cy', 'Di', 'Ed']), 'Ana, Bo and 3 others');
});

test('a friendly name is never empty', () => {
  for (let k = 0; k < 20; k++) assert.ok(A.friendlyName().length > 0);
});
