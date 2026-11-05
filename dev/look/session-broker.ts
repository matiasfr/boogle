// Keep one existing broker look action open. The broker still owns the browser and final health evidence.
// This is only a command mailbox for captureShots, not a second browser driver.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { installWarp, type WarpHandle } from './warp.ts';
import { buildAt, sameBuild } from '../codex/source.ts';

export async function serveBroker(
  args: string[],
  token: string,
  dir: string,
  publish: (url: string, ready: boolean) => void,
) {
  const launchedAt = Date.now();
  let pageReadyAt: number | undefined;
  const build = buildAt(process.cwd());
  const logFile = path.join(dir, 'session-broker.log');
  let poll: http.ServerResponse | undefined;
  let pending: ((reply: { result?: string; error?: string }) => void) | undefined;
  let stopping = false;
  let lastUsed = Date.now();
  const reply = (res: http.ServerResponse, body: unknown, status = 200) => {
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(body));
  };
  const dispatch = (body: unknown) => {
    if (!poll || poll.destroyed) throw new Error('Broker page is not waiting; retry');
    reply(poll, body);
    poll = undefined;
  };
  const server = http.createServer((req, res) => void handle(req, res));
  async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST',
        'access-control-allow-headers': 'authorization, content-type',
      });
      res.end();
      return;
    }
    if (req.method !== 'POST' || req.headers.authorization !== `Bearer ${token}`)
      return reply(res, { error: 'Forbidden' }, 403);
    const began = Date.now();
    try {
      let text = '';
      for await (const chunk of req) {
        text += String(chunk);
        if (text.length > 64 * 1024 * 1024) throw new Error('Reply too large');
      }
      if (req.url === '/poll') {
        pageReadyAt ??= Date.now();
        if (poll) throw new Error('Duplicate page poll');
        if (stopping) reply(res, { stop: true });
        else poll = res;
        publish(url, !stopping);
        return;
      }
      if (req.url === '/result') {
        pending?.(JSON.parse(text));
        pending = undefined;
        return reply(res, {});
      }
      const request = JSON.parse(text) as { command: string; args: string[] };
      if (pending || stopping) throw new Error('Session busy or stopping');
      lastUsed = Date.now();
      if (request.command === 'stop') {
        stopping = true;
        if (poll) dispatch({ stop: true });
        const result = await finished;
        return reply(res, {
          ...(result.status ? { error: `Broker health failed; ${logFile}` } : { result }),
          seconds: (Date.now() - began) / 1000,
        });
      }
      if (request.command !== 'capture') throw new Error('Broker session supports capture and stop only');
      if (!sameBuild(build, buildAt(process.cwd()))) throw new Error('Source changed; stop and restart session');
      const body = stripTypeScriptTypes(fs.readFileSync(path.resolve(request.args[0]!), 'utf8')).replace(
        /^export \{\};.*$/m,
        '',
      );
      const result = new Promise<{ result?: string; error?: string }>((resolve) => {
        pending = resolve;
      });
      try {
        dispatch({ body });
      } catch (error) {
        pending = undefined;
        throw error;
      }
      reply(res, { ...(await result), seconds: (Date.now() - began) / 1000 });
      lastUsed = Date.now();
    } catch (error) {
      reply(res, { error: String(error), seconds: (Date.now() - began) / 1000 }, 400);
    }
  }
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  publish(url, false);
  const action = path.join(dir, `session-broker-action-${token}.ts`);
  fs.writeFileSync(
    action,
    `if (!window.__warp) (${installWarp.toString()})();
    await (${mailbox.toString()})(${JSON.stringify(url)}, ${JSON.stringify(token)});\nexport {};\n`,
  );
  const forwarded: string[] = [];
  for (let i = 0; i < args.length; i += 2)
    if (['--query', '--size', '--warm', '--eval', '--at', '--saves'].includes(args[i]!))
      forwarded.push(args[i]!, args[i + 1]!);
  const setupIndex = forwarded.indexOf('--eval');
  const setupBody =
    setupIndex < 0 ? '' : fs.readFileSync(forwarded[setupIndex + 1]!, 'utf8').replace(/^export \{\};.*$/m, '');
  const setupFile = path.join(dir, `session-setup-${token}.ts`);
  fs.writeFileSync(
    setupFile,
    `console.log('SESSION SETUP_START ' + Date.now());\n${setupBody}\nconsole.log('SESSION SETUP_END ' + Date.now());\nexport {};\n`,
  );
  if (setupIndex < 0) forwarded.push('--eval', setupFile);
  else forwarded[setupIndex + 1] = setupFile;
  const fd = fs.openSync(logFile, 'w');
  const child = spawn(
    process.execPath,
    [
      '.look/see-client.ts',
      'look',
      ...forwarded,
      '--action',
      action,
      '--frames',
      '2',
      '--seconds',
      '0.1',
      '--question',
      'Persistent frozen look-development session',
    ],
    { stdio: ['ignore', fd, fd] },
  );
  const finished = new Promise<{ evidence?: string; status: number }>((resolve) => {
    child.on('error', (error) => fs.writeSync(fd, String(error)));
    child.on('close', (code) => {
      fs.closeSync(fd);
      const output = fs.readFileSync(logFile, 'utf8');
      const evidence = output.match(/^Evidence: (.+)$/m)?.[1];
      const broker = evidence && JSON.parse(fs.readFileSync(evidence, 'utf8'));
      const setupStart = Number(output.match(/^SESSION SETUP_START (\d+)$/m)?.[1]);
      const setupEnd = Number(output.match(/^SESSION SETUP_END (\d+)$/m)?.[1]);
      const requestedAt = broker ? Number(broker.id.split('-')[0]) : NaN;
      const brokerAt = broker ? Date.parse(broker.started) : NaN;
      const preparation = {
        // The client creates its request ID before starting the local stack: this segment includes stack startup.
        clientDispatchMs: requestedAt - launchedAt,
        stackAndQueueMs: brokerAt - requestedAt,
        pageLoadMs: setupStart - brokerAt,
        setupRestoreMs: setupEnd - setupStart,
        fixtureWarmMs: (pageReadyAt ?? NaN) - setupEnd,
        totalMs: (pageReadyAt ?? NaN) - launchedAt,
      };
      const result = { evidence, status: code ?? 1 };
      fs.writeFileSync(path.join(dir, 'session-broker-result.json'), JSON.stringify(result));
      const queues = path.join(dir, 'session-queues', token + '.jsonl');
      if (fs.existsSync(queues)) {
        for (const line of fs.readFileSync(queues, 'utf8').trim().split('\n')) {
          const directory = JSON.parse(line) as string;
          const file = path.join(directory, 'manifest.json');
          const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
          manifest.brokerHealth = code === 0 && evidence ? 'passed' : 'failed';
          manifest.brokerEvidence = evidence;
          manifest.brokerPreparation = preparation;
          if (manifest.brokerHealth === 'failed') {
            manifest.failure = 'Persistent broker health failed; inspect session-broker.log';
            manifest.status = 'failed';
          }
          fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
          if (evidence)
            fs.cpSync(directory, path.join(path.dirname(evidence), 'shots', path.basename(directory)), {
              recursive: true,
            });
        }
      }
      pending?.({ error: `Broker ended (${code}); ${logFile}` });
      pending = undefined;
      resolve(result);
    });
  });
  // Finish inside the existing broker's seven-minute ceiling. A stopped session can be started again.
  const began = Date.now();
  const timer = setInterval(() => {
    if (Date.now() - began > 330_000 || (!pending && Date.now() - lastUsed > 120_000)) {
      stopping = true;
      if (poll) dispatch({ stop: true });
    }
  }, 1000);
  await finished;
  clearInterval(timer);
  // Let a waiting CLI stop response flush before closing connections.
  await new Promise((resolve) => setTimeout(resolve, 100));
  server.close();
  server.closeAllConnections();
}

async function mailbox(url: string, token: string) {
  const warp = window.__warp as WarpHandle;
  const post = async (route: string, body: unknown) => {
    const response = await fetch(url + route, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Session mailbox refused request');
    return response.json();
  };
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (body: string) => () => Promise<void>;
  let failed = false;
  try {
    for (;;) {
      warp.pause();
      const request = (await post('/poll', {})) as { stop?: boolean; body: string };
      if (request.stop) break;
      const lines: string[] = [];
      const log = console.log;
      console.log = (...values: unknown[]) => {
        if (String(values[0]).startsWith('SHOTS ')) lines.push(values.join(' '));
        log(...values);
      };
      let error: string | undefined;
      try {
        await new AsyncFunction(request.body)();
      } catch (e) {
        error = String(e);
        failed = true;
      } finally {
        console.log = log;
        warp.pause();
      }
      await post('/result', { result: lines.join('\n'), error });
    }
  } finally {
    warp.go(1);
  }
  if (failed) throw new Error('A persistent capture failed; inspect session evidence');
}
