// End-to-end test of src/net/peer-room.js: local PeerServer + headless Chromium pages (see README.md).
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PeerServer } from 'peer';
import * as esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

const freePort = () => new Promise(res => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
}
// Polls fn until truthy; returns elapsed ms, or -1 on timeout.
async function waitFor(fn, timeout = 8000, step = 50) {
  const t0 = Date.now();
  for (;;) {
    try { if (await fn()) return Date.now() - t0; } catch { /* page may be mid-navigation */ }
    if (Date.now() - t0 > timeout) return -1;
    await sleep(step);
  }
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);

const signalPort = await freePort(), webPort = await freePort();
const server = PeerServer({ port: signalPort, host: '127.0.0.1', path: '/peerjs' });
const built = await esbuild.build({ entryPoints: [path.join(here, 'page.js')], bundle: true, format: 'iife', write: false, platform: 'browser', logLevel: 'warning' });
const js = built.outputFiles[0].text;
const web = http.createServer((req, res) => {
  if (req.url.startsWith('/bundle.js')) { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(js); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><script src="/bundle.js"></script>'); }
}).listen(webPort, '127.0.0.1');

const browser = await chromium.launch();
const room = 'test' + Math.random().toString(36).slice(2, 8);
async function open(name) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`  [${name}] pageerror: ${e.message}`));
  if (process.env.VERBOSE) page.on('console', m => console.log(`  [${name}] ${m.text()}`));
  await page.goto(`http://127.0.0.1:${webPort}/?room=${room}&port=${signalPort}${process.env.STUN ? '&stun=1' : ''}${process.env.VERBOSE ? '&debug=' + process.env.VERBOSE : ''}`);
  const selfId = await ev(page, () => window.T.start());
  return { name, page, ctx, selfId };
}
const snap = p => ev(p.page, () => window.T.snap());
// True when every page in `group` lists exactly the other members (plus itself, first, sameTab).
async function seesAll(group) {
  for (const p of group) {
    const s = await snap(p);
    const want = group.filter(o => o !== p).map(o => o.selfId).sort();
    const got = s.peers.filter(x => !x.sameTab).map(x => x.peer).sort();
    if (JSON.stringify(want) !== JSON.stringify(got)) return false;
    if (s.peers.filter(x => x.sameTab).length !== 1 || s.peers[0].peer !== p.selfId || !s.peers[0].sameTab) return false;
  }
  return true;
}

let exitCode;
try {
  // 1. startup: first page becomes host, the others join it
  const A = await open('A'), B = await open('B'), C = await open('C');
  const all = [A, B, C];
  const snaps = await Promise.all(all.map(snap));
  check('exactly one host (the first page)', snaps.filter(s => s.host).length === 1 && snaps[0].host, `hosts=${snaps.map(s => s.host)}`);
  check('selfIds unique, 10 base36 chars', new Set(all.map(p => p.selfId)).size === 3 && all.every(p => /^[a-z0-9]{10}$/.test(p.selfId)));
  check('each page sees the other two', (await waitFor(() => seesAll(all), 5000)) >= 0);

  // 2. presence propagation and latency (client -> host -> client included)
  await Promise.all(all.map((p, i) => ev(p.page, i => window.T.room.presence({ name: 'p' + i, x: i }), i)));
  const presOk = await waitFor(async () => {
    for (const p of all) {
      const s = await snap(p);
      for (const o of all) if (o !== p && s.peers.find(x => x.peer === o.selfId)?.presence.name !== 'p' + all.indexOf(o)) return false;
    }
    return true;
  }, 3000);
  check('presence values propagate', presOk >= 0, presOk + ' ms');
  await ev(A.page, () => window.T.room.presence({ x: null }));
  check('presence null deletes key', (await waitFor(async () => !('x' in (await snap(B)).peers.find(x => x.peer === A.selfId).presence), 2000)) >= 0);
  await Promise.all(all.map(p => ev(p.page, () => { window.T.lat.length = 0; })));
  await Promise.all(all.map(p => ev(p.page, () => window.T.latency(40, 50))));
  await sleep(500);
  const lats = (await Promise.all(all.map(p => ev(p.page, () => window.T.lat.map(l => l.ms))))).flat().sort((a, b) => a - b);
  const maxLat = lats[lats.length - 1], p50 = lats[Math.floor(lats.length / 2)];
  check('presence latency < 500 ms', lats.length > 200 && maxLat < 500, `n=${lats.length} p50=${p50}ms max=${maxLat}ms`);

  // 3. reliable messages: ordered, exactly once, from every sender to both others
  await Promise.all(all.map(p => ev(p.page, () => { window.T.msgs = {}; })));
  await Promise.all(all.map(p => ev(p.page, () => window.T.burst(100))));
  await sleep(1500);
  let msgOk = true;
  const msgDetail = [];
  for (const p of all) {
    const msgs = await ev(p.page, () => window.T.msgs);
    for (const o of all) {
      if (o === p) { if (msgs[o.selfId]) msgOk = false; continue; }
      const got = msgs[o.selfId] || [];
      if (!(got.length === 100 && got.every((n, i) => n === i))) { msgOk = false; msgDetail.push(`${p.name}<-${o.name}: ${got.length}`); }
    }
  }
  check('send(): 100 msgs x 3 senders in order, exactly once, not echoed', msgOk, msgDetail.join(' '));

  // 4. host crash (page.close() runs no unload handlers) -> migration
  const idsBefore = [B.selfId, C.selfId];
  const BC = [B, C];
  await Promise.all(BC.map(p => ev(p.page, () => { window.T.left.length = 0; window.T.conn.length = 0; })));
  const tKill = Date.now();
  await A.page.close();
  const newHostMs = await waitFor(async () => (await Promise.all(BC.map(snap))).some(s => s.host), 7000);
  check('a remaining page becomes host within ~5 s', newHostMs >= 0 && Date.now() - tKill < 7000, `${Date.now() - tKill} ms`);
  const reconnected = await waitFor(async () => (await Promise.all(BC.map(p => ev(p.page, () => window.T.conn.at(-1)?.c === true)))).every(Boolean), 10000);
  check('both survivors reconnected (onConnection true)', reconnected >= 0, `${Date.now() - tKill} ms after kill`);
  const seeEachOther = await waitFor(async () => (await Promise.all(BC.map(snap))).every((s, i) => s.peers.some(x => x.peer === BC[1 - i].selfId)), 5000);
  check('B and C still see each other', seeEachOther >= 0);
  const hosts = (await Promise.all(BC.map(snap))).filter(s => s.host).length;
  check('exactly one host after migration', hosts === 1, `hosts=${hosts}`);
  check('selfIds unchanged across migration', (await Promise.all(BC.map(snap))).every((s, i) => s.self === idsBefore[i] && s.peers[0].peer === idsBefore[i]));
  const connLogs = await Promise.all(BC.map(p => ev(p.page, () => window.T.conn.map(c => c.c))));
  check('onConnection went false then true', connLogs.every(l => l.includes(false) && l.at(-1) === true), JSON.stringify(connLogs));
  const settled = await waitFor(async () => (await Promise.all(BC.map(snap))).every(s => !s.peers.some(x => x.peer === A.selfId)), 14000);
  check('old host reported as left on both', settled >= 0);
  const lefts = await Promise.all(BC.map(p => ev(p.page, () => window.T.left.map(l => l.peer))));
  if (process.env.DBG) console.log('  lefts', JSON.stringify(await Promise.all(BC.map(p => ev(p.page, () => ({l: window.T.left, c: window.T.conn, h: window.T.hostChanges}))))), tKill, {A: A.selfId, B: B.selfId, C: C.selfId});
  check('no spurious left for surviving peers (no flapping)', lefts.every(l => l.every(id => id === A.selfId)), JSON.stringify(lefts));
  await Promise.all(BC.map(p => ev(p.page, () => { window.T.msgs = {}; window.T.lat.length = 0; })));
  await Promise.all(BC.map(p => ev(p.page, () => window.T.latency(10, 50))));
  await Promise.all(BC.map(p => ev(p.page, () => window.T.burst(20))));
  await sleep(800);
  const post = await Promise.all(BC.map(p => ev(p.page, () => ({ lat: window.T.lat.length, msgs: window.T.msgs }))));
  check('presence flows after migration', post.every(x => x.lat >= 8), post.map(x => x.lat).join('/'));
  check('messages flow after migration', post[0].msgs[C.selfId]?.length === 20 && post[1].msgs[B.selfId]?.length === 20);

  // 5. a newcomer joins the migrated room; then a client crashes, then one closes gracefully
  const D = await open('D');
  const BCD = [B, C, D];
  check('new page joins migrated room, sees B and C', (await waitFor(() => seesAll(BCD), 6000)) >= 0 && !(await snap(D)).host);
  await Promise.all(BCD.map(p => ev(p.page, () => { window.T.left.length = 0; })));
  const hostFlags = await Promise.all(BCD.map(async p => (await snap(p)).host));
  const nonHosts = BCD.filter((p, i) => !hostFlags[i]);
  const [victim, other] = nonHosts; // crash one client, close the other gracefully
  const tClient = Date.now();
  await victim.page.close();
  const watchers = BCD.filter(p => p !== victim);
  const leftMs = await waitFor(async () => (await Promise.all(watchers.map(p => ev(p.page, id => window.T.left.some(l => l.peer === id), victim.selfId)))).every(Boolean), 8000);
  check('crashing a client -> others get left', leftMs >= 0, `${Date.now() - tClient} ms`);
  check('still exactly one host', (await Promise.all(watchers.map(snap))).filter(s => s.host).length === 1);
  await ev(other.page, () => window.T.room.close());
  const hostPage = BCD.find((p, i) => hostFlags[i]);
  const gracefulMs = await waitFor(() => ev(hostPage.page, id => window.T.left.some(l => l.peer === id), other.selfId), 3000);
  check('graceful room.close() -> left within 3 s', gracefulMs >= 0, gracefulMs + ' ms');
  const BD = [hostPage];
  const errs = await Promise.all(BD.map(p => ev(p.page, () => window.T.errors)));
  check('no error callbacks / sender mismatches', errs.every(e => e.length === 0), JSON.stringify(errs));
} catch (e) {
  console.log('FAIL  unexpected exception:', e.stack || e);
  results.push({ name: 'exception', ok: false });
} finally {
  const failed = results.filter(r => !r.ok);
  console.log(`\n${failed.length ? 'FAIL' : 'PASS'}: ${results.length - failed.length}/${results.length} checks passed`);
  exitCode = failed.length ? 1 : 0;
  await browser.close().catch(() => {});
  web.close();
  server.close?.();
  process.exit(exitCode);
}
