import { BUILD } from '../../build-id.ts';
import { WORLD_NS } from '../../world/namespace.ts';
import { pageQuery, PROTO } from '../../proto/flags.ts';
import { me } from '../../player/state.ts';
import { camera, canvas } from '../../render/scene.ts';
import { defineKind, spawn, despawn } from '../../entity/entity.ts';
import { fixture, setupLink, VERSION } from './fixtures.ts';
import { command, note, el, copy, download } from './ui.ts';
import { ok, no, type Tool } from './types.ts';

let latest: unknown = null;
let textArea: HTMLTextAreaElement | null = null;
defineKind('dev-screenshot', { lateUpdate: 2000 });
async function currentSetup() {
  return setupLink(PROTO === 'place' ? (await import('./place.ts')).lastDestination : 'spawn');
}
async function report() {
  const [{ inspectSummary }, { roomSummary }] = await Promise.all([import('./inspect.ts'), import('./room.ts')]);
  const p = me.body?.position;
  const shell = window.boogle.dev?.snapshot();
  latest = {
    schema: 1,
    build: BUILD,
    namespace: WORLD_NS,
    fixtureVersion: VERSION,
    fixture: fixture(),
    route: { path: location.pathname, flags: Object.fromEntries(pageQuery()) },
    player: p ? { x: p.x, y: p.y, z: p.z, yaw: me.yaw } : null,
    camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov },
    dev: shell,
    inspection: await inspectSummary(),
    room: await roomSummary(),
    setup: await currentSetup(),
    limits: [
      'Setup, not exact world replay.',
      'Screenshot contains the game canvas, not menu DOM.',
      'No actual GPU presentation timestamps.',
    ],
  };
  if (textArea) textArea.value = JSON.stringify(latest, null, 2);
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
  scope: 'Share bounded diagnostics and a setup link. No credentials, world restore or executable code.',
  commands: [
    'read',
    'copy',
    'download',
    'setup',
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
    if (name === 'setup') {
      const url = await currentSetup();
      const copied = await copy(url);
      if (textArea) textArea.value = url;
      return ok(
        copied
          ? 'Setup link copied. Reopening asks before a disposable run.'
          : 'Select the setup URL below; clipboard unavailable.',
        { url },
      );
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
        data,
      );
    }
    return ok('Test report ready.', data);
  },
  mount(parent, ctx) {
    note(
      parent,
      'The setup link carries only named scenario/destination and appearance flags. It never resets the current room.',
    );
    for (const [label, name] of [
      ['Read report', 'read'],
      ['Copy test report', 'copy'],
      ['Download report JSON', 'download'],
      ['Copy setup link', 'setup'],
      ['Download screenshot', 'screenshot'],
      ['Reload with input recording', 'reload-record'],
      ['Start input trace', 'record-start'],
      ['Stop input trace', 'record-stop'],
      ['Save input trace', 'record-save'],
    ])
      command(parent, ctx, 'report', label!, name!);
    const output = el('textarea');
    output.readOnly = true;
    output.setAttribute('aria-label', 'Test report or setup link');
    textArea = output;
    parent.append(output);
    return () => {
      if (textArea === output) textArea = null;
    };
  },
};
