// Local presentation of the one boot timeline. Deadlines release entry; they never finish work.
import type { BootMark } from './timeline.ts';

export function loadStatus(marks: readonly BootMark[]) {
  const has = (name: string) => marks.some((m) => m.name === name);
  const failed = has('failed');
  const group = (name: string, start: string, done: boolean, problem = '') => ({
    name,
    state: done ? 'Done' : problem || (has(start) ? (failed ? 'Stopped' : 'Preparing') : 'Waiting'),
  });
  return [
    group('Game files', 'files-start', has('modules'), failed && !has('modules') ? 'Failed' : ''),
    group(
      'Your character',
      'buddy-wait',
      has('buddy-ready') || has('buddy-skipped'),
      has('buddy-ready') ? '' : has('buddy-failed') ? 'Failed' : has('buddy-deadline') ? 'Still preparing' : '',
    ),
    group('World', 'world-start', has('props') && has('rapier'), has('world-failed') ? 'Failed' : ''),
    group('Graphics', 'graphics-start', has('warmup-complete') && has('first'), has('graphics-failed') ? 'Failed' : ''),
    group('Room connection', 'room-start', has('room')),
  ];
}
