// Voice chat proof (docs/game-design/social.md, "Voice chat"): real tabs on a local stack, a synthetic microphone.
// Playwright's Chromium on macOS never resolves getUserMedia, even with --use-fake-device-for-media-stream (it waits on
// the OS mic permission), so the page's getUserMedia returns a 440 Hz tone from its own AudioContext instead. Without a
// real mic grant Chrome hides host addresses behind mDNS names headless Chromium can't resolve, so that is turned off.
//   node dev/look/voice-proof.ts [--out <dir>]
// A and B press Join voice in Pause and each hears the other (connected link, inbound audio level and bytes); C joins
// late on a 420-wide phone and links to both; B reloads and comes back; D never presses and never opens a mic or a
// peer connection. Stills of the UI (desktop and 420-wide portrait) go to --out (default .look/voice).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Browser, Page } from 'playwright';
import { startStack, enterGame, root, sleep } from './lib.ts';
import { acquireBotSlot } from './bot-queue.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const outAt = process.argv.indexOf('--out');
const out = path.resolve(outAt > 0 ? process.argv[outAt + 1]! : path.join(root, '.look/voice'));
fs.mkdirSync(out, { recursive: true });
const room = `voice-${Date.now().toString(36)}`;
type Probe = {
  joined: boolean;
  self: string | null;
  members: string[];
  vc: Record<string, number>;
  peers: { peer: string; state: string; pc: string; audioLevel: number; bytes: number }[];
};
// Counts every mic request and peer connection the page makes, from before the game's first line.
const COUNTERS = `
  window.__voiceCalls = { mic: 0, pc: 0 };
  const md = navigator.mediaDevices;
  if (md) md.getUserMedia = async () => {
    window.__voiceCalls.mic++;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(), gain = ctx.createGain(), dest = ctx.createMediaStreamDestination();
    osc.frequency.value = 440; gain.gain.value = 0.3;
    osc.connect(gain).connect(dest); osc.start(); await ctx.resume();
    return dest.stream;
  };
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends PC { constructor(...a) { super(...a); window.__voiceCalls.pc++; } };`;

const stack = await startStack();
const lease = await acquireBotSlot();
let browser: Browser | null = null;
const failures: string[] = [];
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
try {
  const args = ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=metal'];
  args.push(
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-features=WebRtcHideLocalIpsWithMdns',
  );
  browser = (await chromium.launch({ args, headless: true })) as Browser;
  const url = `${stack.base}?room=${room}&sw=0`;
  async function player(name: string, phone = false) {
    const ctx = await browser!.newContext(
      phone
        ? { viewport: { width: 420, height: 900 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
        : { viewport: { width: 1280, height: 800 } },
    );
    await ctx.grantPermissions(['microphone']);
    await ctx.addInitScript(COUNTERS);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`[${name}] page error: ${e.message.split('\n')[0]}`));
    await page.goto(url);
    await enterGame(page, 180000, name, phone);
    await page.waitForFunction(() => window.boogle?.net.state === 'live', null, { timeout: 120000 });
    return page;
  }
  const probe = (p: Page) =>
    p.evaluate(async () => {
      const m = (await import('/src/features/voice.ts' as string)) as { voiceProbe(): Promise<unknown> };
      return m.voiceProbe();
    }) as Promise<Probe>;
  async function joinVoice(p: Page, phone = false) {
    await p.evaluate(async () => {
      const m = (await import('/src/features/pause.ts' as string)) as { openPause(start?: string): boolean };
      m.openPause('options');
    });
    const button = p.locator('.voice-row button', { hasText: 'Join voice' });
    await (phone ? button.tap() : button.click());
  }
  async function closePause(p: Page) {
    await p.evaluate(async () =>
      ((await import('/src/features/pause.ts' as string)) as { closePause(): void }).closePause(),
    );
  }
  // Every peer in `who` connected from p's side, with audio arriving.
  async function hears(p: Page, who: string[], ms = 30000) {
    const end = Date.now() + ms;
    let last: Probe | null = null;
    while (Date.now() < end) {
      last = await probe(p);
      const ok = who.every((id) =>
        last!.peers.some((x) => x.peer === id && x.state === 'connected' && x.bytes > 0 && x.audioLevel > 0),
      );
      if (ok) return { ok, last };
      await sleep(500);
    }
    return { ok: false, last };
  }
  const line = (pr: Probe | null | undefined) =>
    JSON.stringify(
      pr?.peers.map(
        (x) => `${x.peer.slice(0, 6)} ${x.state}/${x.pc} level ${x.audioLevel.toFixed(3)} bytes ${x.bytes}`,
      ),
    );
  const calls = (p: Page) =>
    p.evaluate(() => (window as unknown as { __voiceCalls: { mic: number; pc: number } }).__voiceCalls);

  const a = await player('Ana');
  const b = await player('Ben');
  const d = await player('Dee'); // never presses
  await joinVoice(a);
  await joinVoice(b);
  const [ida, idb] = [(await probe(a)).self!, (await probe(b)).self!];
  const pa = await hears(a, [idb]);
  const pb = await hears(b, [ida]);
  check(pa.ok && pa.last!.peers.length === 1, `A hears B ${line(pa.last)}`);
  check(pb.ok && pb.last!.peers.length === 1, `B hears A ${line(pb.last)}`);
  await sleep(1500); // let the talking dots catch a level
  await sleep(800);
  await a.screenshot({ path: path.join(out, 'desktop-pause.png') });
  await closePause(a);
  await sleep(600);
  await a.screenshot({ path: path.join(out, 'desktop-hud.png') });

  const c = await player('Cyd', true);
  await joinVoice(c, true);
  const idc = (await probe(c)).self!;
  const pc = await hears(c, [ida, idb]);
  check(pc.ok, `late C hears A and B ${line(pc.last)}`);
  const pac = await hears(a, [idb, idc]);
  check(pac.ok, `A hears B and late C ${line(pac.last)}`);
  await sleep(800);
  await c.screenshot({ path: path.join(out, 'phone-pause.png') });
  await closePause(c);
  await sleep(600);
  await c.screenshot({ path: path.join(out, 'phone-hud.png') });

  await b.reload();
  await enterGame(b, 180000, 'Ben');
  await b.waitForFunction(() => window.boogle?.net.state === 'live', null, { timeout: 120000 });
  await joinVoice(b);
  const idb2 = (await probe(b)).self!;
  check(idb2 !== idb, 'a reload is a new tab id');
  const pb2 = await hears(b, [ida, idc], 40000);
  check(pb2.ok, `reloaded B hears A and C ${line(pb2.last)}`);
  const pa2 = await hears(a, [idb2, idc], 40000);
  check(pa2.ok, `A hears reloaded B and C ${line(pa2.last)}`);
  await sleep(2000); // the old B link closes once its presence goes (the server's reconnect grace, then 'left')
  const pa3 = await probe(a);
  check(!pa3.peers.some((x) => x.peer === idb), `A dropped the old B link ${line(pa3)}`);

  // A brief loss of the room's socket (it reconnects by itself) keeps the calls: presence survives the reconnect.
  await a.evaluate(() => (window.boogle!.net.room as unknown as { pause(ms: number): void }).pause(1200));
  await sleep(5000);
  const pa4 = await hears(a, [idb2, idc], 10000);
  check(
    pa4.ok && pa4.last!.peers.length === 2 && (await a.evaluate(() => window.boogle!.net.state)) === 'live',
    `A kept both calls through a room reconnect ${line(pa4.last)}`,
  );

  // V mutes during play: the other tabs see A's presence flip vc 1 -> 2 -> 1. Stills of the pill both ways.
  async function seesVc(p: Page, id: string, want: number) {
    const end = Date.now() + 5000;
    while (Date.now() < end) {
      if ((await probe(p)).vc[id] === want) return true;
      await sleep(200);
    }
    return false;
  }
  const corner = { x: 840, y: 0, width: 440, height: 90 };
  await a.keyboard.press('KeyV');
  check((await seesVc(c, ida, 2)) && (await probe(a)).joined, 'V muted A: C sees vc 2');
  await sleep(400);
  await a.screenshot({ path: path.join(out, 'pill-muted.png'), clip: corner });
  await a.keyboard.press('KeyV');
  check(await seesVc(c, ida, 1), 'V again unmuted A: C sees vc 1');
  await sleep(400);
  await a.screenshot({ path: path.join(out, 'pill-unmuted.png'), clip: corner });
  await a.evaluate(async () =>
    ((await import('/src/features/pause.ts' as string)) as { openPause(start?: string): boolean }).openPause('options'),
  );
  await sleep(600);
  await a.screenshot({ path: path.join(out, 'desktop-pause-hint.png') });
  await closePause(a);

  const pd = await probe(d);
  const dc = await calls(d);
  check(
    !pd.joined && pd.peers.length === 0 && dc.mic === 0 && dc.pc === 0,
    `D (never pressed) has no mic and no links ${JSON.stringify({ ...dc, peers: pd.peers.length })}`,
  );
  check(pd.members.length === 3, `D sees three players in voice (${pd.members.length})`);

  // Leave closes every link on both sides.
  await a.evaluate(async () =>
    ((await import('/src/features/voice.ts' as string)) as { voiceLeave(): void }).voiceLeave(),
  );
  await sleep(1500);
  const after = await probe(c);
  check(
    !after.peers.some((x) => x.peer === ida) && (await probe(a)).peers.length === 0,
    `A left: links closed ${line(after)}`,
  );
} finally {
  await browser?.close();
  lease.release();
  await stack.close();
}
console.log(failures.length ? `voice proof: ${failures.length} failed` : 'voice proof: all passed', `stills in ${out}`);
process.exit(failures.length ? 1 : 0);
