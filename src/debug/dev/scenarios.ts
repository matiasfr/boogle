import {
  SCENARIOS,
  scenarioName,
  launch,
  fixtureReason,
  fixture,
  setup,
  VERSION,
  destinationName,
} from './fixtures.ts';
import { command, note, el, more, button } from './ui.ts';
import { no, ok, type Tool } from './types.ts';
import { productionRailway } from '../../proto/flags.ts';

export const tool: Tool = {
  id: 'scenarios',
  label: 'Test scenarios',
  scope: 'Each Start creates a new disposable solo place room. No grants or shared-room skips.',
  commands: ['start', 'apply', 'chop'],
  available: () => null,
  async run(command, args) {
    if (command === 'chop') {
      if (typeof args.twoHanded !== 'boolean') return no('twoHanded must be true or false.');
      const { chopPresentation } = await import('../../proto/place/chop-motion.ts');
      chopPresentation.twoHanded = args.twoHanded;
      return ok('Local chop preview updated.', { ...chopPresentation });
    }
    if (!scenarioName(args.scenario)) return no('Choose a named scenario.');
    if (command === 'start') return launch(args.scenario, args.destination ?? 'spawn');
    const why = fixtureReason();
    if (productionRailway || why)
      return no(why ?? 'Only an explicitly launched disposable solo place run can move or skip. Start a test below.');
    return (await import('./place.ts')).stage(args.scenario);
  },
  snapshot: fixture,
  async mount(parent, ctx) {
    const { chopPresentation } = await import('../../proto/place/chop-motion.ts');
    const chopLabel = el('label', ' Two-handed chop (retuning trial)');
    const chop = el('input');
    chop.type = 'checkbox';
    chop.checked = chopPresentation.twoHanded;
    chop.onchange = () => void ctx.run('scenarios', 'chop', { twoHanded: chop.checked });
    chopLabel.prepend(chop);
    parent.append(chopLabel);
    note(parent, 'Start creates a new disposable solo room. Current saves stay intact.');
    const picker = el('select');
    picker.setAttribute('aria-label', 'Test scenario');
    for (const scenario of SCENARIOS) {
      const option = el('option', scenario === 'walk' ? 'Fresh walking · no skip' : scenario);
      option.value = scenario;
      picker.append(option);
    }
    parent.append(picker);
    command(parent, ctx, 'scenarios', 'Start test', 'start', () => ({ scenario: picker.value }));
    const proposed = setup();
    if (proposed) {
      note(parent, `${proposed.warning} Proposed: ${proposed.scenario} / ${proposed.destination}.`);
      const start = button('Start proposed setup', () => launch(proposed.scenario, proposed.destination));
      start.disabled =
        proposed.version !== VERSION || !scenarioName(proposed.scenario) || !destinationName(proposed.destination);
      parent.append(start);
    }
    note(
      more(parent),
      'Stage fixtures use existing place setup handlers. They are test evidence, not pacing evidence. Shared-room grants and skips remain unavailable.',
    );
    return () => {};
  },
};
