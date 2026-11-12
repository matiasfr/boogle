// Page-code helpers shared by scenarios (strings for `g.eval` / `g.waitFor`, plus a few steps run on Game handles).
// This folder is not a scenario: run.ts only lists the .ts files directly in dev/scenarios/.
import type { Game } from '../../look/lib.ts';

// ---- Window handles only (window.boogle, window.boogle.sync): safe for scenarios that also run on a built site
// (`--url`: smoke, reconnect-edit). Never add a /src/ import to this section.

// How long to wait for a tab to apply an edit, a toss or a pick-up. At about a frame a second (a CI runner's software
// WebGPU) a tab's world clock gains 2.5 ticks a frame (src/world/sync.ts, MAX_STEPS on a 50 ms dt), so it applies one it
// has already received 80 s or more late. On a real GPU it lands at once and the wait returns.
const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const EDIT_WAIT_MS = 180000;
export const MET = `window.boogle.net.room && window.boogle.remotes.size >= 1`;
const ROLE = `(() => { const w = window.boogle.sync.worldStatus(); return w.ready && w.mode + (w.hostId === 'server' ? '@server' : ''); })()`;
const LEAD = `window.boogle.net.room.isLead()`;

// Waits until both tabs hold the world; `ok` when both follow the server's world (src/net/ws-room.ts: the server hosts
// every room). `host` is the lead tab (it runs the Boogler, addHostField), `client` the other; tests that only need two
// tabs use them as "this one" and "that one".
export async function roles(A: Game, B: Game) {
  for (const g of [A, B]) await g.waitFor(ROLE, { timeout: 60000 });
  const modes = [await A.eval(`return ${ROLE};`), await B.eval(`return ${ROLE};`)];
  const ok = modes.every((m) => m === 'client@server');
  const [host, client] = (await A.eval(`return ${LEAD};`)) ? [A, B] : [B, A];
  return { modes, ok, host, client };
}

// Record ticks while this check is active, then wait for an actual overlap. Installing a fixed future range after
// separate tick reads races slow evaluations, and snapshots can skip it. A rolling history keeps recording across
// those jumps and retains the faster tab's samples until the slower tab arrives. No extra hashing in normal play.
export async function hashesAtOneTick(host: Game, client: Game) {
  const deadline = Date.now() + EDIT_WAIT_MS;
  const supported = await Promise.all(
    [host, client].map((g) => g.eval<boolean>(`return typeof window.boogle.sync.captureHashes === 'function';`)),
  );
  if (!supported.every(Boolean))
    return { same: false, status: 'unavailable', detail: 'build lacks bounded hash capture' };
  let detail = 'no samples';
  try {
    await Promise.all([host, client].map((g) => g.eval(`window.boogle.sync.captureHashes(true);`)));
    // Each tab records its hashes on a shared tick grid (src/features/debug-handle.ts) and keeps a long history, so the
    // faster tab's samples are still there when the slower one arrives at a tick. Compare the latest tick both hold; a
    // slow client never has to land inside a short sliding window.
    const ticks = (g: Game) => g.eval<number[]>(`return window.boogle.sync.hashTicks();`);
    while (Date.now() < deadline) {
      const [h, c] = await Promise.all([ticks(host), ticks(client)]);
      const have = new Set(h);
      const common = c.filter((t) => have.has(t));
      detail = `host recorded ${h.length} ticks (${h[0]}..${h.at(-1)}), client ${c.length} (${c[0]}..${c.at(-1)}), none in common yet`;
      if (common.length) {
        const tick = Math.max(...common);
        const at = (g: Game) => g.eval<Record<string, number> | null>(`return window.boogle.sync.hashesAt(${tick});`);
        const [a, b] = await Promise.all([at(host), at(client)]);
        if (a && b) {
          const same = JSON.stringify(a) === JSON.stringify(b);
          return {
            same,
            status: same ? 'matched' : 'mismatch',
            detail: `tick ${tick} host ${JSON.stringify(a)} client ${JSON.stringify(b)}`,
          };
        }
      }
      await sleepMs(1000);
    }
    return { same: false, status: 'unavailable', detail: `no shared tick before deadline; ${detail}` };
  } finally {
    await Promise.all([host, client].map((g) => g.eval(`window.boogle.sync.captureHashes(false);`)));
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
