// The countdown everyone in a room sees before the server replaces it with a stage (docs/plans/room-fast-forward.md):
// pure state for src/features/room-replace.ts. The server's `replacing` notice starts it; it reads whole seconds down
// to 0, holds there while the room closes and the page reloads, and gives up if no new world arrives (the server
// cancelled: a failed close or a shutdown), so the notice never stays up over a room that was not replaced.
import { replacingText, type ReplacingNotice } from '../net/ws-wire.ts';

/** The countdown's sentence with its unit agreeing: the plan's text (src/net/ws-wire.ts) for 2 seconds and up,
 * "in 1 second" at one and "now" at zero. Only the wording here changes; the helper and the wire are as they were. */
export function countdownText(notice: ReplacingNotice): string {
  const text = replacingText(notice);
  if (notice.seconds > 1) return text;
  const plural = ` in ${notice.seconds} seconds. `;
  const at = text.lastIndexOf(plural); // the last one: a label could hold the same words
  if (at < 0) return text;
  return text.slice(0, at) + (notice.seconds === 1 ? ' in 1 second. ' : ' now. ') + text.slice(at + plural.length);
}

export type Countdown = { label: string; until: number };
/** How long past zero the notice waits for the reload before it concludes nothing was replaced. */
export const HOLD_MS = 8000;

export const startCountdown = (notice: ReplacingNotice, now: number): Countdown => ({
  label: notice.label,
  until: now + notice.seconds * 1000,
});
/** What to show at `now`: the notice with the whole seconds left, or null once the wait is over. */
export function countdownAt(c: Countdown, now: number): ReplacingNotice | null {
  if (now - c.until > HOLD_MS) return null;
  return { label: c.label, seconds: Math.max(0, Math.ceil((c.until - now) / 1000)) };
}
