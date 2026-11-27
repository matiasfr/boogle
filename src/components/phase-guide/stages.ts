// Pure stage queries and marked placeholder lines for Wave 1 station guides (docs/brainstorms/phase-guides.md).
// Reads accepted server rows (`ReadWorld`) only; no three.js, DOM or sim writes. Every new character line is a marked
// placeholder for the owner (decision d-2026-11-11-the-story-and-characters-are-the-owner-s); Hooter keeps his existing
// lines from src/entities/ring-folk/lines.ts alongside placeholder stage lines.
import { LINE2, RAIL_LINES } from '../../sim/railway-lines.ts';
import { legDone, tradeOpen } from '../../sim/railway-queries-route.ts';
import { RAIL_LEGS } from '../../sim/railway-route.ts';
import { aperture, line, shed, steel, works, type ReadWorld } from '../../sim/railway-rows.ts';
import { SEAM_THROAT } from '../../sim/railway-works.ts';
import { WORKS } from '../../sim/railway-works-layout.ts';
import { HOOTER } from '../../entities/ring-folk/lines.ts';

const STACK_LEG = RAIL_LEGS.findIndex((l) => l.id === 'stack');

export type GuideLines = {
  /** Lines cycled on Talk. */
  talk: readonly string[];
  /** Optional one-line approach bark (10 m, once per stage per page). */
  bark?: string;
  /** True when the guide's phase is finished or not yet active: no `…`, wave or bark, one idle remark on Talk. */
  idle?: boolean;
};

// ---------------------------------------------------------------- Quarry halt: the kiln hand
export type KilnHandStage = 'idle' | 'throat' | 'kiln' | 'footings' | 'pier';

/** Which stage the Quarry halt's kiln hand is in, from accepted state. */
export function kilnHandStage(w: ReadWorld): KilnHandStage {
  const wk = works(w);
  if (wk.breaker < 2) return 'idle';
  if (!(wk.seams & SEAM_THROAT)) return 'throat';
  if (wk.lit < 0) return 'kiln';
  if (shed(w).stall < WORKS.stall) return 'footings';
  if (wk.pierSet < WORKS.pier) return 'pier';
  return 'idle';
}

export const KILN_HAND_LINES: Record<KilnHandStage, GuideLines> = {
  throat: {
    bark: "[placeholder — owner's line: the throat seam up the cut needs the breaker]",
    talk: [
      "[placeholder — owner's line: follow the roller road up the cut and strike the throat seam with the breaker]",
      "[placeholder — owner's line: local kiln-hand quirk about the quarry rock]",
    ],
  },
  kiln: {
    bark: "[placeholder — owner's line: the kiln needs logs from Home and stone from the bowl]",
    talk: [
      "[placeholder — owner's line: the kiln wants Home logs and stone mined from the bowl up the cut]",
      "[placeholder — owner's line: co-op tip — one can haul logs from Home while another mines the bowl]",
    ],
  },
  footings: {
    bark: "[placeholder — owner's line: shoulder footings off the rack back to Home's Roundhouse]",
    talk: [
      "[placeholder — owner's line: footings roll down to the rack — shoulder two home to build the Roundhouse stall]",
      "[placeholder — owner's line: local kiln-hand quirk about the heavy concrete footings]",
    ],
  },
  pier: {
    talk: [
      "[placeholder — owner's line: once the Roundhouse wagon is rolling, it hauls footings out to the pier]",
      "[placeholder — owner's line: local kiln-hand remark about keeping the kiln firing]",
    ],
  },
  idle: {
    idle: true,
    talk: ["[placeholder — owner's line: relaxed idle remark from the kiln hand at Quarry halt]"],
  },
};

// ---------------------------------------------------------------- Home Roundhouse: the roundhouse hand
export type RoundhouseHandStage = 'idle' | 'stall' | 'cradle' | 'turn' | 'steel' | 'trade';

/** Whether any trade line is open for its Quick/Strong boiler trade at the Roundhouse. */
function anyTradeUnfitted(w: ReadWorld): boolean {
  for (let i = 0; i < RAIL_LINES.length; i++) {
    if (i === LINE2) continue;
    if (tradeOpen(w, i) && line(w, i).rev === 0) return true;
  }
  return false;
}

/** Which stage Home's roundhouse hand is in, from accepted state. */
export function roundhouseHandStage(w: ReadWorld): RoundhouseHandStage {
  const wk = works(w);
  const sh = shed(w);
  if (wk.lit >= 0 && sh.stall < WORKS.stall) return 'stall';
  if (sh.stall >= WORKS.stall && sh.cradleRails < WORKS.cradleRails) return 'cradle';
  if (sh.fitted >= 0 && sh.ready < 0) return 'turn';
  if (sh.steel > 0 && line(w, LINE2).boiler < 2) return 'steel';
  if (sh.steel > sh.spent && anyTradeUnfitted(w)) return 'trade';
  return 'idle';
}

export const ROUNDHOUSE_HAND_LINES: Record<RoundhouseHandStage, GuideLines> = {
  stall: {
    bark: "[placeholder — owner's line: bring two footings from the Quarry halt for the stall]",
    talk: [
      "[placeholder — owner's line: shoulder two footings from the Quarry halt rack into the Roundhouse stall sockets]",
      "[placeholder — owner's line: local roundhouse-hand quirk about waking the old stall]",
    ],
  },
  cradle: {
    bark: "[placeholder — owner's line: the wagon cradle needs rails from the forge rack]",
    talk: [
      "[placeholder — owner's line: bring rails from the forge rack to fit the wagon's cradle in the stall]",
      "[placeholder — owner's line: co-op tip — two pairs of hands fill the eight cradle rails fast]",
    ],
  },
  turn: {
    bark: "[placeholder — owner's line: turn the turntable and use the garage post to send the wagon out]",
    talk: [
      "[placeholder — owner's line: turn the turntable bridge and install the upgrade at the garage post to roll the wagon onto line 2]",
      "[placeholder — owner's line: local roundhouse-hand remark about the turntable]",
    ],
  },
  steel: {
    bark: "[placeholder — owner's line: steel is in the bay — install the longer boiler at the garage post]",
    talk: [
      "[placeholder — owner's line: Ring Island's steel is in the bay — open the garage post and install the longer boiler on line 2]",
      "[placeholder — owner's line: local roundhouse-hand remark about the longer boiler's speed]",
    ],
  },
  trade: {
    talk: [
      "[placeholder — owner's line: bring a trade line onto the table at the garage post to pick Quick or Strong]",
      "[placeholder — owner's line: local roundhouse-hand quirk about tuning the trade engines]",
    ],
  },
  idle: {
    idle: true,
    talk: ["[placeholder — owner's line: relaxed idle remark from the roundhouse hand at Home's Roundhouse]"],
  },
};

// ---------------------------------------------------------------- Ring Island: Hooter (upgraded)
export type HooterStage = 'meet' | 'steel-feed' | 'steel-home' | 'high-gorge' | 'idle';

/** Which stage Hooter at Ring Island is in, from accepted state. */
export function hooterStage(w: ReadWorld): HooterStage {
  if (aperture(w).joined < 0) return 'meet';
  const st = steel(w);
  if (st.lit < 0) return 'steel-feed';
  if (line(w, LINE2).boiler < 2) return 'steel-home';
  if (!legDone(w, STACK_LEG)) return 'high-gorge';
  return 'idle';
}

export const HOOTER_STAGE_LINES: Record<HooterStage, GuideLines> = {
  meet: {
    talk: [
      "[placeholder — owner's line: Hooter on the Meet — finish the crossing and strike the rivet to join the ring]",
      HOOTER[0],
    ],
  },
  'steel-feed': {
    talk: [
      "[placeholder — owner's line: Hooter on the steel works — carry the kit from the yard into the shed to light it]",
      HOOTER[1],
    ],
  },
  'steel-home': {
    talk: [
      "[placeholder — owner's line: Hooter on the steel ride — line 2 carries the steel Home to the Roundhouse for the longer boiler]",
      HOOTER[2],
    ],
  },
  'high-gorge': {
    talk: [
      "[placeholder — owner's line: Hooter on High Gorge — start the High Gorge line from the frame on the west platform]",
      HOOTER[0],
    ],
  },
  idle: {
    idle: true,
    talk: HOOTER,
  },
};
