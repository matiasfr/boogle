import { DESTINATIONS, destinationName, fixtureReason, launch } from './fixtures.ts';
import { command, note, el } from './ui.ts';
import { islandPicker } from './routes.ts';
import { no, ok, type Tool } from './types.ts';
import { productionRailway } from '../../proto/flags.ts';

const labels: Record<string, string> = {
  spawn: 'Spawn',
  shore: 'Shore',
  shallow: 'Shallow water',
  deep: 'Deep water',
  plunge: 'Big-fall plunge (30 m)',
  tower: 'Tower',
  head: 'Far Head',
  forge: 'Forge',
  frame: 'Current construction frame',
};
export const tool: Tool = {
  id: 'destinations',
  label: 'Go to',
  scope: 'Owner movement, only in your disposable solo TEST run. Never advances progression.',
  commands: ['list', 'go', 'return', 'start'],
  available: () => null,
  async run(command, args) {
    if (command === 'list')
      return ok(
        'Named destinations.',
        DESTINATIONS.map((id) => ({ id, label: labels[id] })),
      );
    if (command === 'start') return launch('fresh', args.destination ?? 'spawn');
    const why = fixtureReason();
    if (productionRailway || why)
      return no(why ?? 'Only an explicitly launched disposable solo place run can move or skip. Start a test below.');
    if (command === 'return') return (await import('./place.ts')).travel('return');
    if (!destinationName(args.destination)) return no('Choose a named destination.');
    return (await import('./place.ts')).travel(args.destination);
  },
  mount(parent, ctx) {
    islandPicker(parent);
    parent.append(el('h3', 'Disposable player travel'));
    const label = el('label', 'Destination', 'dev-field');
    const picker = el('select');
    picker.dataset.devDestination = '';
    for (const id of DESTINATIONS) {
      const option = el('option', labels[id]);
      option.value = id;
      picker.append(option);
    }
    label.append(picker);
    parent.append(label);
    const blocked = fixtureReason();
    note(parent, blocked ?? 'Only your disposable TEST body moves; no progression skip.');
    const actions = el('div', '', 'dev-actions');
    parent.append(actions);
    const args = () => ({ destination: picker.value });
    command(actions, ctx, 'destinations', 'Start test', 'start', args);
    command(actions, ctx, 'destinations', 'Go', 'go', args).disabled = !!blocked;
    command(actions, ctx, 'destinations', 'Return', 'return').disabled = !!blocked;
    return () => {};
  },
};
