// One fall into the water, one recovery, for the play data's "fell in water" and "recovered" marks (./record.ts).
// The physics swim flag is not a fall: floating, the body bobs across its swim threshold about twice a second
// (src/entities/player/state.ts: the buoyancy's rest point is the threshold itself), and every swim jump leaves it, so
// session mw9prlct logged nine falls and recoveries in 3.5 s for one fall off the bank at (1000, 28). A swim starts on
// the first swimming frame and ends only once you have stood on ground out of the water for RECOVER_S without a break.
// Pure: the recorder passes the frame's flags and its clock. Sync kind: Local.
export const RECOVER_S = 0.5; // s on your feet: a wading bob that touches the bed between swims is not getting out

export type WaterEpisode = { since: number; standingSince: number }; // ms; -1 when not in the water / not standing
export const waterEpisode = (): WaterEpisode => ({ since: -1, standingSince: -1 });

export type WaterEdge = { kind: 'fell' } | { kind: 'recovered'; at: number; seconds: number } | null;

/** Advances `e` by one frame. `standing`: on ground (a floor contact) and not swimming. */
export function stepWaterEpisode(e: WaterEpisode, swimming: boolean, standing: boolean, ms: number): WaterEdge {
  if (e.since < 0) {
    if (!swimming) return null;
    e.since = ms;
    e.standingSince = -1;
    return { kind: 'fell' };
  }
  if (swimming || !standing) {
    e.standingSince = -1;
    return null;
  }
  if (e.standingSince < 0) e.standingSince = ms;
  if (ms - e.standingSince < RECOVER_S * 1000) return null;
  const edge = { kind: 'recovered', at: e.standingSince, seconds: (e.standingSince - e.since) / 1000 } as const;
  e.since = e.standingSince = -1;
  return edge;
}
