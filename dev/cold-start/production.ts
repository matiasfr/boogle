// Worker-side only: production files and the game's existing server, both on loopback.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createService, loadConfig } from '../../server/src/server.ts';
import { freePort, sleep, type Stack } from '../look/lib.ts';
import { bootFaultProxy } from './boot-fault.ts';

export async function startProduction(dataRoot: string, { harness = false } = {}): Promise<Stack> {
  const dataDir = fs.mkdtempSync(path.join(dataRoot, 'boogle-cold-'));
  const dist = path.join(dataDir, 'dist');
  const rooms = path.join(dataDir, 'rooms');
  const server = createService(loadConfig({ DATA_DIR: rooms, SERVER_ROOMS: '*' }, { log: () => {} }));
  const port = await server.listen(0);
  const env = {
    ...process.env,
    BOOGLE_HARNESS: harness ? '1' : '0',
    VITE_BOOGLE_SERVER: `http://127.0.0.1:${port}`,
    VITE_BUILD: 'cold-start-production',
  };
  const vite = path.resolve('node_modules/vite/bin/vite.js');
  const build = spawnSync(process.execPath, [vite, 'build', '--outDir', dist], {
    env,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (build.status !== 0) {
    await server.close({ save: false });
    throw new Error('Production build failed');
  }
  const html = path.join(dist, 'index.html');
  fs.writeFileSync(
    html,
    fs
      .readFileSync(html, 'utf8')
      .replace(/<link\b[^>]*href="https:\/\/fonts\.[^"]*"[^>]*>/g, '')
      .replace('</head>', '<link rel="icon" href="/icon-192.png"></head>'),
  );
  const http = await freePort();
  const preview = spawn(
    process.execPath,
    [vite, 'preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(http), '--strictPort'],
    { env, stdio: 'ignore' },
  );
  const base = `http://127.0.0.1:${http}/`;
  const fault =
    process.env.BOOGLE_BOOT_FAULTS === '1'
      ? await bootFaultProxy(base, dist, path.join(dataDir, 'boot-faults.json'))
      : undefined;
  const close = async () => {
    await fault?.close();
    preview.kill();
    await server.close({ save: false });
    // Keep the built files as evidence. No owner's saves were loaded.
  };
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) return { base: fault?.base ?? base, dataDir: rooms, close };
    } catch {
      /* starting */
    }
    await sleep(100);
  }
  await close();
  throw new Error('Production preview did not start');
}
