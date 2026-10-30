import { defineConfig } from 'vite';

// BASE=/boogle/ when building for GitHub Pages (served from a subpath).
// VITE_BUILD (the commit, set by deploy.yml) names the build; without it this is a dev build. The client reads it as
// import.meta.env.VITE_BUILD, and a build writes it to dist/version.json so open tabs notice a newer deploy
// (src/features/updates.js).
const build = process.env.VITE_BUILD || `dev-${Date.now().toString(36)}`;

export default defineConfig({
  base: process.env.BASE || '/',
  define: { 'import.meta.env.VITE_BUILD': JSON.stringify(build) },
  plugins: [
    {
      name: 'boogle-version',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) + '\n' });
      },
    },
  ],
});
