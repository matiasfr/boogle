// The railway's row readers (docs/plans/ecs-migration-railway.md, section 2, "Queries", and M3c): one per component
// kind, each the stored row typed read-only, with no copy and no merged shape. They are what a seed, a test or a view
// reads where it read `s.line2.forge.lit` off the `Railway` read model. A system replaces a row it writes, so read
// again after a rule or a tick: never hold a row across one. A catalog slot or singleton that is missing throws.
//
//   singletons     rail, railClock, beam, forge, forgeClock, cart, boiler, works, worksClock, shed
//   by slot        job, jobRun, qjob, qjobRun, tree, hardwood, rock, train, line (and the lists below)
//   by key or id   account(w, pid) (undefined when absent), pile(w, id), outcomes(w), piles(w), accounts(w)
import type { AnyComponent, RowOf, World } from '../ecs/index.ts';
import { RAILWAY_SOURCES } from './railway-layout.ts';
import { LINE1_STATIONS } from './railway-line-layout.ts';
import { RAIL_ROCKS } from './railway-works-layout.ts';
import { LINE2_STATIONS } from './railway-line2-layout.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import {
  Account,
  Aperture,
  Beam,
  Boiler,
  Cart,
  Forge,
  ForgeClock,
  Hardwood,
  Job,
  JobRun,
  Line,
  Outcome,
  Pile,
  QJob,
  QJobRun,
  Rail,
  RailClock,
  Rock,
  Shed,
  Train,
  Tree,
  Works,
  WorksClock,
} from './railway-components.ts';

export type Read<C extends AnyComponent> = Readonly<RowOf<C>>;
/** A world a view may only read (the adapter's `read.world()`; review of M8, P3): the writers and the change drain are
 * typed `never`, so calling one is a type error, and `each` takes no `writes`. Still a `World` to the queries and row
 * readers, which never write. */
export type ReadWorld = Omit<World, Writer | 'each'> & { readonly [K in Writer]: never } & {
  each<const T extends readonly AnyComponent[], const W extends readonly AnyComponent[] = []>(
    cs: T,
    fn: (id: number, ...rows: { [K in keyof T]: T[K] extends W[number] ? RowOf<T[K]> : Readonly<RowOf<T[K]>> }) => void,
    writes?: never,
  ): void;
};
type Writer = 'mut' | 'spawn' | 'despawn' | 'add' | 'remove' | 'reserve' | 'run' | 'changes' | 'load';
const one =
  <C extends AnyComponent>(c: C) =>
  (w: World): Read<C> =>
    w.get(c, w.single(c))!;
/** The row of c on the entity whose `by` key is slot (c itself, or the keyed component it rides with). */
const slotted =
  <C extends AnyComponent>(c: C, by: AnyComponent = c) =>
  (w: World, slot: number): Read<C> => {
    const id = w.lookup(by, slot);
    const row = id === undefined ? undefined : w.get(c, id);
    if (!row) throw new Error(`railway: ${c.kind} ${slot} missing`);
    return row;
  };
const listed =
  <R>(read: (w: World, slot: number) => R, n: number) =>
  (w: World): R[] =>
    Array.from({ length: n }, (_v, slot) => read(w, slot));
const each =
  <C extends AnyComponent>(c: C) =>
  (w: World): Read<C>[] => {
    const out: Read<C>[] = [];
    w.each([c], (_id, row) => out.push(row as Read<C>));
    return out;
  };

export const rail = one(Rail);
export const railClock = one(RailClock);
export const beam = one(Beam);
export const forge = one(Forge);
export const forgeClock = one(ForgeClock);
export const cart = one(Cart);
export const boiler = one(Boiler);
export const works = one(Works);
export const worksClock = one(WorksClock);
export const shed = one(Shed);
/** Ring Island's gap (v27). */
export const aperture = one(Aperture);

export const job = slotted(Job);
export const jobRun = slotted(JobRun, Job);
export const qjob = slotted(QJob);
export const qjobRun = slotted(QJobRun, QJob);
export const tree = slotted(Tree);
export const hardwood = slotted(Hardwood);
export const rock = slotted(Rock);
export const train = slotted(Train);
export const line = slotted(Line);

export const jobs = listed(job, LINE1_STATIONS.length);
export const qjobs = listed(qjob, LINE2_STATIONS.length);
export const trees = listed(tree, RAILWAY_SOURCES.length);
export const hardwoods = listed(hardwood, 2);
export const rocks = listed(rock, RAIL_ROCKS.length);
export const trains = listed(train, RAIL_TRAINS.length);
export const lines = listed(line, RAIL_LINES.length);

export const account = (w: World, pid: string): Read<typeof Account> | undefined => {
  const id = w.lookup(Account, pid);
  return id === undefined ? undefined : w.get(Account, id);
};
export const pile = (w: World, id: number): Read<typeof Pile> | undefined => w.get(Pile, id);
/** Ascending id order, as the read model listed them. */
export const accounts = each(Account);
export const piles = each(Pile);
export const outcomes = each(Outcome);
