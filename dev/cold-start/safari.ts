// Availability probe only. WebDriver creates an automation session, never drives an
// owner's existing window. No --enable, preferences, cache deletion or navigation.
import { spawn } from 'node:child_process';
import { freePort, sleep } from '../look/lib.ts';

export async function safariProbe() {
  const port = await freePort();
  const child = spawn('/usr/bin/safaridriver', ['--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (data) => {
    log += String(data);
  });
  child.stderr.on('data', (data) => {
    log += String(data);
  });
  child.on('error', (error) => {
    log += String(error);
  });
  const base = `http://127.0.0.1:${port}`;
  let session: string | undefined;
  try {
    for (let i = 0; i < 30; i++) {
      try {
        if ((await fetch(`${base}/status`, { signal: AbortSignal.timeout(500) })).ok) break;
      } catch {
        /* starting */
      }
      if (child.exitCode !== null) throw new Error(`safaridriver exited ${child.exitCode}: ${log}`);
      await sleep(100);
    }
    const response = await fetch(`${base}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ capabilities: { alwaysMatch: { browserName: 'safari' } } }),
      signal: AbortSignal.timeout(15000),
    });
    const result = (await response.json()) as { value?: { sessionId?: string } };
    session = result.value?.sessionId;
    return {
      available: !!session,
      response: result,
      log,
      trueCold: false,
      reason: 'safaridriver has no test-exclusive disk/Metal cache selector. No caches cleared; no benchmark claimed.',
    };
  } catch (error) {
    return { available: false, error: String(error), log, trueCold: false };
  } finally {
    if (session)
      await fetch(`${base}/session/${session}`, { method: 'DELETE', signal: AbortSignal.timeout(3000) }).catch(
        () => {},
      );
    child.kill();
  }
}
