// npm run look -- --query 'loadCase=normal' --action dev/look/evals/load-screen.ts --name load-normal
// needs: BOOGLE_BOOT_FAULTS=1 node .look/see-client.ts look --production (a fresh production boot in an iframe); loadCase=normal|graphics|avatar|failure|details|literal, phone=1, reduced=1
// Broker action: a fresh real production boot, viewed in an iframe. No synthesized boot marks or staged UI.
// BOOGLE_BOOT_FAULTS=1 node .look/see-client.ts look --production --action dev/look/evals/load-screen.ts
// Parent query: loadCase=normal|graphics|avatar|failure|details|literal, phone=1, reduced=1.
const query = new URLSearchParams(location.search);
const mode = query.get('loadCase') ?? 'normal';
const phone = query.has('phone');
localStorage.removeItem('boogle.loadDetails');
if (query.has('openDetails')) localStorage.setItem('boogle.loadDetails', '1');
localStorage.setItem('boogle.name', 'Load proof');
// A fresh iframe must reach the fault proxy, not the parent's just-installed precache.
for (const worker of await navigator.serviceWorker.getRegistrations()) await worker.unregister();
const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const loop = renderer.getAnimationLoop();
await renderer.setAnimationLoop(null);
if (mode === 'failure') {
  const response = await fetch('/__boot_fault?mode=wasm-always', { method: 'POST' });
  if (!response.ok) throw new Error('Enable BOOGLE_BOOT_FAULTS=1');
}
const frame = document.createElement('iframe');
frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647';
frame.src =
  mode === 'literal'
    ? '/'
    : '/?loadProof=1&sw=0' +
      (phone ? '&phoneStartup=1' : '') +
      (query.has('reduced') ? '&reduceMotion=1' : '') +
      (mode === 'graphics' ? '&slowGraphics=1' : '') +
      (mode === 'avatar' ? '&avatarHold=1' : '') +
      (mode === 'details' ? '&tune=1' : '');
document.body.append(frame);
let previousLabel = '';
const labels: { t: number; text: string; visible: boolean }[] = [];
let labelSamples = 0;
let blankLabelSamples = 0;
const observe = setInterval(() => {
  const doc = frame.contentDocument;
  const child = frame.contentWindow;
  const label = doc?.querySelector<HTMLElement>('.splash-label');
  if (!label || !child) return;
  const text = label.textContent ?? '';
  const visible = label.style.visibility !== 'hidden';
  if (!doc!.querySelector('.splash.gone')) {
    labelSamples++;
    if (!visible || !text.trim()) blankLabelSamples++;
  }
  const key = `${visible}:${text}`;
  if (previousLabel === key) return;
  previousLabel = key;
  const entry = { t: Math.round(child.performance.now()), text, visible };
  labels.push(entry);
  console.log('LOAD label ' + JSON.stringify(entry));
}, 20);
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
// The action returns so look records the actual load. The observer reports failures without hiding the evidence.
void (async () => {
  const until = performance.now() + 80000;
  while (!frame.contentWindow?.performance.getEntriesByName('boot:interactive').length) {
    if (mode === 'failure' && frame.contentWindow?.performance.getEntriesByName('boot:failed').length) break;
    if (performance.now() > until) throw new Error('Load did not reach its expected handoff');
    await wait(100);
  }
  const child = frame.contentWindow!;
  const doc = frame.contentDocument!;
  const boot = () =>
    child.performance
      .getEntriesByType('mark')
      .filter((m) => m.name.startsWith('boot:'))
      .map((m) => ({ name: m.name, t: Math.round(m.startTime) }));
  const carry = () => doc.querySelector('.load-carry')?.textContent ?? '';
  clearInterval(observe);
  if (mode !== 'failure' && (!labelSamples || blankLabelSamples))
    throw new Error(`Blank label before entry: ${blankLabelSamples}/${labelSamples} samples`);
  if (doc.querySelector('.load-strip, .load-room, .load-carry, .splash .load-details'))
    throw new Error('Removed public load UI remains');
  const visibleLabels = labels.filter((entry) => entry.visible);
  if (visibleLabels.some((entry, i) => i > 0 && entry.t - visibleLabels[i - 1]!.t < 1950))
    throw new Error('Load labels changed faster than two seconds (50 ms sampling tolerance)');
  console.log(
    'LOAD handoff ' +
      JSON.stringify({
        mode,
        phone,
        boot: boot(),
        carry: carry(),
        entered: child.boogle?.me.entered,
        overflow: doc.documentElement.scrollWidth > child.innerWidth,
        labels,
        labelSamples,
        blankLabelSamples,
      }),
  );
  if (mode === 'failure') {
    const entry = doc.querySelector<HTMLButtonElement>('#enter');
    const faults = (await (await fetch('/__boot_fault')).json()) as { requests: { status: number }[] };
    if (
      boot().some((m) => m.name === 'boot:interactive') ||
      !entry?.disabled ||
      faults.requests.filter((r) => r.status === 503).length !== 3
    )
      throw new Error('Expected three failed downloads and disabled entry, without interactive');
    console.log('LOAD failure verified ' + JSON.stringify({ disabled: entry.disabled, faults }));
  }
  if (mode === 'avatar') {
    if (carry() || !boot().some((m) => m.name === 'boot:buddy-deadline'))
      throw new Error('Avatar deadline changed or public notice returned');
    await wait(5000);
    await fetch('/__buddy_release');
  }
  if (mode === 'avatar' || mode === 'graphics') {
    if (carry()) throw new Error('Public unfinished notice returned');
    const completed = mode === 'graphics' ? 'boot:warmup-complete' : 'boot:buddy-ready';
    while (!boot().some((mark) => mark.name === completed)) {
      if (performance.now() > until) throw new Error('Unfinished notice did not clear after real completion');
      await wait(100);
    }
    console.log('LOAD recovered ' + JSON.stringify({ mode, boot: boot(), carry: carry() }));
  }
  if (mode === 'details') {
    await child.boogle!.dev!.open('performance');
    const details = doc.querySelector<HTMLDetailsElement>('.dev-page .load-details')!;
    details.open = true;
    await wait(100);
    let copied = '';
    Object.defineProperty(child.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          copied = value;
          return Promise.resolve();
        },
      },
    });
    details.querySelector('button')!.click();
    await wait(100);
    const record = JSON.parse(copied) as { marks: { name: string; t: number }[] };
    if (JSON.stringify(record.marks) !== JSON.stringify(child.boogle!.boot!.timeline().marks))
      throw new Error('Copied load differs from timeline');
    if (!record.marks.every((m) => details.innerText.includes(`${m.name}: ${m.t}`)))
      throw new Error('Displayed numbers differ from copy');
    console.log('LOAD copy verified ' + JSON.stringify(record));
    await child.boogle!.dev!.open('room');
    await child.boogle!.dev!.open('performance');
    if (!doc.querySelector<HTMLDetailsElement>('.dev-page .load-details')?.open)
      throw new Error('Load detail preference was not retained');
    console.log('LOAD details preference retained');
    const retained = doc.querySelector<HTMLDetailsElement>('.dev-page .load-details')!;
    retained.querySelector('pre')!.scrollTop = retained.querySelector('pre')!.scrollHeight;
    retained.querySelector('button')!.scrollIntoView({ block: 'nearest' });
  }
  await renderer.setAnimationLoop(loop);
})().catch(async (error: unknown) => {
  clearInterval(observe);
  console.error('LOAD proof failed', error);
  await renderer.setAnimationLoop(loop);
});
export {};
