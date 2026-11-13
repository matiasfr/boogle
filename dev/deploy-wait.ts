// Deployment identity only: Pages supplies the server source commit, which can predate the Pages commit.
export const SERVER_WAIT_MS = 12 * 60 * 1000;
const POLL_MS = 15000;

export async function waitForServerBuild(
  expected: string,
  {
    readBuild,
    now = () => performance.now(),
    sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  }: {
    readBuild: (timeoutMs: number) => Promise<string>;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
  },
) {
  const until = now() + SERVER_WAIT_MS;
  let actual = '<no response>';
  let lastProbe = 'no response';
  while (now() < until) {
    try {
      actual = (await readBuild(Math.min(5000, until - now()))) || '<empty>';
      if (actual === expected && now() <= until) return actual;
      lastProbe = actual === expected ? 'matching commit arrived after the deadline' : `wrong commit ${actual}`;
    } catch (error) {
      lastProbe = `endpoint unavailable: ${String(error)}`;
    }
    const remaining = until - now();
    if (remaining > 0) await sleep(Math.min(POLL_MS, remaining));
  }
  throw new Error(
    `server deployment did not converge within ${SERVER_WAIT_MS / 1000}s: expected source commit ${expected}; ` +
      `last reported commit ${actual}; last probe: ${lastProbe}. ` +
      'Check deploy-server.yml for a failed, cancelled or superseded deploy before rerunning Smoke.',
  );
}
