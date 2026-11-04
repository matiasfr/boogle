import { prof } from '../../loop.ts';
import { command, note, copy, el, more } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

let measurement: unknown = null;
const flags = () => new URLSearchParams(location.search);
const startup = () => (window as Window & { __startup?: { snapshot(): unknown } }).__startup?.snapshot() ?? null;
function snapshot() {
  return {
    cpu: prof.table(15),
    completedFrames: prof.last.frames,
    measurement,
    startup: startup(),
    gpu: flags().get('prof') === '1' ? 'See measured timestamp availability' : 'unavailable: reload with profiling',
    actualPresentation: 'unavailable',
    cache: 'Reload does not reset the Metal shader cache.',
  };
}
export const tool: Tool = {
  id: 'performance',
  label: 'Performance and startup',
  scope: 'Local diagnostics. Legacy capture stays enabled until a reload without its flag.',
  commands: ['read', 'measure', 'copy', 'reload-prof', 'reload-startup', 'reload-off'],
  available: () => null,
  async run(name) {
    if (name.startsWith('reload-')) {
      const url = new URL(location.href);
      if (name === 'reload-prof') url.searchParams.set('prof', '1');
      else if (name === 'reload-startup') url.searchParams.set('startup', '1');
      else for (const key of ['prof', 'startup', 'startupVideo', 'gpuinfo']) url.searchParams.delete(key);
      location.assign(url.href);
      return ok('Reloading capture settings.');
    }
    if (name === 'measure') {
      if (flags().get('prof') !== '1')
        return no('GPU timestamp capability is selected when the renderer starts. Reload with profiling first.');
      measurement = await (await import('../prof-overlay.ts')).hardwareTiming(5);
      return ok('Five-second measurement completed; inspect availability and visibility status.', measurement);
    }
    const data = snapshot();
    if (name === 'copy') {
      const copied = await copy(JSON.stringify(data, null, 2));
      return ok(copied ? 'Performance report copied.' : 'Clipboard unavailable; select the report text below.', data);
    }
    return ok('Current diagnostics.', data);
  },
  snapshot,
  mount(parent, ctx) {
    const details = more(parent);
    note(
      details,
      'CPU values cover the existing rolling window. GPU timestamps may be unsupported. Startup needs instrumentation before loading; a reload is not a cold-cache claim.',
    );
    for (const [label, name] of [
      ['Read diagnostics', 'read'],
      ['Measure 5 seconds', 'measure'],
      ['Copy performance report', 'copy'],
      ['Reload with profiling', 'reload-prof'],
      ['Reload with startup capture', 'reload-startup'],
      ['Reload without captures', 'reload-off'],
    ])
      command(name!.startsWith('reload') ? details : parent, ctx, 'performance', label!, name!);
    const text = el('textarea');
    text.readOnly = true;
    text.setAttribute('aria-label', 'Performance report');
    text.value = JSON.stringify(snapshot(), null, 2);
    details.append(text);
    parent.append(details);
    return () => {};
  },
};
