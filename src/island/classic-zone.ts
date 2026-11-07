// The classic island's critter zone: the fish and gulls (src/features/critter-*.ts) belong to the original island only.
// `whileNearClassicIsland(make)` spawns what `make` returns when the player comes within ENTER metres of the island's
// centre (the origin) and despawns it past LEAVE, so away from the island the critters are out of the scene and run no
// update callbacks. The only per-frame work is one distance check shared by every critter. Serves DESIGN.md 9.
import { defineKind, despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { me } from '../player/state.ts';

// The fish stay within 80 m of a home 35 to 70 m out (150 m at most); the gulls within about 90 m. Entering at 160 m puts
// them there before you reach the island's shore; leaving at 190 m keeps the edge from flickering.
const ENTER = 160;
const LEAVE = 190;

type Watch = { make: () => GameEntity; entity: GameEntity | null };
const watches: Watch[] = [];

defineKind('critter-zone', { update: 3 });
let started = false;
export function whileNearClassicIsland(make: () => GameEntity) {
  watches.push({ make, entity: null });
  if (started) return;
  started = true;
  spawn({
    kind: 'critter-zone',
    update() {
      const p = me.body?.position;
      if (!p) return;
      const d2 = p.x * p.x + p.z * p.z;
      for (let k = 0; k < watches.length; k++) {
        const w = watches[k]!;
        if (!w.entity && d2 < ENTER * ENTER) w.entity = w.make();
        else if (w.entity && d2 > LEAVE * LEAVE) {
          despawn(w.entity);
          w.entity = null;
        }
      }
    },
  });
}
