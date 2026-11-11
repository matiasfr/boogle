import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export async function startWarpServer(env: Record<string, string>) {
  const child = fork(fileURLToPath(new URL('./server-child.ts', import.meta.url)), [], {
    // --import takes a module specifier: a file URL works on every platform, a Windows path (C:\...) does not.
    execArgv: ['--import', new URL('./server-clock.ts', import.meta.url).href],
    env: { ...process.env, LOOK_SERVER_ENV: JSON.stringify(env) },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  const exited = new Promise<void>((resolve) => child.once('close', () => resolve()));
  try {
    const ready = await new Promise<{ port: number; clockUrl: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Warp server startup timed out')), 15000);
      child.once('message', (m) => {
        clearTimeout(timer);
        resolve(m as { port: number; clockUrl: string });
      });
      child.once('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Warp server exited: ${code}`));
      });
    });
    return {
      ...ready,
      async close() {
        if (child.connected) child.send('close', () => {});
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        await exited;
        clearTimeout(timer);
      },
    };
  } catch (e) {
    child.kill('SIGKILL');
    await exited;
    throw e;
  }
}
