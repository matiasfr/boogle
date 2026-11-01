import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { atlasFacts } from './dev/atlas/vite-plugin.ts';
import { build as esbuild } from 'esbuild';

const resolve = (p) => fileURLToPath(new URL(p, import.meta.url));

// BASE=/boogle/ when building for GitHub Pages (served from a subpath).
// VITE_BUILD (the commit, set by deploy.yml) names the build; without it this is a dev build. The client reads it as
// import.meta.env.VITE_BUILD, and a build writes it to dist/version.json so open tabs notice a newer deploy
// (src/features/updates.ts).
const build = process.env.VITE_BUILD || `dev-${Date.now().toString(36)}`;

// BOOGLE_SW=off builds the service worker's kill switch (src/boot/sw-worker.ts): it clears its caches and unregisters.
const swOff = process.env.BOOGLE_SW === 'off';
// Lazy chunks the first frame waits for, precached with the page's static imports (docs/plans/loading.md).
const FIRST_DYNAMIC = [/\/src\/main\.ts$/, /rapier3d-simd/];

let localServer = null; // the dev server's own game server (boogle-local-server below)

export default defineConfig({
  base: process.env.BASE || '/',
  define: {
    'import.meta.env.VITE_BUILD': JSON.stringify(build),
    'import.meta.env.VITE_SW': JSON.stringify(swOff ? 'off' : 'on'),
  },
  // Libraries in their own chunks: they change far less often than the game, so returning players keep them cached.
  // Lazy game parts (caves, Boogler talk, debug tools) split off on their own through import() (src/loop.ts).
  build: {
    target: 'es2022', // top-level await: Rapier's WASM module (src/physics/backend-rapier.ts); every WebGPU browser has it
    chunkSizeWarningLimit: 1200, // three.js with the WebGPU renderer and TSL is ~1.1 MB minified
    rollupOptions: {
      // The atlas (/atlas/) is a second page; d3 is imported only from atlas/, so it stays out of the game's chunks.
      // The prototype list (/protos/, protos/protos.ts) is a third.
      input: { main: resolve('index.html'), atlas: resolve('atlas/index.html'), protos: resolve('protos/index.html') },
      output: {
        manualChunks(id) {
          if (id.includes('/three/examples/')) return undefined; // add-ons go with whoever uses them (caves)
          const m = id.match(/node_modules\/(three)\//);
          return m ? m[1] : undefined;
        },
      },
    },
  },
  plugins: [
    wasm(), // Rapier ships its WASM as an ES module import
    {
      // Names each onFrame hook after its module, for the profiler (src/loop.ts): `onFrame(` becomes
      // `onFrame.in('features/foo.js')(`, in dev and build alike.
      name: 'boogle-hook-names',
      transform(code, id) {
        const m = id.match(/\/src\/(.+\.[jt]s)$/);
        if (!m || /^loop\.[jt]s$/.test(m[1]) || !code.includes('onFrame(')) return null;
        return { code: code.replace(/\bonFrame\(/g, `onFrame.in(${JSON.stringify(m[1])})(`), map: null };
      },
    },
    atlasFacts(),
    {
      // `npm run dev` runs our server in-process (every room, saves in .boogle-data/), so the game has its server
      // without anything else running. Skipped when VITE_BOOGLE_SERVER is set (the look harness runs its own).
      name: 'boogle-local-server',
      apply: 'serve',
      async config() {
        if (process.env.VITE_BOOGLE_SERVER) return;
        // Imported from a computed URL so the config bundler leaves it alone: the server's packages live in
        // server/node_modules (installed by the root postinstall).
        const { createService, loadConfig } = await import(pathToFileURL(resolve('server/src/server.js')).href);
        const env = { DATA_DIR: resolve('.boogle-data'), SERVER_ROOMS: '*' };
        localServer = createService(loadConfig(env, { log: (...a) => console.log('[server]', ...a) }));
        const port = await localServer.listen(0);
        // Same host as the page, so a phone on the LAN (vite --host) reaches it too.
        return {
          define: {
            'import.meta.env.VITE_BOOGLE_SERVER': `(location.protocol + '//' + location.hostname + ':${port}')`,
          },
        };
      },
      configureServer(server) {
        server.httpServer?.on('close', () => localServer?.close());
      },
    },
    {
      name: 'boogle-version',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) + '\n' });
      },
    },
    {
      // dist/sw.js, from src/boot/sw-worker.ts: bundled on its own, with this build's id and the files the first frame
      // needs (the page's static imports, the FIRST_DYNAMIC chunks and their CSS and assets), for it to precache.
      name: 'boogle-sw',
      apply: 'build',
      async generateBundle(_, bundle) {
        const first = new Set();
        const add = (file) => {
          const c = bundle[file];
          if (!c || first.has(file)) return;
          first.add(file);
          if (c.type !== 'chunk') return;
          for (const f of [...(c.viteMetadata?.importedCss ?? []), ...(c.viteMetadata?.importedAssets ?? [])])
            first.add(f);
          c.imports.forEach(add);
          for (const d of c.dynamicImports)
            if (FIRST_DYNAMIC.some((re) => re.test(bundle[d]?.facadeModuleId ?? ''))) add(d);
        };
        for (const c of Object.values(bundle))
          if (c.type === 'chunk' && c.isEntry && c.facadeModuleId?.endsWith('/index.html') && c.name === 'main')
            add(c.fileName);
        // Authored content (models, textures, audio) loads by need through the content manifest
        // (src/render/asset-manifest.ts), even where a feature imports its URL eagerly: not precached.
        const content = /\.(glb|gltf|bin|ktx2|mp3|m4a|ogg|wav|opus)$/;
        const config = { build, first: [...first].filter((f) => !content.test(f)).sort(), off: swOff };
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
  ],
});
