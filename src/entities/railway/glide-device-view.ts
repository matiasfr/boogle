// The first-climb summit prize: the folded glider roll you will wear, turning in faint rings over a dark drum, no seal or
// shaft. The roll is the card's own shape (reward-data.ts, from gear-models.ts), so what you take is what you wear.
// Local over the room's existing shared glide flag; the finder gets the card, friends the flourish.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import type { V3 } from '../../physics/engine.ts';
import type { Got } from '../../render/reward-reveal.ts';
import { LINE2_GLIDE } from '../../sim/railway-line2-layout.ts';
import { rail } from '../../sim/railway-rows.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { GLIDE_REWARD } from './reward-data.ts';
import { playSharedMoment } from './shared-moment.ts';

type Deps = {
  land: typeof import('../../place/land.ts');
  shapes: typeof import('../../render/part-geometry.ts');
  partMat: THREE.Material;
  glow: THREE.Material;
  youGot: (got: Got) => boolean;
};
/** The drum's light sits this high over its base (Place's tech.ts devices). */
const LIGHT_Y = 1.45;
export function createRailwayGlideDevice(adapter: RailwayAdapter, owner: OwnedView, deps: Deps) {
  const { land, shapes, partMat, glow, youGot } = deps;
  const geometries: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material = partMat) => {
    geometries.push(g);
    const view = new THREE.Mesh(g, m);
    view.castShadow = view.receiveShadow = true;
    return view;
  };
  const at = new THREE.Vector3(LINE2_GLIDE.x / 100, LINE2_GLIDE.y / 100, LINE2_GLIDE.z / 100);
  const device = new THREE.Group();
  device.position.copy(at);
  owner.add(device);
  // Place's device drum, the sea switch's family, but dark all over: no brass cap, so it doesn't read as a second
  // switch (Proof 1, 9 November: with a brass cap and a pale mast it looked like a switch with a lever).
  device.add(
    mesh(
      shapes.merged([
        ['c', 0, 0.35, 0, 0.72, 0.7, 0.72, '#4a4842'],
        ['c', 0, 0.78, 0, 0.56, 0.16, 0.56, '#5d5a52'],
        ['c', 0, 0.9, 0, 0.5, 0.06, 0.5, '#54524b'],
      ]),
    ),
  );
  land.addStatic(
    { kind: 'cylinder', rTop: 0.6, rBottom: 0.72, h: 0.9, segments: 8 },
    { x: at.x, y: at.y + 0.45, z: at.z },
    undefined,
    undefined,
    owner,
  );
  const ring = mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 26), glow);
  ring.position.y = LIGHT_Y;
  ring.rotation.x = Math.PI / 2;
  const ring2 = mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 22), glow);
  ring2.position.y = LIGHT_Y;
  // The roll itself where the core was, at its worn size: one geometry for the drum and the card.
  const prize = shapes.merged(GLIDE_REWARD.parts);
  const roll = mesh(prize);
  roll.position.y = LIGHT_Y;
  device.add(ring, ring2, roll);
  const ringFrom = () => device.localToWorld(new THREE.Vector3(0, LIGHT_Y, 0));
  const target = at.clone().add(new THREE.Vector3(0, 2.2, 0));
  owner.cleanup(() => {
    for (const g of geometries) g.dispose();
  });

  let t = 0;
  const taken = () => rail(adapter.read.world()).glide;
  function draw() {
    for (const o of [ring, ring2, roll]) o.visible = !taken();
  }
  return {
    accepted(e: RailwayAccepted) {
      // A shared moment: the finder's card on the press; friends' cards from ability-arrival.ts (cutscenes for
      // everyone, 17 November). No camera shot either way.
      if (e.op !== 'rail.glide' || e.accepted <= 0) return;
      playSharedMoment('glider', e, adapter.read.pid, (mine) => {
        if (!mine) return false;
        placeSound('pickupGlider', at.x, at.z);
        youGot({
          key: 'glide',
          name: GLIDE_REWARD.name,
          line: GLIDE_REWARD.line,
          model: new THREE.Mesh(prize, partMat),
          from: ringFrom(),
        });
        return false;
      });
    },
    restore: draw,
    update(dt: number) {
      t += dt;
      ring.rotation.z += dt * 0.7;
      ring2.rotation.y += dt;
      roll.rotation.y += dt * 0.6;
      roll.position.y = LIGHT_Y + Math.sin(t * 2) * 0.06;
      draw();
    },
    targets(p: V3): Interactable[] {
      if (taken() || Math.hypot(p.x - at.x, p.z - at.z) > 3 || Math.abs(p.y - at.y) > 2.2) return [];
      return [{ id: 'railway-glide-device', verb: 'Take it', at: target, run: () => void adapter.claimGlide() }];
    },
    inspect: () => {
      const w = adapter.read.world();
      return {
        glideDevice: {
          x: at.x,
          y: at.y,
          z: at.z,
          available: !rail(w).glide,
          woken: !rail(w).glide,
          taken: rail(w).glide,
          locator: false,
          unfurling: false,
          flaring: false,
          bands: 0,
          bandFlaring: false,
        },
      };
    },
  };
}
