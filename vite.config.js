import { defineConfig } from 'vite';

// BASE=/boogle/ when building for GitHub Pages (served from a subpath).
export default defineConfig({ base: process.env.BASE || '/' });
