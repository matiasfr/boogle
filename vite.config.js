import { defineConfig } from 'vite';

// BASE=/boogle/ when building for GitHub Pages (served from a subpath).
// VITE_BUILD (the commit, set by deploy.yml) names the build; without it this is a dev build. The client reads it as
// import.meta.env.VITE_BUILD, and a build writes it to dist/version.json so open tabs notice a newer deploy
// (src/features/updates.js).
const build = process.env.VITE_BUILD || `dev-${Date.now().toString(36)}`;

export default defineConfig({
  base: process.env.BASE || '/',
  define: { 'import.meta.env.VITE_BUILD': JSON.stringify(build) },
  // Libraries in their own chunks: they change far less often than the game, so returning players keep them cached.
  // Lazy game parts (caves, Boogler talk, debug tools) split off on their own through import() (src/loop.js).
  build: {
    chunkSizeWarningLimit: 1200, // three.js with the WebGPU renderer and TSL is ~1.1 MB minified
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/three/examples/')) return undefined; // add-ons go with whoever uses them (caves)
          const m = id.match(/node_modules\/(three|cannon-es|peerjs)\//);
          return m ? m[1] : undefined;
        },
      },
    },
  },
  plugins: [
    {
      // Names each onFrame hook after its module, for the profiler (src/loop.js): `onFrame(` becomes
      // `onFrame.in('features/foo.js')(`, in dev and build alike.
      name: 'boogle-hook-names',
      transform(code, id) {
        const m = id.match(/\/src\/(.+\.[jt]s)$/);
        if (!m || /^loop\.[jt]s$/.test(m[1]) || !code.includes('onFrame(')) return null;
        return { code: code.replace(/\bonFrame\(/g, `onFrame.in(${JSON.stringify(m[1])})(`), map: null };
      },
    },
    {
      name: 'boogle-version',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) + '\n' });
      },
    },
  ],
});
