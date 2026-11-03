// Money, as a comic score (owner: "money as a joke is a compelling concept"). You earn it from deliveries and it means almost
// nothing yet. The API a later system needs, like The Boogler's prices: `money()`, `earn(n, why)`, `spend(n, why)` (false if
// you can't afford it), `onMoney(fn)`. It lives in `job.score`, so it's saved and shared with everything else. Local.
import { job } from './job.ts';
import type { Goods } from './layout.ts';
import { PAY } from './layout.ts';

type Fn = (delta: number, why: string) => void;
const fns: Fn[] = [];
export const money = () => job.score.money;
export const onMoney = (fn: Fn) => void fns.push(fn);
export function earn(n: number, why = '') {
  job.score.money += n;
  for (const fn of fns) fn(n, why);
}
export function spend(n: number, why = '') {
  if (job.score.money < n) return false;
  job.score.money -= n;
  for (const fn of fns) fn(-n, why);
  return true;
}
/** A piece landed in a frame: the count and the money. */
export function delivered(kind: Goods) {
  if (kind !== 'beam') job.score[kind]++;
  earn(PAY[kind], kind);
}
/** "$1,250", the way the HUD writes it. */
export const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
