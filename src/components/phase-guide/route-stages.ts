import type { ReadWorld } from '../../sim/railway-rows.ts';
import { WORKS_STEPS, type WorksSite } from '../../sim/railway-queries-room.ts';
import type { GuideLines } from './stages.ts';

const line = (brief: string): GuideLines => ({ talk: [`[placeholder — owner's line: ${brief}]`] });
export const ROUTE_LINES = {
  pick: line('climb the stair to the north rim for the powered pick'),
  inclineGate: line('use the powered pick at the incline barrier on the south platform'),
  incline: line('bring kit from the rack to the incline railhead and lay the line to Bell Rock'),
  seeds: line('collect the crystal seeds on Bell Rock’s lower deck'),
  bay: line('build the bay cut to Bell Rock from the rack and frame at Home’s West landing'),
  canopyGate: line('open the Canopy barrier here with crystal seeds, or take the cave line from West landing first'),
  canopyOnly: line('the cave line is laid; use the seeds to open the Canopy barrier here'),
  canopy: line('carry kit to the bay line’s railhead and extend it to Canopy Town'),
  plug: line('break the sea-cave plug here with the powered pick; the Canopy branch can be built independently'),
  cave: line('feed the sea-cave railhead from its rack and lay the line to Port Quay'),
  cloth: line('collect glider cloth beside the Canopy platform'),
  waitWall: line('the Notch frame opens once the White Wall line from Port Quay reaches High Gorge'),
  notchGate: line('use the cloth to open the Notch barrier at the Canopy buffers'),
  notch: line('feed the frame here and build the tunnel to Lantern Notch'),
  lantern: line('collect the lantern at Lantern Notch and bring its light back to Bell Rock'),
  causewayGate: line('use the lantern at Bell Rock’s causeway barrier'),
  causeway: line('lay the causeway from Bell Rock’s frame'),
  otherBranch: line(
    'the cave trains have reached the quay; finish the Canopy branch from Bell Rock to start White Wall',
  ),
  wall: line('feed the White Wall line from Port Quay and follow its railheads back toward High Gorge'),
  deep: line('use the crystal seeds at the deep span barrier on the final White Wall railhead'),
  lastSpan: line('feed the final White Wall frame to close the ring at High Gorge'),
  closed: { ...line('relaxed quay-hand remark that White Wall now closes the ring to High Gorge'), idle: true },
};
export type RouteArea = 'gorge' | 'bell' | 'west' | 'canopy' | 'quay';
export type RouteStage = keyof typeof ROUTE_LINES | 'idle';
const steps = new Map(WORKS_STEPS.map((step) => [step.site, step]));

/** The board supplies the room-wide step. At the fork each station can still help a party on its own branch. */
export function routeGuideStage(area: RouteArea, w: ReadWorld, site: WorksSite): RouteStage | null {
  const done = (s: WorksSite) => steps.get(s)!.done(w);
  switch (area) {
    case 'gorge':
      if (!done('stack-4')) return null;
      if (site === 'pick') return 'pick';
      if (site === 'incline-gate') return 'inclineGate';
      return site.startsWith('incline-') ? 'incline' : 'idle';
    case 'bell':
      if (!done('incline-2')) return null;
      if (site === 'seeds') return 'seeds';
      if (!done('bay-2')) return 'bay';
      if (!done('canopy-gate')) return done('cave-3') ? 'canopyOnly' : 'canopyGate';
      if (!done('canopy-3')) return 'canopy';
      if (site === 'lantern') return 'lantern';
      if (site === 'causeway-gate') return 'causewayGate';
      return site === 'causeway-1' ? 'causeway' : 'idle';
    case 'west':
      if (!done('incline-2')) return null;
      if (!done('bay-2')) return 'bay';
      if (!done('plug-gate')) return 'plug';
      return done('cave-3') ? 'idle' : 'cave';
    case 'canopy':
      if (!done('canopy-3')) return null;
      if (!done('cloth')) return 'cloth';
      if (!done('wall-6')) return 'waitWall';
      if (site === 'notch-gate') return 'notchGate';
      return site === 'notch-1' ? 'notch' : 'idle';
    case 'quay':
      if (!done('cave-3')) return null;
      if (!done('canopy-3')) return 'otherBranch';
      if (done('wall-6')) return 'closed';
      if (!done('wall-5')) return 'wall';
      return done('deep-gate') ? 'lastSpan' : 'deep';
  }
}
