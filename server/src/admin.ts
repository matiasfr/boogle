// The operator's room tools, so a playtest's save data is managed without a deploy (`npm run server`,
// dev/server-admin.ts). Same guard as /admin/saves: they exist only when REPORT_TOKEN is set, as a bearer token.
//
//   GET  /admin/rooms                      { ns, rail, rooms: [{ id, bytes, savedAt, loaded, players, tick? }], backups }
//   POST /admin/rooms/:id/backup           copy the room's last checkpoint (up to SERVER_SAVE_MS old) into .backups/
//   POST /admin/rooms/:id/reset            back the save up, then remove it: the next join starts a fresh world
//   POST /admin/rooms/:id/restore?backup=  back the save up, then put a backup (default: that room's newest) in its place
//
// Reset and restore take the room offline first (everyone gets `bye` and reconnects into the new world) and answer 409
// while players are in it unless `?force=1`. Backups are `.backups/<room>@<UTC stamp>.json`; the newest KEEP stay.
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Express, Request, Response, NextFunction } from 'express';
import type { RoomHost } from './host/rooms.ts';
import type { RoomDoc, Store } from './store.ts';
import { currentRoomId, roomNamespaces } from './room-ids.ts';
import { BACKUP_RE, type Replacements } from './replacements.ts';
import { validateSeedDoc } from './seeds/validate.ts';
import { isRailwayRoom } from '../../src/world/railway-namespace.ts';

const KEEP = 30;

export function addAdmin(
  app: Express,
  cfg: { dataDir: string; serverRooms: string[]; log: (...a: unknown[]) => void },
  deps: {
    authed: (req: Request, res: Response) => boolean;
    store: Store;
    roomHost: () => RoomHost | null;
    replacements?: Replacements;
  },
) {
  const { store } = deps;
  const ns = roomNamespaces(cfg.serverRooms);
  const dir = path.join(cfg.dataDir, '.backups');
  const saveFile = (id: string) => path.join(cfg.dataDir, `${id}.json`);

  async function backups() {
    const names = await fs.readdir(dir).catch(() => [] as string[]);
    const out = [];
    for (const name of names.filter((n) => BACKUP_RE.test(n)).sort((a, b) => stampOf(b).localeCompare(stampOf(a)))) {
      const stat = await fs.stat(path.join(dir, name)).catch(() => null);
      if (stat?.isFile()) out.push({ name, room: BACKUP_RE.exec(name)![1]!, bytes: stat.size });
    }
    return out; // newest first
  }
  const stampOf = (name: string) => BACKUP_RE.exec(name)?.[2] ?? '';

  // Under the room's writer lock: its save as a new backup (moved or copied). Null when the room has no save.
  async function keep(id: string, move: boolean): Promise<string | null> {
    const name = `${id}@${new Date().toISOString().replace(/[-:.]/g, '')}.json`;
    const made = await store.withLock(id, async () => {
      await fs.mkdir(dir, { recursive: true });
      try {
        if (move) await fs.rename(saveFile(id), path.join(dir, name));
        else await fs.copyFile(saveFile(id), path.join(dir, name));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        if (move) store.forget(id); // a world that never saved starts over too
        return null;
      }
      if (move) store.forget(id);
      return name;
    });
    for (const old of (await backups()).slice(KEEP)) await fs.rm(path.join(dir, old.name), { force: true });
    return made;
  }

  type RoomReq = Request<{ id: string }>;
  const route = (fn: (req: RoomReq, res: Response, host: RoomHost) => Promise<unknown>) => {
    return async (req: RoomReq, res: Response, next: NextFunction) => {
      if (!deps.authed(req, res)) return;
      const host = deps.roomHost();
      if (!host || !currentRoomId(req.params.id, ns)) return res.status(400).json({ error: 'not a current room id' });
      if (deps.replacements && !deps.replacements.begin(req.params.id)) return res.status(409).json({ error: 'busy' });
      try {
        res.set('Cache-Control', 'no-store');
        await deps.replacements?.recover(req.params.id);
        await fn(req, res, host);
      } catch (error) {
        next(error);
      } finally {
        deps.replacements?.end(req.params.id);
      }
    };
  };
  // Runs fn with the room offline, unless players are in it (without ?force=1) or it is already closing.
  async function offline(
    req: RoomReq,
    res: Response,
    host: RoomHost,
    fn: () => Promise<Record<string, unknown>>,
    save = false,
  ) {
    const id = req.params.id;
    const players = host.room(id)?.status().players ?? 0;
    if (players && req.query.force !== '1') return res.status(409).json({ error: 'players in the room', players });
    const done = await host.offline(id, fn, { save });
    if (done === 'busy') return res.status(409).json({ error: 'the room is closing; try again' });
    cfg.log(`admin: ${req.path} ${JSON.stringify(done)}`);
    res.json({ ok: true, room: id, kicked: players, ...done });
  }

  app.get('/admin/rooms', async (req: Request, res: Response, next: NextFunction) => {
    if (!deps.authed(req, res)) return;
    try {
      const host = deps.roomHost();
      const rooms = [];
      for (const name of (await fs.readdir(cfg.dataDir)).sort()) {
        const id = /^([a-z0-9-]{1,32})\.json$/.exec(name)?.[1];
        if (!id || !currentRoomId(id, ns)) continue;
        const stat = await fs.stat(path.join(cfg.dataDir, name)).catch(() => null);
        if (!stat?.isFile()) continue;
        const live = host?.room(id)?.status();
        rooms.push({
          id,
          bytes: stat.size,
          savedAt: stat.mtime.toISOString(),
          loaded: !!live,
          players: live?.players ?? 0,
          ...(live ? { tick: live.tick } : {}),
        });
      }
      res.set('Cache-Control', 'no-store');
      res.json({
        ns: ns.world,
        rail: ns.rail,
        rooms,
        backups: [...(await backups()), ...(await (deps.replacements?.pins() ?? []))].sort((a, b) =>
          stampOf(b.name).localeCompare(stampOf(a.name)),
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/admin/backups/:name/release', async (req: Request, res: Response, next: NextFunction) => {
    if (!deps.authed(req, res)) return;
    const name = String(req.params.name);
    if (!deps.replacements || !BACKUP_RE.test(name)) return res.status(400).json({ error: 'invalid backup name' });
    const id = BACKUP_RE.exec(name)![1]!;
    if (!deps.replacements.begin(id)) return res.status(409).json({ error: 'busy' });
    try {
      await deps.replacements.recover(id);
      await deps.replacements.release(name);
      res.json({ ok: true, released: name });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return res.status(404).json({ error: 'no such pin' });
      next(error);
    } finally {
      deps.replacements.end(id);
    }
  });

  app.post(
    '/admin/rooms/:id/backup',
    route(async (req, res) => {
      const backup = await keep(req.params.id, false);
      if (!backup) return res.status(404).json({ error: 'the room has no save' });
      res.json({ ok: true, room: req.params.id, backup });
    }),
  );

  app.post(
    '/admin/rooms/:id/reset',
    route((req, res, host) => offline(req, res, host, async () => ({ backup: await keep(req.params.id, true) }))),
  );

  app.post(
    '/admin/rooms/:id/restore',
    route(async (req, res, host) => {
      const id = req.params.id;
      const mine = [...(await backups()), ...(await (deps.replacements?.pins() ?? []))]
        .filter((b) => b.room === id)
        .sort((a, b) => stampOf(b.name).localeCompare(stampOf(a.name)));
      const from = typeof req.query.backup === 'string' ? mine.find((b) => b.name === req.query.backup) : mine[0];
      if (!from) return res.status(404).json({ error: 'no such backup for this room' });
      const doc = JSON.parse(
        await fs.readFile(path.join(dir, 'pinned' in from ? 'pinned' : '', from.name), 'utf8'),
      ) as RoomDoc;
      if (!doc || !Number.isSafeInteger(doc.tick) || typeof doc.data !== 'object' || !doc.data)
        return res.status(422).json({ error: 'the backup is not a room save' });
      try {
        if (isRailwayRoom(id)) await validateSeedDoc(doc);
      } catch {
        return res.status(422).json({ error: 'the backup is not a verified room save' });
      }
      await offline(
        req,
        res,
        host,
        async () => {
          const backup = await keep(id, false);
          await store.withLock(id, () => store.replace(id, doc, { restoreBorn: true }));
          await deps.replacements?.logRestore(id, from.name);
          return { restored: from.name, backup };
        },
        true,
      );
    }),
  );
}
