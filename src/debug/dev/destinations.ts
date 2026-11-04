import { PROTO } from '../../proto/flags.ts';
import { DESTINATIONS, destinationName, fixtureReason, launch } from './fixtures.ts';
import { command, note } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

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
  available: fixtureReason,
  async run(command, args) {
    if (command === 'list')
      return ok(
        'Named destinations.',
        DESTINATIONS.map((id) => ({ id, label: labels[id] })),
      );
    if (command === 'start') return launch('fresh', args.destination ?? 'spawn');
    const why = fixtureReason();
    if (why) return no(why);
    if (command === 'return') return (await import('./place.ts')).travel('return');
    if (!destinationName(args.destination)) return no('Choose a named destination.');
    return (await import('./place.ts')).travel(args.destination);
  },
  mount(parent, ctx) {
    if (PROTO !== 'place')
      note(
        parent,
        'Home-island positions are camera bookmarks. Player Go to starts a place test because v1 fixtures are solo place rooms.',
      );
    const blocked = fixtureReason();
    for (const id of DESTINATIONS)
      command(
        parent,
        ctx,
        'destinations',
        `${blocked ? 'Start test at' : 'Go to'} ${labels[id]}`,
        blocked ? 'start' : 'go',
        { destination: id },
      );
    command(parent, ctx, 'destinations', 'Return', 'return');
    return () => {};
  },
};
