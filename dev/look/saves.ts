// A save state per beat, written by `npm run playthrough` (./playthrough.ts) and read by `npm run look -- --at <beat>`: every
// localStorage entry at that moment and where the player stood, from a real run of the bot. It comes back through the game's
// own restore, so it holds whatever the game saves, abilities and town included, with no skip to write for them. What it can't
// hold is what the save doesn't: a train part way along, a moment mid-show. On the production route that is the pose and
// personal things only: railway progress is server state, started from a `--rail-seed` (./rail-seed.ts).
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib.ts';
import type { SaveState } from './observe.ts';

const DIR = path.join(root, '.look/playthrough/latest/saves');
export type Save = SaveState & { room: string; query: string; run: string; pageQuery: string };

const files = (dir = DIR) => {
  if (!fs.existsSync(dir)) throw new Error('No saves yet: npm run playthrough records them.');
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((f) => path.join(dir, f));
};
const read = (f: string): Save => {
  const s = JSON.parse(fs.readFileSync(f, 'utf8')) as Save;
  // The same page, without the bot.
  const q = new URLSearchParams(s.query);
  q.delete('shot');
  return { ...s, pageQuery: q.toString() };
};
export const listSaves = (dir?: string) =>
  files(dir).map((f) => {
    const s = read(f);
    return `${String(Math.round(s.t)).padStart(5)} s  ${s.beat}`;
  });
/** The first beat whose name holds `what`. */
export function findSave(what: string, dir?: string): Save {
  const all = files(dir).map(read);
  const hit = all.find((s) => s.beat.toLowerCase().includes(what.toLowerCase()));
  if (!hit) throw new Error(`No beat like "${what}". npm run look -- --at list names them.`);
  return hit;
}
/** What a run made, not who played it: a saved name would skip the lobby the harness walks through. */
const progress = (all: Record<string, string>) =>
  Object.fromEntries(Object.entries(all).filter(([k]) => !/^boogle(\.|-protos)/.test(k)));
/** Page init: the save's storage, before the game reads it. Only on the first load: a reload keeps what the game wrote. */
export const SEED = (s: Save) => `
  if (!sessionStorage.getItem('look-seeded')) {
    sessionStorage.setItem('look-seeded', '1');
    const all = ${JSON.stringify(progress(s.storage))};
    for (const k of Object.keys(all)) localStorage.setItem(k, all[k]);
  }
`;
/** Page code: the player back where they stood. */
export const POSE_AT = (s: Save) => `
  const p = ${JSON.stringify(s.pose)};
  if (!p) return;
  const { me, cam } = await import('/src/player/player.ts');
  const { teleport } = await import('/src/physics/engine.ts');
  while (!me.body) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 400));
  teleport(me.body, p.x, p.y, p.z);
  me.body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = p.yaw;
  cam.pitch = p.pitch;
`;
