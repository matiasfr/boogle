// "Help carry" for one big load (docs/plans/boiler-first-choice.md, Part 3): the pattern line-cargo.ts and
// footing-view.ts each wrote by hand, as one Owner value. A helper's tab claims the holder's pid under a presence
// field; every tab lifts the load between the two shoulders while the claim is fresh, the helper's back is empty and the
// two stand within 5 m flat and 2 m of height. It never claims the load itself: the holder's row stays the server's.
// The caller registers the presence key (a literal, so the registry sees it) with `presence` and feeds `hear`.

/** Anything with a world position: an avatar. */
export type HelpBody = { position: { x: number; y: number; z: number } };
export type HelpCarry = ReturnType<typeof createHelpCarry>;

/** A remote's claim goes stale after this many milliseconds without a fresh presence value. */
export const HELP_STALE_MS = 1500;
/** Presence values longer than this are refused (a pid is at most 64 characters). */
const MAX_PID = 64;

export const helpNear = (a: HelpBody, b: HelpBody) =>
  Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) <= 5 &&
  Math.abs(a.position.y - b.position.y) <= 2;

export function createHelpCarry(o: {
  /** Is this pid carrying the load now (accepted state). */
  holds: (pid: string) => boolean;
  /** This pid's back and hands are empty (for your own pid, include what is in your hands). */
  free: (pid: string) => boolean;
  /** A player's avatar by pid, your own included; null when not in the world. */
  avatarOf: (pid: string) => HelpBody | null;
  /** Your own pid. */
  self: () => string;
  /** A remote peer's pid while they are in the world. */
  pidOf: (peer: string) => string | null;
  now: () => number;
}) {
  let helping: string | null = null,
    alive = true;
  const claims = new Map<string, { holder: string; at: number }>();
  function valid() {
    if (!alive || !helping || !o.holds(helping) || !o.free(o.self())) return false;
    const a = o.avatarOf(o.self()),
      b = o.avatarOf(helping);
    return !!a && !!b && helpNear(a, b);
  }
  return {
    /** Whom you are helping, or null; a claim that stopped being valid is dropped. */
    helping() {
      if (!valid()) helping = null;
      return helping;
    },
    start(holder: string) {
      helping = holder;
    },
    stop() {
      helping = null;
    },
    valid,
    /** Who lifts `holder`'s load: you, or a remote with a fresh claim, an empty back and in reach; else null. */
    helperOf(holder: string): HelpBody | null {
      const carrier = o.avatarOf(holder);
      if (!carrier || !o.holds(holder)) return null;
      if (helping === holder && valid()) return o.avatarOf(o.self());
      for (const [peer, claim] of claims) {
        const pid = o.pidOf(peer);
        if (!pid || o.now() - claim.at > HELP_STALE_MS) {
          claims.delete(peer);
          continue;
        }
        const body = o.avatarOf(pid);
        if (claim.holder === holder && pid !== holder && body && o.free(pid) && helpNear(carrier, body)) return body;
      }
      return null;
    },
    /** The presence value: the holder's pid while helping, else null (the key is then left out). */
    presence: () => (valid() ? helping : null),
    /** A remote's presence value for the field. */
    hear(peer: string, value: unknown) {
      if (typeof value === 'string' && value.length > 0 && value.length <= MAX_PID)
        claims.set(peer, { holder: value, at: o.now() });
      else claims.delete(peer);
    },
    dispose() {
      alive = false;
      helping = null;
      claims.clear();
    },
  };
}
