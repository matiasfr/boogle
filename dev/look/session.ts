// One persistent browser/stack per harness checkout. The CLI talks to a private loopback HTTP endpoint;
// only `start` boots anything. See playtester.md for the screenshot-only protocol.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Browser } from 'playwright';
import type { Game, Stack } from './lib.ts';

type Address = { pid: number; token: string; url?: string; ready?: boolean };
type Request = { command: string; args: string[] };
type Reply = { result?: unknown; error?: string; seconds: number };
// Keep short commands free of the server/game module graph; only the daemon loads the harness.
const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = path.join(root, '.look');
const addressFile = path.join(dir, 'session.json');
const logFile = path.join(dir, 'session-daemon.log');
const IDLE_MS = 30 * 60_000;
const COMMAND_MS = 120_000;
const args = process.argv.slice(2);
const command = args.shift();
const readAddress = (): Address => JSON.parse(fs.readFileSync(addressFile, 'utf8')) as Address;
const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const removeAddress = (token: string) => {
  if (fs.existsSync(addressFile) && readAddress().token === token) fs.unlinkSync(addressFile);
};
const option = (name: string) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  if (!args[i + 1] || args[i + 1]!.startsWith('--')) throw new Error(`${name} needs a value`);
  return args[i + 1]!;
};

async function send(address: Address, request: Request): Promise<Reply> {
  if (!address.url || !address.ready) throw new Error('Session is still starting; see .look/session-daemon.log');
  const response = await fetch(address.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${address.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(COMMAND_MS + 5000),
  });
  return (await response.json()) as Reply;
}

async function start() {
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(addressFile)) {
    const old = readAddress();
    if (alive(old.pid)) throw new Error(`Session already running (pid ${old.pid}); use stop first`);
    removeAddress(old.token);
  }
  // Exclusive creation prevents two simultaneous starts. The child inherits this ownership token.
  const token = randomUUID();
  fs.writeFileSync(addressFile, JSON.stringify({ pid: process.pid, token }), { flag: 'wx', mode: 0o600 });
  const log = fs.openSync(logFile, 'w', 0o600);
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', token, ...args], {
    cwd: root,
    detached: true,
    stdio: ['ignore', log, log],
  });
  fs.closeSync(log);
  let failed = '';
  child.on('error', (error) => (failed = error.message));
  child.on('exit', (code) => (failed = `daemon exited ${code}`));
  child.unref();
  const deadline = Date.now() + 240_000;
  try {
    while (Date.now() < deadline) {
      if (failed) throw new Error(failed);
      if (fs.existsSync(addressFile)) {
        const address = readAddress();
        if (address.token === token && address.ready) return `started pid ${address.pid}; ${addressFile}`;
      }
      await sleep(100);
    }
    throw new Error('startup timed out');
  } catch (error) {
    child.kill('SIGTERM');
    removeAddress(token);
    throw new Error(`${String(error)}\n${fs.readFileSync(logFile, 'utf8').slice(-3000)}`, { cause: error });
  }
}

async function serve() {
  const token = args.shift()!;
  const { Game, launch, startStack } = await import('./lib.ts');
  const { IGNORE_TEXT, installObserver } = await import('./observe.ts');
  const { findSave, POSE_AT, SEED } = await import('./saves.ts');
  let stack: Stack | undefined;
  let browser: Browser | undefined;
  let game: Game | undefined;
  let closing = false;
  let busy = false;
  let lastUsed = Date.now();
  let idle: ReturnType<typeof setInterval> | undefined;
  const server = http.createServer();
  const address: Address = { pid: process.pid, token };
  const publish = () => {
    const temp = `${addressFile}.${process.pid}`;
    fs.writeFileSync(temp, JSON.stringify(address), { mode: 0o600 });
    fs.renameSync(temp, addressFile);
  };
  async function close(code = 0) {
    if (closing) return;
    closing = true;
    clearInterval(idle);
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close();
    server.closeAllConnections();
    await browser?.close().catch(() => {});
    await stack?.close().catch(console.error);
    removeAddress(token);
    process.exit(code);
  }
  process.on('SIGTERM', () => void close());
  process.on('SIGINT', () => void close());
  publish();

  const pause = () => game!.eval('window.__warp.pause(); window.__warp.drawEvery = 1;');
  const step = async (seconds: number) => {
    const g = game!;
    const before = await g.eval<number>('return window.boogle.prof.last.frames;');
    await g.eval(`await window.__warp.run(${seconds});`);
    // A rAF can start an async GPU draw. Wait for its completed-frame counter, without advancing the clock.
    if (
      seconds > 0 &&
      (await g.waitFor((n) => window.boogle.prof!.last.frames > n, { timeout: 15_000, arg: before })) < 0
    )
      throw new Error('No completed game frame after step');
    const errors = g.healthErrors();
    if (errors.length) throw new Error(errors.join('\n'));
  };
  const seconds = (value: string | undefined) => {
    const n = Number(value);
    if (!value || !Number.isFinite(n) || n < 0 || n > 60) throw new Error('seconds must be 0–60');
    return n;
  };
  async function execute({ command, args: a }: Request) {
    const g = game!;
    switch (command) {
      case 'eval':
        return g.eval(a.join(' '));
      case 'step': {
        const n = seconds(a[0]);
        await step(n);
        return `stepped ${n}s (rounded up to 1/60s)`;
      }
      case 'keys':
      case 'press': {
        const codes = command === 'press' ? ['KeyE'] : (a[0] ?? '').split(/[,+\s]+/).filter(Boolean);
        if (!codes.length) throw new Error('keys needs codes, e.g. KeyW,ShiftLeft');
        const n = command === 'press' ? 0.1 : seconds(a[1]);
        const held: string[] = [];
        try {
          for (const code of codes) {
            await g.down(code);
            held.push(code);
          }
          await step(n);
        } finally {
          for (const code of held) await g.up(code);
        }
        return `${codes.join('+')} ${n}s`;
      }
      case 'look': {
        const yaw = Number(a[0]);
        const pitch = Number(a[1]);
        if (a.length !== 2 || !Number.isFinite(yaw) || !Number.isFinite(pitch))
          throw new Error('look needs relative yaw and pitch in degrees');
        // Relative camera input, never a world-space view or a teleport. Positive yaw turns right, pitch looks up.
        await g.eval(`const { cam } = await import('/src/player/player.ts');
          cam.yaw -= ${yaw} * Math.PI / 180;
          cam.pitch = Math.max(-1.25, Math.min(0.9, cam.pitch + ${pitch} * Math.PI / 180));`);
        await step(1 / 60);
        return `look right ${yaw}°, up ${pitch}° (1 frame)`;
      }
      case 'still': {
        const name = a[0] ?? `session-${Date.now()}`;
        if (!/^[\w-]+$/.test(name)) throw new Error('still name uses letters, numbers, _ and -');
        const errors = g.healthErrors();
        if (errors.length) throw new Error(errors.join('\n'));
        return g.still(name);
      }
      case 'state': {
        const blind = a.includes('--blind');
        const text = await g.eval<{ text: string; where: string }[]>('return window.__observe.current();');
        const visible = async (selector: string) =>
          g.eval<string[]>(`return [...document.querySelectorAll(${JSON.stringify(selector)})]
            .filter(e => e.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
            .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; })
            .map(e => e.innerText.trim()).filter(Boolean);`);
        const result: Record<string, unknown> = {
          objective: await visible('.place-objective'),
          prompt: await visible('.prompt'),
          text: text.map((line) => line.text),
        };
        if (!blind)
          result.position = await g.eval(`const { me } = await import('/src/player/player.ts');
            const p = me.body?.position; return p ? { x: p.x, y: p.y, z: p.z } : null;`);
        return result;
      }
      case 'reload': {
        // fresh=1 is only for the first visit; remove it before reloading the same context and room.
        await g.eval(`window.dispatchEvent(new Event('pagehide'));
          const url = new URL(location.href); url.searchParams.delete('fresh'); history.replaceState(null, '', url);`);
        await g.page.reload();
        await g.page.waitForFunction(
          () => document.body.classList.contains('playing') && window.boogle?.prof?.last.frames,
        );
        await pause();
        return 'reloaded; browser storage and room retained';
      }
      case 'stop':
        return 'stopped';
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
  try {
    const at = option('--at');
    const save = at ? findSave(at) : undefined;
    const query = new URLSearchParams(save?.pageQuery);
    for (const [key, value] of new URLSearchParams(option('--query'))) query.set(key, value);
    if (save) query.delete('fresh');
    stack = await startStack({ root: path.resolve(option('--root') ?? root) });
    browser = await launch();
    game = await Game.open(browser, stack, {
      out: path.join(dir, 'session'),
      hud: true,
      size: [1180, 820],
      room: option('--room') ?? save?.room,
      query: query.toString(),
      warp: true,
      init: `${save ? SEED(save) : ''}\n(${installObserver.toString()})(${JSON.stringify(IGNORE_TEXT)});`,
    });
    if (save) await game.eval(POSE_AT(save));
    await pause();
    await step(1 / 60);
    server.on('request', async (req, res) => {
      const reply = (status: number, body: Reply) => {
        if (res.destroyed || res.writableEnded) return;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.method !== 'POST' || req.headers.authorization !== `Bearer ${token}`)
        return reply(403, { error: 'Forbidden', seconds: 0 });
      if (busy || closing) return reply(409, { error: 'Session busy; retry after the current command', seconds: 0 });
      busy = true;
      lastUsed = Date.now();
      const began = Date.now();
      const timer = setTimeout(() => {
        reply(504, { error: 'Command timed out; closing session', seconds: COMMAND_MS / 1000 });
        void close(1);
      }, COMMAND_MS);
      let request: Request | undefined;
      try {
        let body = '';
        for await (const chunk of req) {
          body += String(chunk);
          if (body.length > 1_000_000) throw new Error('Command too large');
        }
        const parsed = JSON.parse(body) as Request;
        if (
          typeof parsed.command !== 'string' ||
          !Array.isArray(parsed.args) ||
          parsed.args.some((a) => typeof a !== 'string')
        )
          throw new Error('Expected command and string args');
        request = parsed;
        const result = await execute(request);
        await pause();
        reply(200, { result, seconds: (Date.now() - began) / 1000 });
      } catch (error) {
        await pause().catch(() => {});
        reply(400, { error: String(error), seconds: (Date.now() - began) / 1000 });
      } finally {
        clearTimeout(timer);
        lastUsed = Date.now();
        busy = false;
      }
      if (request?.command === 'stop') setImmediate(() => void close());
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    address.url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    address.ready = true;
    publish();
    idle = setInterval(() => {
      if (!busy && Date.now() - lastUsed >= IDLE_MS) void close();
    }, 1000);
  } catch (error) {
    console.error(error);
    await close(1);
  }
}

async function main() {
  if (command === 'serve') return serve();
  if (command === 'start') {
    if (option('--at') === 'list') {
      const { listSaves } = await import('./saves.ts');
      return console.log(listSaves().join('\n'));
    }
    console.log(await start());
  } else {
    if (!command)
      throw new Error('session start | eval | step | keys | press | look | still | state [--blind] | reload | stop');
    if (!fs.existsSync(addressFile)) {
      if (command === 'stop') return console.log('already stopped');
      throw new Error('No session; npm run session -- start');
    }
    const address = readAddress();
    if (!alive(address.pid)) {
      removeAddress(address.token);
      throw new Error('Removed stale session address; start again');
    }
    if (command === 'stop' && !address.ready) {
      process.kill(address.pid, 'SIGTERM');
      console.log('stopping startup');
      return;
    }
    if (command === 'eval' && args[0] && fs.existsSync(args[0]))
      args.splice(
        0,
        args.length,
        stripTypeScriptTypes(fs.readFileSync(args[0], 'utf8')).replace(/^export \{\};.*$/m, ''),
      );
    const answer = await send(address, { command, args });
    if (answer.error) throw new Error(answer.error);
    if (command === 'stop') {
      const deadline = Date.now() + 15_000;
      while (fs.existsSync(addressFile) && readAddress().token === address.token) {
        if (Date.now() >= deadline) throw new Error('Stop did not finish; see .look/session-daemon.log');
        await sleep(50);
      }
    }
    console.log(typeof answer.result === 'string' ? answer.result : JSON.stringify(answer.result ?? null));
  }
}
await main()
  .catch((error) => {
    console.error(String(error));
    process.exitCode = 1;
  })
  .finally(() => {
    if (command !== 'serve') console.error(`${(performance.now() / 1000).toFixed(3)}s (node process)`);
  });
