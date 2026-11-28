import { createPhaseGuide } from '../../components/phase-guide/view.ts';
import {
  ROUTE_LINES,
  routeGuideStage,
  type RouteArea,
  type RouteStage,
} from '../../components/phase-guide/route-stages.ts';
import type { Guy } from '../../place/folk.ts';
import { folkVoice } from '../../render/npc-voice.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { WORKS_STEPS, type RoomWorks, type WorksSite } from '../../sim/railway-queries-room.ts';
import type { ReadWorld } from '../../sim/railway-rows.ts';
import { gorgeAt, GORGE_DECK } from './massing.ts';
import { routeAreas } from './state.ts';

const stations: readonly {
  area: RouteArea;
  name: string;
  color: string;
  pitch: number;
  at: { x: number; y: number; z: number };
  points: Partial<Record<RouteStage, WorksSite>>;
}[] = [
  {
    area: 'gorge',
    name: 'Gorge watch',
    color: '#cb983e',
    pitch: 170,
    at: gorgeAt(-2, -23, GORGE_DECK),
    points: { pick: 'pick', inclineGate: 'incline-gate', incline: 'incline-1' },
  },
  {
    area: 'bell',
    name: 'Junction signalman',
    color: '#c85149',
    pitch: 210,
    at: { x: -68, y: 4.9, z: -844 },
    points: {
      seeds: 'seeds',
      canopyGate: 'canopy-gate',
      canopyOnly: 'canopy-gate',
      canopy: 'canopy-1',
      causewayGate: 'causeway-gate',
      causeway: 'causeway-1',
    },
  },
  {
    area: 'west',
    name: 'Landing hand',
    color: '#467aab',
    pitch: 195,
    at: { x: 791, y: 4.9, z: -12 },
    points: { bay: 'bay-1', plug: 'plug-gate', cave: 'cave-1' },
  },
  {
    area: 'canopy',
    name: 'Canopy hand',
    color: '#8a68b3',
    pitch: 245,
    at: { x: -1074, y: 13.9, z: -308.4 },
    points: { cloth: 'cloth', waitWall: 'notch-gate', notchGate: 'notch-gate', notch: 'notch-1' },
  },
  {
    area: 'quay',
    name: 'Quay hand',
    color: '#378c92',
    pitch: 185,
    at: { x: 138.8, y: 3.9, z: 923.8 },
    points: { wall: 'wall-1' },
  },
];

export function createRouteGuides(owner: OwnedView, ready: () => boolean) {
  const sites = new Map(WORKS_STEPS.map(({ site, at }) => [site, { x: at.x / 100, z: at.z / 100 }]));
  const guides = stations.map(({ area, at, name, color, pitch, points }) => {
    let body: Guy | null = null;
    let stage: RouteStage | null = null;
    let target: { x: number; z: number } | null = null;
    const guide = createPhaseGuide<RouteStage>(owner, {
      id: 'railway-talk-' + area,
      name,
      color,
      voice: folkVoice(pitch, 25, 1, 3000),
      stage: () => stage,
      ready,
      // Hide the body outside its resident area. Keep the guide's heard cursor across return journeys.
      body: () => (body?.on ? body : null),
      lines: {
        ...ROUTE_LINES,
        idle: {
          talk: [`[placeholder — owner's line: relaxed idle remark from the ${name.toLowerCase()}]`],
          idle: true,
        },
      },
      aim: () => target,
    });
    return {
      ...guide,
      area,
      mount(folk: typeof import('../../place/folk.ts')) {
        body = folk.addLooker(at.x, at.y, at.z, 0, color, { on: false });
        const guy = body;
        owner.cleanup(() => {
          const i = folk.folk.guys.indexOf(guy);
          if (i >= 0) folk.folk.guys.splice(i, 1);
        });
      },
      read(w: ReadWorld, work: RoomWorks) {
        stage = routeGuideStage(area, w, work.site);
        const site = stage && points[stage];
        // A construction frame travels to the railhead. Point along the running line once its first section lays.
        const currentSection = site?.endsWith('-1') && work.site.startsWith(site.slice(0, -1));
        target = site ? (sites.get(currentSection ? work.site : site) ?? null) : null;
      },
      update(dt: number) {
        if (body) body.on = !!stage && !!routeAreas.get(area)?.mounted;
        guide.update(dt);
      },
    };
  });
  void import('../../place/folk.ts').then((folk) => {
    if (owner.alive) for (const g of guides) g.mount(folk);
  });
  return {
    read(w: ReadWorld, work: RoomWorks) {
      for (const g of guides) g.read(w, work);
    },
    update(dt: number) {
      for (const g of guides) g.update(dt);
    },
    lateUpdate() {
      for (const g of guides) g.lateUpdate();
    },
    targets: () => guides.flatMap((g) => g.targets()),
    inspect: () => Object.fromEntries(guides.map((g) => [g.area, g.inspect()])),
  };
}
