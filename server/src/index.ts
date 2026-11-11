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
  // Open WebSockets (peer signaling) can keep the server alive; don't wait forever. Either way out that is not a clean
  // close (a room that failed to close or still had writes queued) is logged and exits 1.
  const hard = setTimeout(() => {
    cfg.log('shutdown did not finish within 8000 ms; exiting');
    process.exit(1);
  }, 8000);
  hard.unref();
  try {
    await svc.close();
  } catch (error) {
    const inner = error instanceof AggregateError ? error.errors.map(String) : [];
    cfg.log('shutdown failed:', String(error), ...inner);
    process.exit(1);
  }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
