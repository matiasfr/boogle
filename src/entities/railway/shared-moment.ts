// Shared moments (decisions.md, 10 November, "shared moments play for everyone"): a world reveal plays on every page in
// the room from its accepted edge, not only for whoever pulled or struck. The railway adapter's onAccepted is that edge:
// the actor's own action at once from the prediction (a refusal takes the shot back, onCorrected), everyone else's as
// the server confirms it, and never from a restore, a rejoin or a late join (a rebuilt packet replays no events). The
// decision is silent on distance, so a player anywhere in the room gets it. Item cards stay with the finder; the others
// get ability-arrival.ts's flourish. Each moment's views own their shot (createCameraPullOut, which no input ends but
// the one highlighted skip) and banner; this only decides who plays and leaves a playtest mark of who saw what.
import type { RailwayAccepted } from '../../adapters/railway.ts';
import { playMark } from '../../proto/mark.ts';

export type SharedMoment = 'quarry gate' | 'sea gate' | 'works throat' | 'glider' | 'the meet';

/** Plays `moment` on this page for an accepted `event`: `show(mine)` starts what this page sees (the shot, the banner,
 * the finder's card) and returns whether a camera shot was queued (reduced motion and a seated player get none). */
export function playSharedMoment(
  moment: SharedMoment,
  event: RailwayAccepted,
  self: string,
  show: (mine: boolean) => boolean,
) {
  const mine = event.pid === self;
  const shot = show(mine);
  playMark('moment played', { moment, mine, shot, authority: 'local', edge: event.predicted ? 'predicted' : 'server' });
}
