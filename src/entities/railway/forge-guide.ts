// The forge crew's foreman (docs/brainstorms/boiler-guide.md; owner, 18 November 2026, "The forge crew's foreman",
// docs/decisions-characters.md#d-2026-11-18-decisions-page-characters): the middle of the three little guys at the
// pedestal (part-hoist.ts) says what the waiting part is for and where it goes. Built on the shared phase-guide
// behaviour (src/components/phase-guide/view.ts). Once the part is taken the other two go back in, and he stays until
// the first seam is struck, pointing the way: to the old train while the boiler is out, to the Roundhouse slab's seam
// once the breaker is out. Local presentation over accepted state: nothing is sent or saved.
import { createPhaseGuide } from '../../components/phase-guide/view.ts';
import { folkVoice } from '../../render/npc-voice.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { boiler as boilerRow, works as worksRow, type ReadWorld } from '../../sim/railway-rows.ts';
import { LINE2_OLD_TRAIN } from '../../sim/railway-line2-layout.ts';
import { WORKS_SEAMS } from '../../sim/railway-works-layout.ts';
import { SEAM_STALL, SEAM_THROAT } from '../../sim/railway-works.ts';
import type { Guy } from '../../place/folk.ts';
import { FOREMAN, HOIST } from './part-hoist.ts';

export type GuideStage = 'boiler' | 'held' | 'breaker' | 'seam';
/** What he says, by stage. Every word is the owner's: each placeholder says what its line must tell. `bark` is said once
 * a stage in a bubble as you come near; `talk` turns over on each Talk. */
export const FOREMAN_LINES: Record<GuideStage, { bark: string; talk: readonly string[] }> = {
  boiler: {
    bark: "owner's line: the boiler is for the old train",
    talk: [
      "owner's line: what the boiler is for, and that it goes to the old train",
      "owner's line: it is slow to drag alone, and a friend can help carry it",
    ],
  },
  held: {
    bark: "owner's line: the old train is that way",
    talk: ["owner's line: which way the old train is, and that the boiler fits in its saddle"],
  },
  breaker: {
    bark: "owner's line: the breaker opens the Works",
    talk: [
      "owner's line: what the breaker is for, and that the Works is next",
      "owner's line: the trains now carry Q6's goods",
    ],
  },
  seam: {
    bark: "owner's line: where the first seam is",
    talk: ["owner's line: where the first seam is, and that the breaker strikes it"],
  },
};
/** Where he points in the stages after the take, in metres: the old train's saddle, then the nearer seam (the
 * Roundhouse slab's, 34 m off; the cut's throat is 200 m on). */
const AIM: Partial<Record<GuideStage, { x: number; z: number }>> = {
  held: { x: LINE2_OLD_TRAIN.x / 100, z: LINE2_OLD_TRAIN.z / 100 },
  seam: { x: WORKS_SEAMS[0].x / 100, z: WORKS_SEAMS[0].z / 100 },
};
/** A placeholder for the owner's name for him: his role, as the camp's "Camp resident" is. */
const FOREMAN_NAME = 'Foreman';

/** Which stage he is in, from accepted state: null when the pedestal has nothing for him to talk about. */
export function guideStage(w: ReadWorld, worksOn: boolean): GuideStage | null {
  const boiler = boilerRow(w).state;
  if (boiler === 'pedestal') return 'boiler';
  if (boiler === 'held' || boiler === 'ground') return 'held';
  if (!worksOn) return null;
  const works = worksRow(w);
  if (works.breaker === 1) return 'breaker';
  return works.breaker === 2 && !(works.seams & (SEAM_STALL | SEAM_THROAT)) ? 'seam' : null;
}

type Deps = {
  /** His body, once the folk kit has loaded (part-hoist.ts). */
  body: () => Guy | null;
  stage: () => GuideStage | null;
  ready: () => boolean;
};
const VOICE = folkVoice(200, 26, 0.95, 3000);

export function createForgeGuide(owner: OwnedView, { body, stage, ready }: Deps) {
  return createPhaseGuide(owner, {
    id: 'railway-talk-foreman',
    name: FOREMAN_NAME,
    color: FOREMAN.coat,
    voice: VOICE,
    body,
    stage,
    lines: FOREMAN_LINES,
    ready,
    bark: true,
    aim: (s) => AIM[s] ?? null,
    waveRange: HOIST.wave,
    // part-hoist.ts waves the three while a part waits on the pedestal; this helper takes over for `point` and `chat`.
    driveBody: false,
  });
}
