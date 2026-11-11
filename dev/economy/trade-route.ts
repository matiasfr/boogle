// The route's spine for the trade model: the ring model's steps and their minutes, one column a party size. The trade
// model never changes a step's play; it only adds hauling for seats and takes labour off with source upgrades.
import { simulate } from './ring-sim.ts';

export type SpineStep = {
  key: string;
  name: string;
  /** Minutes the step takes if nothing is bought: [solo, two players, three players]. */
  fixedMin: number[];
  /** Of those, the labour and waiting that source upgrades can shorten. */
  labourMin: number[];
};
export type RouteSpine = { players: number[]; steps: SpineStep[] };

export function routeSpine(players = [1, 2, 3]): RouteSpine {
  const res = simulate({}, players);
  const steps = res.steps.map((s) => {
    const labour = s.pace.map((p) => p.labour + p.wait * 60);
    const total = s.pace.map((p) => p.dur * 60);
    return {
      key: s.key,
      name: s.name,
      fixedMin: total.map((m, i) => m - labour[i]!),
      labourMin: labour,
    };
  });
  return { players, steps };
}
