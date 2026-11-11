// The device test's panel (Local, cosmetic): the card with the Run button, the progress strip, the summary card.
// Built with textContent only; the label comes from the address.
import './panel.css';
import type { UploadState } from './upload.ts';
import type { Fields } from './wire.ts';

export type Summary = {
  device: string;
  rows: Fields[];
  drift: number | null;
  pass: number;
  total: number;
  code: string;
  /** `readyLine`: "Ready in 2.8 s (warm load)". */
  ready: string;
  upload: UploadState;
  uploadNote: string;
};

function h<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

export function createPanel(info: {
  suite: string;
  build: string;
  label: string;
  code: string;
  self: boolean;
  note: string;
}) {
  const root = h('div', '', 'device-panel');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Device test');
  document.body.append(root);
  const head = () => {
    const parts = [`build ${info.build}`, info.label || 'no label', `run ${info.code}`];
    return [
      h('h2', `Device test: ${info.suite}`),
      h('p', parts.join(' · '), 'dev-sub'),
      ...(info.note ? [h('p', info.note, 'dev-sub')] : []),
    ];
  };
  const set = (cls: string, ...nodes: HTMLElement[]) => {
    root.className = `device-panel ${cls}`.trim();
    root.replaceChildren(...nodes);
  };

  let button: HTMLButtonElement | null = null;
  return {
    damaged() {
      set('', h('h2', 'This device link is damaged'), h('p', 'Ask for a new one: npm run device -- new', 'dev-sub'));
    },
    /** The card with Run; the button is disabled until `enable` is called. */
    ready(onRun: () => void) {
      button = h('button', 'Loading the game…');
      button.type = 'button';
      button.disabled = true;
      button.addEventListener('click', () => {
        button!.disabled = true;
        onRun();
      });
      set(
        '',
        ...head(),
        h('p', 'Measures this device: what it is, how the game loads and seven fixed scenes. About two minutes.'),
        h('p', 'Keep this tab in front and leave the device alone while it runs.', 'dev-sub'),
        button,
      );
    },
    enable() {
      if (!button) return;
      button.disabled = false;
      button.textContent = 'Run';
    },
    note(text: string) {
      if (button) button.textContent = text;
    },
    running(done: number, total: number, name: string, what: string) {
      const bar = h('div', '', 'dev-bar');
      const fill = h('i');
      fill.style.width = `${Math.round((done / total) * 100)}%`;
      bar.append(fill);
      set(
        'strip',
        h('div', `${done + 1} / ${total} ${name}: ${what}`),
        bar,
        h('div', 'Keep this tab in front.', 'dev-sub'),
      );
    },
    summary(s: Summary, onRetry: () => void) {
      const table = h('table');
      const headRow = h('tr');
      for (const c of ['scene', 'p50', 'p95', 'long', 'calls', '']) headRow.append(h('th', c));
      table.append(headRow);
      const f = (v: unknown, d = 1) => (typeof v === 'number' ? v.toFixed(d) : '-');
      for (const r of s.rows) {
        const tr = h('tr');
        const verdict = String(r.verdict ?? 'not-measured');
        tr.append(
          h('td', String(r.name)),
          h('td', f(r.p50)),
          h('td', f(r.p95)),
          h('td', f(r.over50, 0)),
          h('td', f(r.calls, 0)),
          h(
            'td',
            verdict === 'not-measured' ? 'n/m' : verdict,
            verdict === 'pass' ? 'pass' : verdict === 'fail' ? 'fail' : 'nm',
          ),
        );
        tr.title = String(r.why ?? '');
        table.append(tr);
      }
      const uploadLine =
        s.upload === 'ok'
          ? 'Uploaded.'
          : s.upload === 'failed'
            ? `Upload failed (${s.uploadNote || 'no answer'}).`
            : s.upload === 'offline'
              ? 'This build has no server to upload to.'
              : 'Uploading…';
      const nodes: HTMLElement[] = [
        ...head(),
        h('p', `${s.pass} / ${s.total} scenes pass on ${s.device}`),
        ...s.ready.split('\n').map((line) => h('p', line)),
        table,
        h(
          'p',
          'ms per frame (p50, p95), frames over 50 ms, draw calls. A pass is p95 under two refresh intervals.',
          'dev-sub',
        ),
        ...(s.drift === null
          ? []
          : [
              h(
                'p',
                `Heat check: p50 moved ${s.drift > 0 ? '+' : ''}${s.drift}% between the first and last spawn.`,
                'dev-sub',
              ),
            ]),
        h('p', uploadLine, s.upload === 'failed' ? 'fail' : ''),
        h('p', 'Tell the agent this code:', 'dev-sub'),
        h('div', s.code, 'dev-code'),
        ...(info.self ? [h('p', 'This link made its own run id (self-minted).', 'dev-sub')] : []),
      ];
      if (s.upload === 'failed') {
        const retry = h('button', 'Retry upload');
        retry.type = 'button';
        retry.addEventListener('click', onRetry);
        nodes.push(retry);
      }
      set('', ...nodes);
    },
  };
}
