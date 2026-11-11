import { createService, loadConfig } from './server.ts';

const cfg = loadConfig();
const svc = createService(cfg);
const port = await svc.listen();
cfg.log(`boogle-server listening on :${port} (data: ${cfg.dataDir}, origins: ${cfg.allowedOrigins.join(',')})`);

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  cfg.log(`${signal} received, shutting down`);
  // Don't wait forever. The budget: rooms report by 7.5 s (server.ts logs the detail then), the HTTP close is forced by
  // 8.5 s, this exits at 9 s, Fly kills at 10 s (fly.toml kill_timeout). Any way out that is not a clean close (a room
  // that failed to close or still had writes queued) is logged and exits 1.
  const hard = setTimeout(() => {
    const rooms = svc.roomHost()?.closing() ?? [];
    cfg.log(`shutdown did not finish within 9000 ms; exiting; rooms still closing: ${rooms.join(', ') || 'none'}`);
    process.exit(1);
  }, 9000);
  hard.unref();
  try {
    await svc.close();
  } catch (error) {
    cfg.log('shutdown failed (detail logged above):', String(error));
    process.exit(1);
  }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
