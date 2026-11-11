// Seat claims, pure: the lead's assignment of chairs to requests and a sitter's reading of the lead's answer.
// Host kind (src/entities/railway/seat.ts owns the fields); nothing here is saved or simulated.
export type SeatRequest = { id: string; ticket: number };
export type SeatGrant = { peer: string; ticket: number };
export type Grants = Record<string, SeatGrant>;
export type ClaimSeat = { id: string; group: string; available: () => boolean };

/** How long a sitter keeps an unanswered chair before stepping back off it (a lead that never answers). */
export const CLAIM_GRACE_MS = 2000;

/** The lead's pass. Incumbents keep their chair until they release or leave; never time a held seat out and
 * double-book it. Newcomers go in peer order: the wanted chair, else another free one of the same group. */
export function assignSeats(grants: Grants, requests: ReadonlyMap<string, SeatRequest>, seats: readonly ClaimSeat[]) {
  const find = (id: string | undefined) => (id === undefined ? undefined : seats.find((s) => s.id === id));
  const next: Grants = {};
  for (const [id, grant] of Object.entries(grants)) {
    const req = requests.get(grant.peer);
    const wanted = find(req?.id);
    const held = find(id);
    if (req?.ticket === grant.ticket && wanted && held && wanted.group === held.group && held.available())
      next[id] = grant;
  }
  for (const [peer, req] of [...requests].sort(([a], [b]) => a.localeCompare(b))) {
    if (Object.values(next).some((g) => g.peer === peer)) continue;
    const wanted = find(req.id);
    if (!wanted) continue;
    const s = [wanted, ...seats.filter((s) => s !== wanted && s.group === wanted.group)].find(
      (s) => s.available() && !next[s.id],
    );
    if (s) next[s.id] = { peer, ticket: req.ticket };
  }
  return next;
}

/** A follower's copy of the lead's grants: known chairs only, one chair per peer, malformed entries dropped. */
export function readGrants(value: unknown, known: (id: string) => boolean): Grants {
  const next: Grants = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return next;
  for (const [id, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== 'object') continue;
    const g = raw as Partial<SeatGrant>;
    if (
      known(id) &&
      typeof g.peer === 'string' &&
      g.peer.length <= 128 &&
      Number.isSafeInteger(g.ticket) &&
      g.ticket! > 0 &&
      !Object.values(next).some((v) => v.peer === g.peer)
    )
      next[id] = { peer: g.peer, ticket: g.ticket! };
  }
  return next;
}

export type SeatVerdict =
  | { kind: 'hold' } // keep sitting where you are (granted, or still waiting for the lead)
  | { kind: 'move'; id: string } // shift to this chair (the lead's grant, or the free neighbour of a taken one)
  | { kind: 'release' }; // step off onto the exit: the chair is someone else's, or the lead never answered

/** A sitter sits at once on the press (instant feedback) and then follows the lead's grants. */
export function seatVerdict(o: {
  grants: Grants;
  peer: string;
  ticket: number;
  sitting: string;
  seats: readonly ClaimSeat[];
  waitedMs: number;
}): SeatVerdict {
  const mine = Object.keys(o.grants).find((id) => o.grants[id]!.peer === o.peer && o.grants[id]!.ticket === o.ticket);
  if (mine !== undefined) return mine === o.sitting ? { kind: 'hold' } : { kind: 'move', id: mine };
  const here = o.seats.find((s) => s.id === o.sitting);
  const other = o.grants[o.sitting];
  if (other && other.peer !== o.peer) {
    // Lost the race for this chair: slide over to a free neighbour while the lead catches up, else get off.
    const free =
      here && o.seats.find((s) => s.group === here.group && s.id !== here.id && s.available() && !o.grants[s.id]);
    return free ? { kind: 'move', id: free.id } : { kind: 'release' };
  }
  return o.waitedMs > CLAIM_GRACE_MS ? { kind: 'release' } : { kind: 'hold' };
}
