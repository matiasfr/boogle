// Optional loopback response interception for the existing broker's production stack.
// The trusted broker cannot accept new Playwright routes; its ordinary look action drives a fresh iframe instead.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export async function bootFaultProxy(upstream: string, dist: string, report: string) {
  // The HTML entry and dynamic game both have main- names. Target the game, not the bootstrap script.
  const chunks = fs
    .readdirSync(path.join(dist, 'assets'))
    .filter(
      (file) =>
        /^main-.*\.js$/.test(file) &&
        fs.readFileSync(path.join(dist, 'assets', file), 'utf8').includes('[boot] startup failed'),
    );
  if (chunks.length !== 1) throw new Error('Identify exactly one dynamic game chunk before injecting faults');
  const gameChunk = `/assets/${chunks[0]}`;
  let mode = '';
  const heldBuddy: (() => void)[] = [];
  const requests: { url: string; status: number; at: number }[] = [];
  const proxy = http.createServer((req, res) => {
    const url = new URL(req.url!, upstream);
    // Existing broker evals can open a phone-profile document without changing the trusted browser harness.
    // This is Mac Chromium emulation, not Safari or device performance evidence.
    if (url.pathname === '/' && (url.searchParams.has('phoneStartup') || url.searchParams.has('loadProof'))) {
      const setup = `<script>
        const proof = new URLSearchParams(location.search);
        if (proof.has('phoneStartup')) {
        Object.defineProperty(window, 'devicePixelRatio', {value: 2});
        Object.defineProperty(navigator, 'maxTouchPoints', {value: 5});
        const mm = matchMedia.bind(window);
        window.matchMedia = q => q === '(pointer: coarse)' ? {matches: true, media:q, addEventListener(){}, removeEventListener(){}} : mm(q);
        localStorage.setItem('boogle.resolution', '0.60');
        }
        if (proof.has('reduceMotion')) {
          const mm = matchMedia.bind(window);
          window.matchMedia = q => q === '(prefers-reduced-motion: reduce)' ? {matches: true, media:q, addEventListener(){}, removeEventListener(){}} : mm(q);
          // Match the media-query CSS too, without changing the production stylesheet.
          const applyReduced = () => {
            let applied = false;
            for (const sheet of document.styleSheets) for (const rule of sheet.cssRules)
              if (rule instanceof CSSMediaRule && rule.conditionText === '(prefers-reduced-motion: reduce)') {
                rule.media.mediaText = 'all';
                applied = true;
              }
            if (applied) reducedObserver.disconnect();
          };
          // Run before the first splash paint, not after module evaluation at DOMContentLoaded.
          const reducedObserver = new MutationObserver(applyReduced);
          reducedObserver.observe(document.documentElement, {childList:true, subtree:true});
          document.addEventListener('DOMContentLoaded', applyReduced, {once:true});
        }
        if (proof.has('slowGraphics')) {
          const compile = GPUDevice.prototype.createRenderPipelineAsync;
          let until = 0;
          GPUDevice.prototype.createRenderPipelineAsync = function(...args) {
            const result = compile.apply(this, args);
            if (!performance.getEntriesByName('boot:buddy-ready').length) return result;
            if (!until) until = performance.now() + 26000;
            return result.then(async pipeline => {
              await new Promise(r => setTimeout(r, Math.max(0, until - performance.now())));
              return pipeline;
            });
          };
        }
        const nativeFetch = fetch.bind(window);
        let failed = false;
        window.fetch = async (input, init) => {
          const u = typeof input === 'string' ? input : input.url || input.href;
          if (new URLSearchParams(location.search).has('avatarHold') && /buddy.*\\.glb/.test(u))
            return nativeFetch(u + '?__holdBuddy=1', init);
          if (!failed && new URLSearchParams(location.search).has('avatarFailure') && /buddy.*\\.glb/.test(u)) {
            failed = true;
            throw new TypeError('Injected transient Buddy fetch failure');
          }
          if (new URLSearchParams(location.search).has('avatarDelay') && /(?:buddy|hero-clips).*\\.glb/.test(u))
            await new Promise(r => setTimeout(r, 18000));
          return nativeFetch(input, init);
        };
        if (proof.has('loadProof')) {
          let previous = '';
          new MutationObserver(() => {
            const groups = [...document.querySelectorAll('.load-groups > div')].map(el => el.innerText);
            const state = {groups, room: document.querySelector('.load-room')?.textContent, label: document.querySelector('.splash-label')?.textContent, carry: document.querySelector('.load-carry')?.textContent};
            const key = JSON.stringify(state);
            if (previous === key) return;
            previous = key;
            const marks = performance.getEntriesByType('mark').filter(m => m.name.startsWith('boot:')).map(m => ({name:m.name, t:Math.round(m.startTime)}));
            const splashAnimations = document.querySelector('.splash')?.getAnimations({subtree:true}).length ?? 0;
            console.log('LOAD state ' + JSON.stringify({t:Math.round(performance.now()), ...state, marks, splashAnimations, overflow:document.documentElement.scrollWidth > innerWidth}));
          }).observe(document.documentElement, {childList:true, subtree:true, characterData:true});
        }
      </script>`;
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
      res.end(fs.readFileSync(path.join(dist, 'index.html'), 'utf8').replace('<head>', '<head>' + setup));
      return;
    }
    if (url.pathname === '/__boot_fault') {
      if (req.method === 'POST') {
        const next = url.searchParams.get('mode') ?? '';
        if (!/^(wasm|chunk)-(once|always)$/.test(next)) {
          res.writeHead(400).end();
          return;
        }
        mode = next;
        requests.length = 0;
      }
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ mode, requests }));
      return;
    }
    const target = mode.startsWith('wasm')
      ? /\/rapier_wasm3d_bg-[^/]+\.wasm$/.test(url.pathname)
      : mode.startsWith('chunk') && url.pathname === gameChunk;
    // Chromium can refetch a failed modulepreload on import(). Fail both requests to exercise our reload.
    const fail = target && (mode.endsWith('always') || requests.length < (mode.startsWith('chunk') ? 2 : 1));
    if (target) {
      requests.push({ url: url.pathname, status: fail ? 503 : 200, at: Date.now() });
      fs.writeFileSync(report, JSON.stringify({ mode, requests }, null, 2));
    }
    if (fail) {
      res.writeHead(503, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
      res.end('Injected temporary outage');
      return;
    }
    const forward = () => {
      const request = http.request(
        url,
        { method: req.method, headers: { ...req.headers, host: url.host } },
        (reply) => {
          res.writeHead(reply.statusCode!, { ...reply.headers, 'cache-control': 'no-store' });
          reply.pipe(res);
        },
      );
      request.on('error', () => res.writeHead(502).end());
      if (req.method === 'GET' || req.method === 'HEAD') request.end();
      else req.pipe(request);
    };
    if (url.pathname === '/__buddy_release') {
      const count = heldBuddy.length;
      for (const release of heldBuddy.splice(0)) release();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ released: count }));
      return;
    }
    if (url.searchParams.has('__holdBuddy') && /\/buddy-[^/]+\.glb$/.test(url.pathname)) {
      url.searchParams.delete('__holdBuddy');
      heldBuddy.push(forward);
      return; // deliberately leave this HTTP response pending until the probe releases it
    }
    forward();
  });
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address();
  if (!address || typeof address === 'string') throw new Error('No fault proxy port');
  return {
    base: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        proxy.closeAllConnections();
        proxy.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
