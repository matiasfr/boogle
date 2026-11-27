// Wave 1 station guides (docs/brainstorms/phase-guides.md): the kiln hand at Quarry halt and the roundhouse hand at
// Home's Roundhouse. Both use `addLooker` (never `waiting`, no collider, clear of the rail gauge and ≥ 3.5 m from any
// work prompt) and the shared `createPhaseGuide` helper over accepted server rows (`adapter.read.world()`).
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { folkVoice } from '../../render/npc-voice.ts';
import { createPhaseGuide } from '../../components/phase-guide/view.ts';
import {
  KILN_HAND_LINES,
  ROUNDHOUSE_HAND_LINES,
  kilnHandStage,
  roundhouseHandStage,
  type KilnHandStage,
  type RoundhouseHandStage,
} from '../../components/phase-guide/stages.ts';
import { LINE_HALTS } from '../../sim/railway-train.ts';
import { SHED_STALL, WORKS_KILN, WORKS_RACK, WORKS_SEAMS } from '../../sim/railway-works-layout.ts';
import { garageRow, polarAt } from './garage-geo.ts';
import { TABLE } from '../../place/home-station.ts';
import { ORIGIN } from '../../place/layout.ts';
import { H } from '../../place/terrain.ts';
import type { Guy } from '../../place/folk.ts';

/** Quarry halt: just off the trodden path to the "Kiln" post, 5.05 m off WORKS_RACK (reach 4 m) and 6.2 m off haltAt. */
const KILN_HAND_AT = { x: 1085.0, z: 46.2 } as const;
const KILN_HAND_COAT = '#c96b2c';
const KILN_HAND_VOICE = folkVoice(230, 28, 1.0, 3200);

const KILN_AIM: Partial<Record<KilnHandStage, { x: number; z: number }>> = {
  throat: { x: WORKS_SEAMS[1].x / 100, z: WORKS_SEAMS[1].z / 100 },
  kiln: { x: WORKS_KILN.x / 100, z: WORKS_KILN.z / 100 },
  footings: { x: WORKS_RACK.x / 100, z: WORKS_RACK.z / 100 },
};

/** Home Roundhouse: NNE apron beside the turntable, 4.98 m off the garage post (reach 2.6 m), 7.0 m off road 2,
 * 24+ m off the stall sockets, and 17° clear of the garage camera. */
const ROUNDHOUSE_TABLE = { x: TABLE.x + ORIGIN.x, z: TABLE.z } as const;
const ROUNDHOUSE_POST = polarAt(ROUNDHOUSE_TABLE, garageRow(0).geo.post);
const ROUNDHOUSE_HAND_AT = polarAt(ROUNDHOUSE_TABLE, { bearing: 32, r: 10.6 });
const ROUNDHOUSE_HAND_COAT = '#3d8b6e';
const ROUNDHOUSE_HAND_VOICE = folkVoice(185, 25, 0.92, 2900);

const ROUNDHOUSE_AIM: Partial<Record<RoundhouseHandStage, { x: number; z: number }>> = {
  stall: { x: SHED_STALL.x / 100, z: SHED_STALL.z / 100 },
  cradle: { x: SHED_STALL.x / 100, z: SHED_STALL.z / 100 },
  turn: ROUNDHOUSE_TABLE,
  steel: ROUNDHOUSE_POST,
  trade: ROUNDHOUSE_POST,
};

export function createStationGuides(adapter: RailwayAdapter, owner: OwnedView) {
  const quarryHalt = LINE_HALTS.find((h) => h.name === 'Quarry')!;
  const kilnRestYaw = Math.atan2(quarryHalt.x / 100 - KILN_HAND_AT.x, quarryHalt.z / 100 - KILN_HAND_AT.z);
  const roundhouseRestYaw = Math.atan2(
    ROUNDHOUSE_TABLE.x - ROUNDHOUSE_HAND_AT.x,
    ROUNDHOUSE_TABLE.z - ROUNDHOUSE_HAND_AT.z,
  );

  let kilnBody: Guy | null = null;
  let roundhouseBody: Guy | null = null;

  void import('../../place/folk.ts').then((folk) => {
    if (!owner.alive) return;
    kilnBody = folk.addLooker(
      KILN_HAND_AT.x,
      H(KILN_HAND_AT.x, KILN_HAND_AT.z),
      KILN_HAND_AT.z,
      kilnRestYaw,
      KILN_HAND_COAT,
      { on: false },
    );
    roundhouseBody = folk.addLooker(
      ROUNDHOUSE_HAND_AT.x,
      H(ROUNDHOUSE_HAND_AT.x, ROUNDHOUSE_HAND_AT.z),
      ROUNDHOUSE_HAND_AT.z,
      roundhouseRestYaw,
      ROUNDHOUSE_HAND_COAT,
      { on: false },
    );
    owner.cleanup(() => {
      for (const g of [kilnBody, roundhouseBody]) {
        if (!g) continue;
        const i = folk.folk.guys.indexOf(g);
        if (i >= 0) folk.folk.guys.splice(i, 1);
      }
      kilnBody = null;
      roundhouseBody = null;
    });
  });

  const active = () => adapter.read.whole();
  const ready = () => adapter.read.ready();

  const kilnHand = createPhaseGuide(owner, {
    id: 'railway-talk-kiln-hand',
    name: 'Kiln hand',
    color: KILN_HAND_COAT,
    voice: KILN_HAND_VOICE,
    body: () => kilnBody,
    stage: () => kilnHandStage(adapter.read.world()),
    lines: KILN_HAND_LINES,
    ready,
    active,
    bark: true,
    aim: (s) => KILN_AIM[s] ?? null,
    restYaw: kilnRestYaw,
  });

  const roundhouseHand = createPhaseGuide(owner, {
    id: 'railway-talk-roundhouse-hand',
    name: 'Roundhouse hand',
    color: ROUNDHOUSE_HAND_COAT,
    voice: ROUNDHOUSE_HAND_VOICE,
    body: () => roundhouseBody,
    stage: () => roundhouseHandStage(adapter.read.world()),
    lines: ROUNDHOUSE_HAND_LINES,
    ready,
    active,
    bark: true,
    aim: (s) => ROUNDHOUSE_AIM[s] ?? null,
    restYaw: roundhouseRestYaw,
  });

  function syncOn() {
    const on = active();
    if (kilnBody) kilnBody.on = on;
    if (roundhouseBody) roundhouseBody.on = on;
  }

  return {
    restore: syncOn,
    update(dt: number) {
      syncOn();
      kilnHand.update(dt);
      roundhouseHand.update(dt);
    },
    lateUpdate() {
      kilnHand.lateUpdate();
      roundhouseHand.lateUpdate();
    },
    accepted() {},
    targets(): Interactable[] {
      return [...kilnHand.targets(), ...roundhouseHand.targets()];
    },
    inspect: () => ({
      stationGuides: {
        kilnHand: kilnHand.inspect(),
        roundhouseHand: roundhouseHand.inspect(),
      },
    }),
  };
}
