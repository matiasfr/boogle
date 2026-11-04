// Accidental-collision isolation, not server authorization. Every prototype mutation rechecks this predicate.
import { getRoomId, net, remotes } from '../../netplay/net.ts';
import { me } from '../../player/state.ts';
import { BUILD } from '../../build-id.ts';
import { protoMark } from '../../proto/mark.ts';
import { no, ok, type Result } from './types.ts';

export const VERSION = '1';
const KEY = 'boogle.dev.launch.v1';
export const SCENARIOS = ['fresh', 'walk', 'path', 'line2', 'tower', 'head', 'trains'] as const;
export type Scenario = (typeof SCENARIOS)[number];
export const DESTINATIONS = ['spawn', 'shore', 'shallow', 'deep', 'plunge', 'tower', 'head', 'forge', 'frame'] as const;
export type Destination = (typeof DESTINATIONS)[number];
let appliedScenario: Scenario | null = null;
export const noteScenario = (scenario: Scenario) => {
  appliedScenario = scenario;
};
const q = () => new URLSearchParams(location.search);
export const scenarioName = (value: unknown): value is Scenario => SCENARIOS.some((id) => id === value);
export const destinationName = (value: unknown): value is Destination => DESTINATIONS.some((id) => id === value);
export function fixture() {
  const params = q();
  let launched = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { id?: string; room?: string } | null;
    launched = !!saved && saved.id === params.get('test') && saved.room === getRoomId();
  } catch {
    /* storage unavailable: refuse mutation */
  }
  return {
    id: params.get('test'),
    version: params.get('fixture'),
    room: getRoomId(),
    launched,
    scenario: appliedScenario ?? params.get('scenario') ?? 'fresh',
    destination: params.get('destination') ?? 'spawn',
  };
}
export function fixtureReason() {
  const params = q(),
    run = fixture();
  if (
    params.get('dev') !== '1' ||
    params.get('proto') !== 'place' ||
    params.get('coop') !== '0' ||
    params.get('fresh') !== '1'
  )
    return 'Only an explicitly launched disposable solo place run can move or skip. Start a test below.';
  if (run.version !== VERSION || !run.launched || !run.id)
    return 'This room has no matching disposable launch record. Start a new test.';
  if (remotes.size || net.room?.peers().some((peer) => !peer.sameTab))
    return 'Refused: another peer joined. Shared-room skips and movement cheats are disabled.';
  if (!me.entered || !me.body || !window.__place) return 'Wait until the test player and place are ready.';
  return null;
}
export function intervention(action: string) {
  protoMark(`dev:${action}`);
}
export function launch(scenario: unknown = 'fresh', destination: unknown = 'spawn'): Result {
  if (!scenarioName(scenario) || !destinationName(destination)) return no('Unknown scenario or destination.');
  const id = crypto.randomUUID(),
    room = `dev-${id.replaceAll('-', '').slice(0, 24)}`;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ id, room }));
  } catch {
    return no('Browser session storage is unavailable; cannot isolate this test.');
  }
  const url = new URL(location.pathname, location.origin);
  const current = q();
  for (const key of ['water', 'tune', 'dpr', 'prof', 'startup', 'record']) {
    const value = current.get(key);
    if (value && ((key === 'water' && value === 'new') || (key === 'dpr' && value === 'fixed') || value === '1'))
      url.searchParams.set(key, value);
  }
  for (const [key, value] of Object.entries({
    dev: '1',
    proto: 'place',
    coop: '0',
    fresh: '1',
    fixture: VERSION,
    test: id,
    room,
    scenario,
    destination,
  }))
    url.searchParams.set(key, value);
  intervention(`launch:${scenario}`);
  location.assign(url.href);
  return ok('Starting a fresh disposable run.', { url: url.href, room });
}
export function setupLink(destination: string = 'spawn') {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('dev', '1');
  url.searchParams.set('setup', VERSION);
  url.searchParams.set('build', BUILD);
  url.searchParams.set('scenario', scenarioName(fixture().scenario) ? fixture().scenario : 'fresh');
  url.searchParams.set('destination', destinationName(destination) ? destination : 'spawn');
  if (q().get('water') === 'new') url.searchParams.set('water', 'new');
  if (q().get('tune') === '1') url.searchParams.set('tune', '1');
  return url.href;
}
export function setup() {
  const params = q();
  if (!params.has('setup')) return null;
  return {
    version: params.get('setup'),
    scenario: params.get('scenario') ?? 'fresh',
    destination: params.get('destination') ?? 'spawn',
    warning:
      params.get('build') && params.get('build') !== BUILD
        ? 'Build differs: this is a setup, not exact world replay.'
        : 'Setup only: your joined room will not be reset.',
  };
}
