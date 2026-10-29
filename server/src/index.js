import { createService, loadConfig } from './server.js';

const cfg = loadConfig();
const svc = createService(cfg);
const port = await svc.listen();
cfg.log(`boogle-server listening on :${port} (data: ${cfg.dataDir}, origins: ${cfg.allowedOrigins.join(',')})`);

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  cfg.log(`${signal} received, shutting down`);
  // Open WebSockets (peer signaling) can keep the server alive; don't wait forever.
  const hard = setTimeout(() => process.exit(0), 8000);
  hard.unref();
  await svc.close();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
