import { BUILD } from '../../build-id.ts';
import { WORLD_NS } from '../../world/namespace.ts';
import { pageQuery } from '../../proto/flags.ts';
import { me } from '../../player/state.ts';
import { camera, canvas } from '../../render/scene.ts';
import { defineKind, spawn, despawn } from '../../entity/entity.ts';
import { command, el, copy, download, more } from './ui.ts';
import { ok, no, type Tool } from './types.ts';

let latest: unknown = null;
let textArea: HTMLTextAreaElement | null = null;
defineKind('dev-screenshot', { lateUpdate: 2000 });
async function report() {
  const [{ inspectSummary }, { roomSummary }] = await Promise.all([import('./inspect.ts'), import('./room.ts')]);
  const p = me.body?.position;
  const shell = window.boogle.dev?.snapshot();
  latest = {
    schema: 1,
    build: BUILD,
    namespace: WORLD_NS,
    route: { path: location.pathname, flags: Object.fromEntries(pageQuery()) },
    player: p ? { x: p.x, y: p.y, z: p.z, yaw: me.yaw } : null,
    camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov },
    dev: shell,
    inspection: await inspectSummary(),
    room: await roomSummary(),
    tuning: (await import('./tunables.ts')).tuneSnapshot(),
    limits: [
      'Screenshot contains the game canvas, not menu DOM.',
      'No actual GPU presentation timestamps.',
    ],
  };
  if (textArea) {
    textArea.value = JSON.stringify(latest, null, 2);
    const details = textArea.closest('details');
    if (details) details.open = true;
  }
  return latest;
}
function screenshot() {
  return new Promise<Blob>((resolve, reject) => {
    let requested = false;
    const timeout = setTimeout(() => {
      despawn(request);
      reject(new Error('Screenshot timed out: keep the rendered game visible.'));
    }, 4000);
    const request = spawn({
      kind: 'dev-screenshot',
      lateUpdate() {
        if (requested) return;
        requested = true;
        despawn(request);
        queueMicrotask(() => {
          try {
            canvas.toBlob((blob) => {
              clearTimeout(timeout);
              return blob ? resolve(blob) : reject(new Error('Canvas PNG capture is unavailable.'));
            }, 'image/png');
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      },
    });
  });
}
export const tool: Tool = {
  id: 'report',
  label: 'Copy test report',
  scope: 'Share bounded diagnostics. No credentials, world restore or executable code.',
  commands: [
    'read',
    'copy',
    'download',
    'screenshot',
    'record-start',
    'record-stop',
    'record-save',
    'reload-record',
  ],
  available: () => null,
  async run(name) {
    if (name === 'screenshot') {
      const blob = await screenshot();
      download(`boogle-${BUILD}.png`, blob);
      return ok('Downloaded game-canvas PNG (menu UI excluded).', {
        bytes: blob.size,
        width: canvas.width,
        height: canvas.height,
      });
    }
    if (name === 'reload-record') {
      const url = new URL(location.href);
      url.searchParams.set('record', '1');
      location.assign(url.href);
      return ok('Reloading with input recording.');
    }
    if (name.startsWith('record-')) {
      const recorder = window.boogle.record as { start(): void; stop(): unknown; save(): void } | undefined;
      if (!recorder) return no('Reload with record=1 first. Input trace is not a complete world replay.');
      if (name === 'record-start') recorder.start();
      else if (name === 'record-stop') recorder.stop();
      else recorder.save();
      return ok('Input recording command completed.');
    }
    const data = await report();
    const text = JSON.stringify(data, null, 2);
    if (name === 'download') {
      download(`boogle-test-${BUILD}.json`, new Blob([text], { type: 'application/json' }));
      return ok('Downloaded test report.');
    }
    if (name === 'copy') {
      const copied = await copy(text);
      textArea?.focus();
      textArea?.select();
      return ok(
        copied ? 'Test report copied.' : 'Clipboard unavailable; select/copy the report below, or download it.',
        { copied, report: data },
      );
    }
    return ok('Test report ready.', data);
  },
  mount(parent, ctx) {
    const details = more(parent);
    for (const [label, name] of [
      ['Read report', 'read'],
      ['Copy test report', 'copy'],
      ['Download report JSON', 'download'],
      ['Download screenshot', 'screenshot'],
      ['Reload with input recording', 'reload-record'],
      ['Start input trace', 'record-start'],
      ['Stop input trace', 'record-stop'],
      ['Save input trace', 'record-save'],
    ])
      command(['copy', 'screenshot'].includes(name!) ? parent : details, ctx, 'report', label!, name!);
    const output = el('textarea');
    output.readOnly = true;
    output.setAttribute('aria-label', 'Test report');
    textArea = output;
    details.append(output);
    parent.append(details);
    return () => {
      if (textArea === output) textArea = null;
    };
  },
};
