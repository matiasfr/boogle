import { SCENARIOS, scenarioName, launch, fixtureReason, fixture } from './fixtures.ts';
import { command, note } from './ui.ts';
import { no, type Tool } from './types.ts';

export const tool: Tool = {
  id: 'scenarios',
  label: 'Test scenarios',
  scope: 'Each Start creates a new disposable solo place room. No grants or shared-room skips.',
  commands: ['start', 'apply'],
  available: () => null,
  async run(command, args) {
    if (!scenarioName(args.scenario)) return no('Choose a named scenario.');
    if (command === 'start') return launch(args.scenario, args.destination ?? 'spawn');
    const why = fixtureReason();
    if (why) return no(why);
    return (await import('./place.ts')).stage(args.scenario);
  },
  snapshot: fixture,
  mount(parent, ctx) {
    note(
      parent,
      'Stage fixtures use the existing place setup handlers. They are test evidence, not pacing evidence. Your current room and saves stay intact.',
    );
    for (const scenario of SCENARIOS)
      command(
        parent,
        ctx,
        'scenarios',
        scenario === 'walk' ? 'Start fresh walking test (no stage skip)' : `Start ${scenario} test`,
        'start',
        { scenario },
      );
    return () => {};
  },
};
