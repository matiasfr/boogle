// A device run's identity (docs/plans/remote-device-tests.md): the run id is the upload token, a playdata session id
// `dv-` plus 26 characters of [a-z0-9] from the platform's CSPRNG (about 134 bits). Pure, shared with the CLI
// (dev/device/): no DOM, no game imports. Local, debug only.

export const RUN_ID_RE = /^dv-[a-z0-9]{26}$/;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const BODY = 26;

/** A fresh run id. `random` is a test seam; it must fill the array with random bytes. */
export function makeRunId(
  random: (bytes: Uint8Array<ArrayBuffer>) => void = (b) => void crypto.getRandomValues(b),
): string {
  let out = 'dv-';
  const bytes = new Uint8Array(64);
  while (out.length < 3 + BODY) {
    random(bytes);
    for (const b of bytes) {
      if (b >= 252) continue; // 252 = 7 x 36: no modulo bias
      out += ALPHABET[b % 36];
      if (out.length === 3 + BODY) break;
    }
  }
  return out;
}

/** What a person says to an agent: the id's last six characters. */
export const shortCode = (id: string) => id.slice(-6);

/** The owner's own text cut to 40 characters of [a-z0-9-]; '' when nothing is left. */
export function cleanLabel(raw: string | null | undefined): string {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
}

export const SUITE_NAMES = ['quick'] as const;
export type SuiteName = (typeof SUITE_NAMES)[number];

/** What the address asks for: nothing, a fresh run (`device=new`), a run with its id, or a damaged link. */
export type DeviceLink =
  | { kind: 'none' }
  | { kind: 'new'; suite: SuiteName; label: string }
  | { kind: 'run'; id: string; suite: SuiteName; label: string; self: boolean }
  | { kind: 'damaged' };

export function parseDeviceLink(search: string): DeviceLink {
  const q = new URLSearchParams(search);
  const device = q.get('device');
  if (device === null) return { kind: 'none' };
  const suiteWant = q.get('suite') ?? 'quick';
  const suite = SUITE_NAMES.find((s) => s === suiteWant);
  if (!suite) return { kind: 'damaged' };
  const label = cleanLabel(q.get('label'));
  if (device === 'new') return { kind: 'new', suite, label };
  if (!RUN_ID_RE.test(device)) return { kind: 'damaged' };
  // `mint=page`: the page made this id itself (a `device=new` link), not `npm run device -- new`.
  return { kind: 'run', id: device, suite, label, self: q.get('mint') === 'page' };
}
