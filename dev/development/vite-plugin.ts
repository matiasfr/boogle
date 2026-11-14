import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { escapeHtml, renderMarkdown } from './markdown.ts';
import { BACKLOG, renderBacklog } from './backlog.ts';

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
        const backlog = path.join(root, BACKLOG);
        if (!existsSync(backlog)) throw new Error(`${BACKLOG}:1: Missing Committed work table (file not found)`);
        let content = renderBacklog(readFileSync(backlog, 'utf8'));
        const file = path.join(root, SOURCE);
        if (existsSync(file)) {
          content += `<section class="running" aria-labelledby="running"><h2 id="running">Running now</h2>${renderMarkdown(readFileSync(file, 'utf8'), 2)}</section>`;
        }
        let updated = 'Backlog commit date unavailable.';
        try {
          const committed = execFileSync('git', ['log', '-1', '--format=%cI', '--', BACKLOG], {
            cwd: root,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim();
          if (committed) {
            const date = new Date(committed).toISOString();
            updated = `Last updated: <time datetime="${escapeHtml(date)}">${escapeHtml(date.replace('T', ' ').replace(/\.\d+Z$/, ' UTC'))}</time>`;
          }
        } catch {
          /* Source archives without Git history cannot supply a commit date. */
        }
        // Callback replacement keeps Markdown dollar signs literal.
        return html
          .replace('<!-- development-updated -->', () => updated)
          .replace('<!-- development-content -->', () => content);
      },
    },
  };
}
