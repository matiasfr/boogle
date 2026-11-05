import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { escapeHtml, renderMarkdown } from './markdown.ts';

const SOURCE = 'docs/agents/orchestrator-state.md';

export function developmentPage(): Plugin {
  let root: string;
  let base: string;
  // Pages redirects directory requests; Vite's SPA fallback otherwise serves the game for the slashless URL.
  const redirect = (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== `${base}development`) return next();
    response.writeHead(308, { Location: `${base}development/${url.search}` });
    response.end();
  };
  return {
    name: 'boogle-development',
    configResolved(config) {
      root = config.root;
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        if (context.filename !== path.join(root, 'development/index.html')) return;
        const file = path.join(root, SOURCE);
        let content = '<p>The development status has not been published yet.</p>';
        let updated = 'Awaiting the first status update.';
        if (existsSync(file)) {
          const markdown = readFileSync(file, 'utf8');
          content = renderMarkdown(markdown);
          let date = statSync(file).mtime.toISOString();
          let label = 'Local file updated';
          try {
            const git = (...args: string[]) =>
              execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            if (git('show', `HEAD:${SOURCE}`) === markdown.trim()) {
              const committed = git('log', '-1', '--format=%cI', '--', SOURCE);
              if (committed) {
                date = new Date(committed).toISOString();
                label = 'Last updated';
              }
            }
          } catch {
            /* Source archives and untracked local previews use the file timestamp, explicitly labelled. */
          }
          updated = `${label}: <time datetime="${escapeHtml(date)}">${escapeHtml(date.replace('T', ' ').replace(/\.\d+Z$/, ' UTC'))}</time>`;
        }
        // Callback replacement keeps Markdown dollar signs literal.
        return html
          .replace('<!-- development-updated -->', () => updated)
          .replace('<!-- development-content -->', () => content);
      },
    },
  };
}
