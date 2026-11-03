// main.js views from Ultra Water 30ea65e. Same camera/sun, translated by ISLAND_AT only.
import { ROCK, islandHeight } from './height.ts';
import { ISLAND_AT } from './tuning.ts';
type V3 = [number, number, number];
export type DemoView = { cam: V3; look: V3; elevation: number; azimuth: number; fov: number };
const bearing = Math.atan2(Math.cos((205 * Math.PI) / 180), Math.sin((205 * Math.PI) / 180));
const coast = (b: number) => {
  let r = 100;
  while (r < 800 && islandHeight(Math.cos(b) * r, Math.sin(b) * r) > 0) r += 2;
  return { x: Math.cos(b) * r, z: Math.sin(b) * r };
};
const at = (x: number, y: number, z: number): V3 => [x + ISLAND_AT.x, y, z + ISLAND_AT.z];
function shelf(b: number, elevation: number, cx: number, cs: number, cy: number, tx: number, ts: number): DemoView {
  const c = coast(b),
    x = Math.cos(b),
    z = Math.sin(b);
  return {
    cam: at(c.x + x * cx - z * cs, cy, c.z + z * cx + x * cs),
    look: at(c.x + x * tx - z * ts, 0, c.z + z * tx + x * ts),
    elevation,
    azimuth: 205,
    fov: 50,
  };
}
const rb = Math.atan2(ROCK.z, ROCK.x),
  rx = Math.cos(rb),
  rz = Math.sin(rb);
export const DEMO_VIEWS: Record<string, DemoView> = {
  lagoon: shelf(bearing - 1.48, 50, -2, 25, 16, 34, -10),
  breakers: shelf(bearing + 1.9, 38, 48, -35, 10, 20, -10),
  'surf-rock': {
    cam: at(ROCK.x - rx * 28 - rz * 22, 14, ROCK.z - rz * 28 + rx * 22),
    look: at(ROCK.x, 0, ROCK.z),
    elevation: 40,
    azimuth: 205,
    fov: 50,
  },
  'open-ocean': {
    cam: at(Math.cos(bearing + 0.5) * 1500, 9, Math.sin(bearing + 0.5) * 1500),
    look: at(Math.cos(bearing + 0.5) * 2400, 0, Math.sin(bearing + 0.5) * 2400 + 600),
    elevation: 14,
    azimuth: 205,
    fov: 50,
  },
};
export const demoView = DEMO_VIEWS[new URLSearchParams(location.search).get('shot') ?? 'lagoon'] ?? DEMO_VIEWS.lagoon!;
