import { tuningEnabled, bindings } from '../../render/water/live.ts';
import { showWaterTuning } from '../water-tuning.ts';
import { command, note } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

export const tool: Tool = {
  id: 'water',
  label: 'Water',
  scope: 'Local appearance only. The shipped production-water panel owns these controls.',
  commands: ['settings', 'reload'],
  available: () =>
    tuningEnabled ? null : 'Editable uniforms are created at load. Reload with water=new&tune=1 to tune the sea.',
  run(command) {
    if (command === 'reload') {
      const url = new URL(location.href);
      url.searchParams.set('water', 'new');
      url.searchParams.set('tune', '1');
      if (url.searchParams.get('proto') === 'water') url.searchParams.set('proto', 'place');
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
    return showWaterTuning(() => {}, parent);
  },
};
