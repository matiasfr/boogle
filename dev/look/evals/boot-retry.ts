// npm run look -- --real --warm 0 --hud --query 'retryProof=wasm-once' --action dev/look/evals/boot-retry.ts --name wasm-once
//  (retryProof=wasm-once is the default; see the file for the others)
// needs: env BOOGLE_BOOT_FAULTS=1 node .look/see-client.ts look --production with the same flags (a fresh production boot)
// Existing look --action, with BOOGLE_BOOT_FAULTS=1 on see-client.ts --production.
// Keep the parent game alive for capture health; the full-size fresh iframe exercises the real boot.
// The deliberate HTTP/boot console errors remain strict and make the capture command fail after saving its images.
const mode = new URLSearchParams(location.search).get('retryProof') ?? 'wasm-once';
const response = await fetch(`/__boot_fault?mode=${mode}`, { method: 'POST' });
if (!response.ok) throw new Error('Start the production stack with BOOGLE_BOOT_FAULTS=1');
sessionStorage.removeItem('boogle-chunk-retries');
localStorage.removeItem('boogle-name');
const frame = document.createElement('iframe');
frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:99999';
frame.src = '/?sw=0&notrack=1&room=retry-proof&dpr=fixed&debugcam=1';
document.body.append(frame);
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const permanent = mode.endsWith('always');
const started = Date.now();
let passed = false;
while (Date.now() - started < 60000) {
  await wait(250);
  const doc = frame.contentDocument;
  const win = frame.contentWindow as Window | null;
  const enter = doc?.querySelector<HTMLButtonElement>('#enter');
  if (!doc || !win || !enter) continue;
  if (permanent) {
    if (
      !doc.querySelector('.splash') &&
      enter.disabled &&
      doc.querySelector('#lobby-sub')?.textContent?.includes('Please reload')
    ) {
      // Wait past both backoffs: permanent chunk failures must stop after three documents.
      await wait(4000);
      passed = true;
      break;
    }
  } else if (!enter.disabled && win.boogle?.me.body) {
    const input = doc.querySelector<HTMLInputElement>('#name-input');
    if (input) input.value = 'Retry proof';
    enter.click();
    await wait(1000);
    const before = { ...win.boogle.me.body.position };
    win.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
    await wait(1000);
    win.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
    const after = win.boogle.me.body.position;
    passed = Math.hypot(after.x - before.x, after.z - before.z) > 0.5;
    break;
  }
}
const record = (await (await fetch('/__boot_fault')).json()) as {
  requests: { url: string; status: number; at: number }[];
};
const failures = record.requests.filter((r) => r.status === 503).length;
const reloads =
  (JSON.parse(sessionStorage.getItem('boogle-chunk-retries') ?? '{}') as { attempt?: number }).attempt ?? 0;
passed &&= mode.startsWith('wasm')
  ? failures === (permanent ? 3 : 1) && reloads === 0
  : reloads === (permanent ? 2 : 1) && failures === (permanent ? 6 : 2);
const badge = document.createElement('pre');
badge.style.cssText =
  'position:fixed;left:8px;bottom:8px;z-index:100000;background:white;color:black;padding:12px;font:16px monospace';
badge.textContent =
  `${passed ? 'PASS' : 'FAIL'} ${mode}: ${failures} HTTP 503s; ${reloads} reloads\n${permanent ? 'failure shown' : 'loaded and walked'}; ` +
  record.requests.map((r) => `${r.status} +${r.at - record.requests[0]!.at}ms`).join(', ');
document.body.append(badge);
if (!passed) throw new Error(badge.textContent);
export {};
