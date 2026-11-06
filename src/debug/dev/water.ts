import { tuningEnabled, bindings } from '../../render/water/live.ts';

import { showWaterTuning } from '../water-tuning.ts';
import { command, note } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

/** Apply saved appearance even when the dock is collapsed; leave no panel or entity behind. */
export async function restoreWaterSettings() {
  if (!tuningEnabled) return;
  const close = await showWaterTuning(() => {}, document.createElement('div'), true);
  close();
}

export const tool: Tool = {
  id: 'water',
  label: 'Water',
  scope: 'Local appearance only. The shipped production-water panel owns these controls.',
  commands: ['settings', 'reload'],
  available: () => (tuningEnabled ? null : 'Open with Dev or tune=1 to tune the sea.'),
  run(command) {
    if (command === 'reload') {
      const url = new URL(location.href);
      url.searchParams.delete('water');
      url.searchParams.set('tune', '1');
      location.assign(url.href);
      return ok('Reloading with tuning.');
    }
    if (!tuningEnabled) return no('Reload with tuning: this visit uses compiled constants, not editable uniforms.');
    return ok(
      'Current water appearance.',
      Object.fromEntries([...bindings].map(([key, binding]) => [key, binding.get()])),
    );
  },
  snapshot: () => Object.fromEntries([...bindings].map(([key, binding]) => [key, binding.get()])),
  async mount(parent, ctx) {
    if (!tuningEnabled) {
      note(
        parent,
        'Opening a menu cannot turn this visit’s shader constants into uniforms. Reload keeps the current room; tuning changes only your view.',
      );
      command(parent, ctx, 'water', 'Reload with tuning', 'reload');
      return () => {};
    }
    return showWaterTuning(() => {}, parent, true);
  },
};
