// Page-code helpers shared by scenarios (strings for `g.eval` / `g.waitFor`, plus a few steps run on Game handles).
// This folder is not a scenario: run.ts only lists the .ts files directly in dev/scenarios/.
import type { Game } from '../../look/lib.ts';

// ---- Window handles only (window.boogle, window.boogle.sync): safe for scenarios that also run on a built site
// (`--url`: smoke, reconnect-edit). Never add a /src/ import to this section.

// Receipt/view waits allow slow software-rendered test pages without changing simulation authority.
const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const EDIT_WAIT_MS = 180000;
export const MET = `window.boogle.net.room && window.boogle.remotes.size >= 1`;
const ROLE = `(() => { const w = window.boogle.sync.worldStatus(); return w.ready && w.mode; })()`;

// Waits until both tabs hold the world; `ok` when both follow the server's world (src/net/ws-room.ts: the server hosts
// every room). The historical handle names `host` and `client` mean first and second tab; neither owns shared state.
export async function roles(A: Game, B: Game) {
  for (const g of [A, B]) await g.waitFor(ROLE, { timeout: 60000 });
  const modes = [await A.eval(`return ${ROLE};`), await B.eval(`return ${ROLE};`)];
  const ok = modes.every((m) => m === 'client');
  return { modes, ok, host: A, client: B };
}

// Compare published server replicas at a shared server step. Sampling exists only during this check,
// with a bounded history and cleanup; it never hashes or simulates classic state.
export async function replicasAtOneStep(host: Game, client: Game) {
  const deadline = Date.now() + EDIT_WAIT_MS;
  const supported = await Promise.all(
    [host, client].map((g) => g.eval<boolean>(`return typeof window.boogle.sync.replica === 'function';`)),
  );
  if (!supported.every(Boolean))
    return { same: false, status: 'unavailable', detail: 'build lacks replica observation' };
  let detail = 'no samples';
  try {
    await Promise.all(
      [host, client].map((g) =>
        g.eval(`
      const samples = new Map();
      const timer = setInterval(() => {
        const r = window.boogle.sync.replica();
        if (!r?.ready) return;
        samples.set(r.step, JSON.stringify({ hash: r.hash, roster: r.roster, tune: r.tune }));
        if (samples.size > 4096) samples.delete(samples.keys().next().value);
      }, 50);
      window.__replicaCheck = { samples, timer };
    `),
      ),
    );
    const ticks = (g: Game) => g.eval<number[]>(`return [...window.__replicaCheck.samples.keys()];`);
    while (Date.now() < deadline) {
      const [h, c] = await Promise.all([ticks(host), ticks(client)]);
      const have = new Set(h);
      const common = c.filter((t) => have.has(t));
      detail = `host recorded ${h.length} ticks (${h[0]}..${h.at(-1)}), client ${c.length} (${c[0]}..${c.at(-1)}), none in common yet`;
      if (common.length) {
        const tick = Math.max(...common);
        const at = (g: Game) => g.eval<string | null>(`return window.__replicaCheck.samples.get(${tick}) ?? null;`);
        const [a, b] = await Promise.all([at(host), at(client)]);
        if (a && b) {
          const same = a === b;
          return {
            same,
            status: same ? 'matched' : 'mismatch',
            detail: `server step ${tick} host ${a} client ${b}`,
          };
        }
      }
      await sleepMs(1000);
    }
    return { same: false, status: 'unavailable', detail: `no shared tick before deadline; ${detail}` };
  } finally {
    await Promise.all(
      [host, client].map((g) =>
        g.eval(`
      clearInterval(window.__replicaCheck?.timer); delete window.__replicaCheck;
    `),
      ),
    );
  }
}

// ---- Game modules (dev server only).

// Put the player at (x, z), standing on the ground unless `y` is given.
export const TP = (x: number | string, z: number | string, y?: number | string) => `
  const { teleport } = await import('/src/physics/engine.ts');
  const { groundHeight } = await import('/src/island/terrain.ts');
  const b = window.boogle.me.body;
  teleport(b, ${x}, ${y ?? `groundHeight(${x}, ${z}) + 0.6`}, ${z});
  b.velocity.set(0, 0, 0);`;
export const INV = `const I = await import('/src/player/inventory.ts'); const H = await import('/src/player/hands.ts');`;
// Below about 4 fps a tab's world clock falls further behind every second (src/world/sync.ts, MAX_STEPS on a 50 ms dt) and
// its edits land ever later, so a long scenario on a CI runner's software WebGPU never ends. It only reads the HUD and
// the world's state, so it can draw a sixteenth of the pixels there. Stills stay sharp on a real GPU.
export const lowResOnCi = (g: Game) =>
  process.env.CI ? g.eval(`(await import('/src/render/scene.ts')).renderer.setPixelRatio(0.25);`) : undefined;
