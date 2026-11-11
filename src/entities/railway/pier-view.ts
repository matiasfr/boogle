// The pier's Local payoff: pooled rockets only on the mounted Q6 completion edge. From v27 it also holds the pier's
// second track and Q7's deck (./ring-deck.ts), laid from the room's rows once Q7 starts.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import { createRingDeck } from './ring-deck.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { whistle } from '../../render/machine-sfx.ts';

type Deps = {
  layout: typeof import('../../place/layout.ts');
  rail: typeof import('./rail-kit.ts');
  sounds: typeof import('../../render/fanfare.ts');
  adapter: RailwayAdapter;
  /** Line 2's track, whose old merge the relay retires. */
  track: { retire(on: boolean): number };
};
export function createRailwayPier(owner: OwnedView, { layout, rail, sounds, adapter, track }: Deps) {
  const deck = createRingDeck(adapter, owner, track);
  // besideLine already includes ORIGIN, as in the other production rail views.
  const end = rail.besideLine(layout.LINKS[1]!.line, 739, 0);
  const at = { x: end.x, y: layout.railY(layout.LINKS[1]!.line, 739), z: end.z };
  const colours = ['#ffcc63', '#39e6c6', '#ff7272', '#b9a0ff'].map((c) => new THREE.Color(c));
  const trail = new THREE.Color('#ffe9b0');
  type Rocket = { t: number; x: number; y: number; z: number; height: number; size: number; colour: THREE.Color };
  const rockets: Rocket[] = [];
  let completed = false,
    show = -1,
    secondWhistle = false,
    shows = 0;
  function barrage(x: number, y: number, z: number, count: number, gap: number, spread: number, size: number) {
    for (let k = 0; k < count; k++)
      rockets.push({
        t: -k * gap,
        x: x + (Math.random() - 0.5) * spread,
        y,
        z: z + (Math.random() - 0.5) * spread,
        height: 24 + Math.random() * 16,
        size,
        colour: colours[Math.floor(Math.random() * colours.length)]!,
      });
  }
  owner.cleanup(() => {
    rockets.length = 0;
  });
  return {
    restore(done: boolean) {
      deck.restore();
      completed = done;
      show = -1;
      secondWhistle = false;
      rockets.length = 0;
    },
    update(dt: number, done: boolean) {
      deck.update(dt);
      if (done && !completed) {
        show = 0;
        secondWhistle = false;
        shows++;
        sounds.fanfare(true);
        whistle(at.x, at.z);
        barrage(at.x, at.y + 6, at.z, 10, 0.5, 36, 2.2);
        barrage(
          layout.VILLAGE.x + layout.ORIGIN.x,
          layout.VILLAGE.y,
          layout.VILLAGE.z + layout.ORIGIN.z,
          5,
          0.6,
          26,
          1.6,
        );
      }
      if (!done && completed) {
        show = -1;
        rockets.length = 0;
      }
      completed = done;
      if (show >= 0) {
        show += dt;
        if (!secondWhistle && show >= 1.4) {
          secondWhistle = true;
          whistle(at.x, at.z);
        }
      }
      for (let k = rockets.length - 1; k >= 0; k--) {
        const r = rockets[k]!;
        r.t += dt;
        if (r.t < 0) continue;
        if (r.t >= 0.8) {
          for (let n = 0; n < Math.round(44 + r.size * 8); n++) {
            const a = Math.random() * Math.PI * 2,
              u = Math.random() * 2 - 1,
              radius = Math.sqrt(1 - u * u),
              speed = (10 + Math.random() * 3) * r.size;
            emit({
              x: r.x,
              y: r.y + r.height,
              z: r.z,
              vx: Math.cos(a) * radius * speed,
              vy: u * speed,
              vz: Math.sin(a) * radius * speed,
              life: 1.5 + Math.random() * 0.5,
              size: 0.55 * r.size,
              color: r.colour,
              intensity: readableIntensity(),
              gravity: 7,
              drag: 1.4,
              shrink: 0.4,
            });
          }
          rockets.splice(k, 1);
        } else
          emit({
            x: r.x,
            y: r.y + r.height * (1 - (1 - r.t / 0.8) ** 2),
            z: r.z,
            vx: 0,
            vy: -1,
            vz: 0,
            life: 0.5,
            size: 0.35 * r.size,
            color: trail,
            intensity: readableIntensity(),
            shrink: 0.5,
          });
      }
      if (show > 6 && !rockets.length) show = -1;
    },
    inspect: () => ({ pier: { ...at, completed, rockets: rockets.length, show, shows }, ...deck.inspect() }),
  };
}
