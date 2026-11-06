import { validValue } from '../tunables/spec.ts';

// Owner-written cosmetic configuration. Physics and rewards never read these values.
export const FEEL_SPRING_SPEC = {
  id: 'feel.spring.stiffness',
  type: 'number',
  scope: 'owner',
  default: 298,
  min: 50,
  max: 600,
  integer: false,
  units: '1/s²',
  at: 'next-action',
  owner: 'src/features/feel.ts',
  label: 'Body squash spring stiffness',
  description:
    'Landing and takeoff rebound stiffness; captured on the next action. A running chop retains its profile.',
} as const;

export type FeelAction = 'idle' | 'landing' | 'takeoff' | 'chop';
export type FeelProfile = { value: number; revision: number; action: FeelAction };
let value: number = FEEL_SPRING_SPEC.default;
let revision = 0;
let active: FeelProfile = { value, revision, action: 'idle' };
let presence = [value, revision, 'idle'] as readonly [number, number, FeelAction];
let chopLocked = false;
const listeners = new Set<(event: 'change' | 'action', snapshot: ReturnType<typeof snapshotFeelSpring>) => void>();

const validFeelSpring = (next: unknown): next is number => validValue(FEEL_SPRING_SPEC, next);
export const activeFeelSpring = () => active.value;
export function snapshotFeelSpring() {
  return { value, revision, active: { ...active }, chopLocked };
}
function notify(event: 'change' | 'action') {
  if (listeners.size) {
    const snapshot = snapshotFeelSpring();
    for (const listener of listeners) listener(event, snapshot);
  }
}
export function onFeelSpringChange(
  listener: (event: 'change' | 'action', snapshot: ReturnType<typeof snapshotFeelSpring>) => void,
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function setFeelSpring(next: unknown, expectedRevision?: number) {
  if (!validFeelSpring(next)) return { ok: false, status: 'rejected' as const, code: 'invalid-value', revision };
  if (expectedRevision !== undefined && expectedRevision !== revision)
    return { ok: false, status: 'rejected' as const, code: 'stale-revision', revision };
  value = next;
  revision++;
  notify('change');
  return { ok: true, status: 'applied' as const, ...snapshotFeelSpring() };
}
/** Only the owning action calls this; a landing during a chop cannot replace its captured profile. */
export function beginFeelAction(action: Exclude<FeelAction, 'idle'>) {
  if (chopLocked && action !== 'chop') return;
  active = { value, revision, action };
  presence = [value, revision, action];
  chopLocked = action === 'chop';
  notify('action');
}
export function endFeelChop() {
  if (!chopLocked) return;
  chopLocked = false;
  notify('action');
}
/** Latest active profile is included in Owner presence, including for a late joiner. */
export const feelSpringPresence = () => presence;
export function readFeelSpringPresence(input: unknown, previous?: FeelProfile): FeelProfile | null {
  if (!Array.isArray(input) || input.length !== 3) return null;
  const [value, revision, action] = input;
  if (!validFeelSpring(value) || !Number.isSafeInteger(revision) || revision < 0) return null;
  if (action !== 'idle' && action !== 'landing' && action !== 'takeoff' && action !== 'chop') return null;
  if (previous?.value === value && previous.revision === revision && previous.action === action) return previous;
  return { value, revision, action };
}
