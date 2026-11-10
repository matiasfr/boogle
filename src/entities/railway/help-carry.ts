// "Help carry" for one big load (docs/plans/boiler-first-choice.md, Part 3), shared by the boiler, the great beam and
// the footings as one Owner value. A helper's tab claims the holder's pid under a presence field; every tab lifts the
// load between the two shoulders while the claim is fresh and the helper's back is empty. It never claims the load
// itself: the holder's row stays the server's. The caller registers the presence key (a literal, so the registry sees
// it) with `presence` and feeds `hear`.
//
// Reach is measured from the helper to the load's grip (where the helper holds it, from the holder's pose), not to the
// holder: a claim starts within 5 m of the grip and holds out to 8 m, with 3 m of height for decks and bridges, and the
// helper is eased toward the grip so they follow without steering (docs/plans/works-late-game.md, step 4).

/** Anything with a world position: an avatar or a grip point. */
export type HelpPoint = { x: number; y: number; z: number };
export type HelpBody = { position: HelpPoint };
export type HelpCarry = ReturnType<typeof createHelpCarry>;

/** A remote's claim goes stale after this many milliseconds without a fresh presence value. */
export const HELP_STALE_MS = 1500;
/** Metres (flat) from the grip within which Help carry is offered and a claim starts. */
export const HELP_START_M = 5;
/** Metres (flat) from the grip out to which a claim holds once started. */
export const HELP_KEEP_M = 8;
/** Metres of height between the helper and the grip, either way. */
export const HELP_RISE_M = 3;
/** Within this flat distance of the grip the helper is not eased. */
const EASE_SLACK_M = 0.7;
/** The distance past the slack at which the ease reaches its full pull. */
const EASE_RAMP_M = 2.5;
/** Presence values longer than this are refused (a pid is at most 64 characters). */
const MAX_PID = 64;

/** Is `body` within `radius` metres flat and HELP_RISE_M of height of `grip`? */
export const helpReach = (body: HelpBody, grip: HelpPoint, radius: number) =>
  Math.hypot(body.position.x - grip.x, body.position.z - grip.z) <= radius &&
  Math.abs(body.position.y - grip.y) <= HELP_RISE_M;

/**
 * The ease toward the grip, added to a move wish (unit-ish, world x/z) in place and clamped to length 1: nothing
 * within the slack, then a pull that grows with the distance, so a helper who stops steering keeps up.
 */
export function easeToward(wish: { x: number; z: number }, from: HelpPoint, grip: HelpPoint) {
  const dx = grip.x - from.x,
    dz = grip.z - from.z,
    d = Math.hypot(dx, dz);
  if (d <= EASE_SLACK_M) return wish;
  const pull = Math.min(1, (d - EASE_SLACK_M) / EASE_RAMP_M);
  wish.x += (dx / d) * pull;
  wish.z += (dz / d) * pull;
  const length = Math.hypot(wish.x, wish.z);
  if (length > 1) {
    wish.x /= length;
    wish.z /= length;
  }
  return wish;
}

export function createHelpCarry(o: {
  /** Is this pid carrying the load now (accepted state). */
  holds: (pid: string) => boolean;
  /** This pid's back and hands are empty (for your own pid, include what is in your hands). */
  free: (pid: string) => boolean;
  /** A player's avatar by pid, your own included; null when not in the world. */
  avatarOf: (pid: string) => HelpBody | null;
  /** Where a helper holds `holder`'s load, from the holder's pose only (never the helper's); null if unknown. */
  gripOf: (holder: string) => HelpPoint | null;
  /** Your own pid. */
  self: () => string;
  /** A remote peer's pid while they are in the world. */
  pidOf: (peer: string) => string | null;
  now: () => number;
}) {
  let helping: string | null = null,
    alive = true;
  const claims = new Map<string, { holder: string; at: number }>();
  const within = (body: HelpBody | null, holder: string, radius: number) => {
    const grip = body && o.gripOf(holder);
    return !!grip && helpReach(body, grip, radius);
  };
  function valid() {
    if (!alive || !helping || !o.holds(helping) || !o.free(o.self())) return false;
    return within(o.avatarOf(o.self()), helping, HELP_KEEP_M);
  }
  return {
    /** Whom you are helping, or null; a claim that stopped being valid is dropped. */
    helping() {
      if (!valid()) helping = null;
      return helping;
    },
    /** Can you start helping `holder`: they hold it, your back is empty and you stand within 5 m of the grip. */
    canStart: (holder: string) =>
      alive &&
      holder !== o.self() &&
      o.holds(holder) &&
      o.free(o.self()) &&
      within(o.avatarOf(o.self()), holder, HELP_START_M),
    start(holder: string) {
      helping = holder;
    },
    stop() {
      helping = null;
    },
    valid,
    /** Who lifts `holder`'s load: you, or a remote with a fresh claim, an empty back and in reach; else null. */
    helperOf(holder: string): HelpBody | null {
      if (!o.avatarOf(holder) || !o.holds(holder)) return null;
      if (helping === holder && valid()) return o.avatarOf(o.self());
      for (const [peer, claim] of claims) {
        const pid = o.pidOf(peer);
        if (!pid || o.now() - claim.at > HELP_STALE_MS) {
          claims.delete(peer);
          continue;
        }
        const body = o.avatarOf(pid);
        if (claim.holder === holder && pid !== holder && o.free(pid) && within(body, holder, HELP_KEEP_M)) return body;
      }
      return null;
    },
    /** While you help, ease your move wish toward the grip (call before physics); a no-op otherwise. */
    ease(wish: { x: number; z: number }) {
      if (!valid() || !helping) return;
      const body = o.avatarOf(o.self()),
        grip = o.gripOf(helping);
      if (body && grip) easeToward(wish, body.position, grip);
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
