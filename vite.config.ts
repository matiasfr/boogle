import { defineConfig } from 'vite';
import { background } from './src/async.ts';
import type { Rolldown } from 'vite';
import wasm from 'vite-plugin-wasm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { atlasFacts } from './dev/atlas/vite-plugin.ts';
import { assetCatalogue } from './dev/assets/vite-plugin.ts';
import { harnessImports } from './dev/look/import-map.ts';
import { developmentPage } from './dev/development/vite-plugin.ts';
import { serverBuild } from './dev/server-build.ts';
import { build as esbuild } from 'esbuild';
import type { Service, createService as CreateService, loadConfig as LoadConfig } from './server/src/server.ts';

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// BASE=/boogle/ when building for GitHub Pages (served from a subpath).
// VITE_BUILD (the commit, set by deploy.yml) names the build; without it this is a dev build. It goes in each page as
// <meta name="boogle-build"> (read by src/build-id.ts), never in a chunk: a deploy that only changes the id must not
// rename hashed files. A build also writes it to dist/version.json so open tabs notice a newer deploy
// (src/features/updates.ts).
const build = process.env.VITE_BUILD || `dev-${Date.now().toString(36)}`;

// BOOGLE_SW=off builds the service worker's kill switch (src/boot/sw-worker.ts): it clears its caches and unregisters.
const swOff = process.env.BOOGLE_SW === 'off';
// Lazy chunks the first frame waits for, precached with the page's static imports (docs/plans/loading.md).
const GAME_MODULE = /\/src\/main\.ts$/;
const SIMD_MODULE = /\/@dimforge\/rapier3d-simd\//;

let localServer: Service | null = null; // the dev server's own game server (boogle-local-server below)

export default defineConfig({
  base: process.env.BASE || '/',
  // Each checkout keeps its own dependency cache (.vite/, gitignored). Agent worktrees symlink one shared node_modules,
  // so the default node_modules/.vite let one worktree's re-optimise pull the deps out from under another's open pages
  // (the look harness's "lobby never offered Jump in" timeouts).
  cacheDir: '.vite',
  define: {
    'import.meta.env.VITE_SW': JSON.stringify(swOff ? 'off' : 'on'),
  },
  // Libraries in their own chunks: they change far less often than the game, so returning players keep them cached.
  // Lazy game parts (caves, Boogler talk, debug tools) split off on their own through import() (src/loop.ts).
  build: {
    target: 'es2022', // preserve Safari/iPad support, not Vite's moving baseline; Rapier needs top-level await
    chunkSizeWarningLimit: 1200, // three.js with the WebGPU renderer and TSL is ~1.1 MB minified
    rolldownOptions: {
      // The atlas (/atlas/) is a second page; d3 is imported only from atlas/, so it stays out of the game's chunks.
      // The prototype list (/protos/, protos/protos.ts) is a third, the character viewer (/character/) a fourth, and the menu Leave goes to (/menu/) a fifth.
      input: {
        main: resolve('index.html'),
        atlas: resolve('atlas/index.html'),
        protos: resolve('protos/index.html'),
        character: resolve('character/index.html'),
        assets: resolve('assets/index.html'),
        menu: resolve('menu/index.html'),
        development: resolve('development/index.html'),
      },
      output: {
        codeSplitting: {
          groups: [
            // Add-ons stay with whoever uses them (caves); only the core library shares this cache boundary.
            { name: 'three', test: /node_modules\/three\/(?!examples\/)/ },
          ],
        },
      },
    },
  },
  plugins: [
    wasm(), // Rapier ships its WASM as an ES module import
    {
      name: 'boogle-wasm-retry',
      transform(code, id) {
        if (id !== '/__vite-plugin-wasm-helper') return;
        const fetchCall = 'const response = await fetch(url);';
        if (!code.includes(fetchCall)) this.error('WASM helper changed: verify the bounded download retry.');
        return {
          code:
            `import { fetchWasm } from ${JSON.stringify(resolve('src/boot/asset-fetch.ts'))};\n` +
            code.replace(fetchCall, 'const response = await fetchWasm(url);'),
          map: null,
        };
      },
    },
    {
      // Names each onFrame hook after its module, for the profiler (src/loop.ts): `onFrame(` becomes
      // `onFrame.in('features/foo.js')(`, in dev and build alike.
      name: 'boogle-hook-names',
      transform(code: string, id: string) {
        const m = id.match(/\/src\/(.+\.[jt]s)$/);
        if (!m || /^loop\.[jt]s$/.test(m[1]) || !code.includes('onFrame(')) return null;
        return { code: code.replace(/\bonFrame\(/g, `onFrame.in(${JSON.stringify(m[1])})(`), map: null };
      },
    },
    atlasFacts(),
    assetCatalogue(),
    harnessImports(),
    developmentPage(),
    {
      // `npm run dev` runs our server in-process (every room, saves in .boogle-data/), so the game has its server
      // without anything else running. Skipped when VITE_BOOGLE_SERVER is set (the look harness runs its own).
      name: 'boogle-local-server',
      apply: 'serve',
      async config() {
        if (process.env.VITE_BOOGLE_SERVER) return;
        // Imported from a computed URL so the config bundler leaves it alone: the server's packages live in
        // server/node_modules (installed by the root postinstall).
        const { createService, loadConfig }: { createService: typeof CreateService; loadConfig: typeof LoadConfig } =
          await import(pathToFileURL(resolve('server/src/server.ts')).href);
        const env = { DATA_DIR: resolve('.boogle-data'), SERVER_ROOMS: '*' };
        localServer = createService(loadConfig(env, { log: (...a: unknown[]) => console.log('[server]', ...a) }));
        const port = await localServer.listen(0);
        // Same host as the page, so a phone on the LAN (vite --host) reaches it too.
        return {
          define: {
            'import.meta.env.VITE_BOOGLE_SERVER': `(location.protocol + '//' + location.hostname + ':${port}')`,
          },
        };
      },
      configureServer(server) {
        server.httpServer?.on('close', () => {
          if (localServer) background(localServer.close(), 'local server close');
        });
        // The look harness's cross-origin isolated pages (dev/look/lib.ts `isolated`: performance.now() in 5 us steps)
        // ask for it with `coi=1`. The headers must come from the server: a page Playwright fulfils itself cannot open
        // WebSockets, so the railway room never connected. (Here rather than in a plugin of its own: plugin names are
        // part of Vite's dependency hash, so a new one re-optimises every checkout's cache.)
        server.middlewares.use((req, res, next) => {
          if (/[?&]coi=1(?:&|$)/.test(req.url ?? '')) {
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
          }
          next();
        });
      },
    },
    {
      name: 'boogle-version',
      transformIndexHtml() {
        return [{ tag: 'meta', attrs: { name: 'boogle-build', content: build }, injectTo: 'head-prepend' }];
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source:
            JSON.stringify({ build, serverBuild: serverBuild(), server: process.env.VITE_BOOGLE_SERVER || '' }) + '\n',
        });
      },
    },
    {
      // dist/sw.js, from src/boot/sw-worker.ts: bundled on its own, with this build's id and the files the first frame
      // needs (the page, game and SIMD chunks' static imports, CSS and assets), for it to precache.
      name: 'boogle-sw',
      apply: 'build',
      generateBundle: {
        // Vite removes CSS-only JS chunks in generateBundle; precache the final graph, not those deleted files.
        order: 'post',
        async handler(_, bundle) {
          const chunks = Object.values(bundle).filter((c): c is Rolldown.OutputChunk => c.type === 'chunk');
          // Generated/shared chunks can have no facade. Inspect actual module membership, and seed every matching
          // chunk rather than depending on how Rolldown groups the dynamic import edges this release.
          const contains = (c: Rolldown.OutputChunk, re: RegExp) =>
            Object.keys(c.modules).some((id) => re.test(id.replaceAll('\\', '/')));
          // Module ids use / on Windows too; resolve() gives \ there, so compare both with /.
          const indexHtml = resolve('index.html').replaceAll('\\', '/');
          const page = chunks.filter((c) => c.isEntry && c.facadeModuleId?.replaceAll('\\', '/') === indexHtml);
          const game = chunks.filter((c) => contains(c, GAME_MODULE));
          const simd = chunks.filter((c) => contains(c, SIMD_MODULE));
          const first = new Set<string>();
          const add = (file: string) => {
            const c = bundle[file];
            if (!c || first.has(file)) return;
            first.add(file);
            if (c.type !== 'chunk') return;
            for (const f of [...(c.viteMetadata?.importedCss ?? []), ...(c.viteMetadata?.importedAssets ?? [])])
              first.add(f);
            c.imports.forEach(add);
          };
          for (const c of [...page, ...game, ...simd]) add(c.fileName);
          // The boot's lazy chunks: what the game's dynamic imports reach, less debug tools, other prototypes and
          // the plain-Rapier fallback. The railway's view imports its parts one after another, so on a first visit they
          // came as about twenty round trips in a row (docs/research/cold-start.md). The page lists them in a meta tag
          // for src/boot/boot-chunks.ts to preload at once, and the worker precaches them with the first files.
          const later =
            /\/src\/(debug|proto\/(?!place\/|flags\.ts|mark\.ts))|\/dev\/|\/@dimforge\/rapier3d\/|\/src\/boot\/(device-entry|jump-in)\.ts/;
          const boot: string[] = [];
          const reach = (c: Rolldown.OutputChunk) => {
            for (const file of [...c.imports, ...c.dynamicImports]) {
              const d = bundle[file];
              if (first.has(file) || boot.includes(file) || d?.type !== 'chunk' || contains(d, later)) continue;
              boot.push(file);
              reach(d);
            }
          };
          for (const file of [...first])
            if (bundle[file]?.type === 'chunk') reach(bundle[file] as Rolldown.OutputChunk);
          const html = bundle['index.html'];
          if (html?.type === 'asset' && typeof html.source === 'string')
            html.source = html.source.replace(
              '</head>',
              `<meta name="boogle-boot-chunks" content="${boot.join(' ')}">\n  </head>`,
            );
          for (const file of boot) {
            first.add(file);
            for (const css of (bundle[file] as Rolldown.OutputChunk).viteMetadata?.importedCss ?? []) first.add(css);
          }
          // Authored content (models, textures, audio) loads by need through the content manifest
          // (src/render/asset-manifest.ts), even where a feature imports its URL eagerly: not precached. The
          // self-hosted fonts (src/boot/splash.ts) come in with the page's CSS: their WOFF2 files are precached, the WOFF
          // fallbacks (for browsers that cannot run the game) are not.
          const content = /\.(glb|gltf|bin|ktx2|mp3|m4a|ogg|wav|opus|woff)$/;
          const config = { build, first: [...first].filter((f) => !content.test(f)).sort(), off: swOff };
          // Independently identify emitted WASM by its source, not its ambiguous rapier_wasm3d_bg basename.
          // A bundler/plugin change must fail the build instead of silently dropping physics from the precache.
          const wasm = Object.values(bundle).filter((c) => c.type === 'asset' && c.fileName.endsWith('.wasm'));
          const simdWasm = wasm.filter((c) => c.originalFileNames.some((id) => SIMD_MODULE.test('/' + id)));
          const plainWasm = wasm.filter((c) =>
            c.originalFileNames.some((id) => /\/@dimforge\/rapier3d\//.test('/' + id)),
          );
          const required = [...page, ...game, ...simd, ...simdWasm];
          if (
            !page.length ||
            !game.length ||
            !simd.length ||
            !simdWasm.length ||
            required.some((c) => !config.first.includes(c.fileName) || !bundle[c.fileName]) ||
            plainWasm.some((c) => config.first.includes(c.fileName))
          )
            this.error(
              'Precache must include the emitted page, game, SIMD chunks and SIMD WASM; plain WASM stays lazy.',
            );
          const out = await esbuild({
            entryPoints: [resolve('src/boot/sw-worker.ts')],
            bundle: true,
            write: false,
            minify: true,
            format: 'iife',
            target: 'es2022',
            define: { SW_CONFIG: JSON.stringify(config) },
          });
          this.emitFile({ type: 'asset', fileName: 'sw.js', source: out.outputFiles[0].text });
        },
      },
    },
  ],
});
