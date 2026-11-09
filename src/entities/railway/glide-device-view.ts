// The glider's device on Needle Bell's summit (docs/plans/glider-b-home-flow.md), Local over accepted state. Sealed
// until Q5 is laid: a dark drum and a folded vane on a short mast, its long axis pointing at the forge, no ring, no
// light and no prompt. Woken: the vane unfurls teal and cream, Place's rings and core turn, and a faint locator rises.
// Taken (the room's `glide`): the drum stays, the rest goes. The finder's card plays on their own accepted (predicted)
// take; everyone else's flourish is ability-arrival.ts. Nothing here grants anything.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import type { V3 } from '../../physics/engine.ts';
import type { Got } from '../../render/reward-reveal.ts';
import { LINE2_GLIDE } from '../../sim/railway-line2-layout.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { warmDraw } from '../../render/precompile.ts';
import { playMark } from '../../proto/mark.ts';
import { GLIDE_REWARD } from './reward-data.ts';

type Line2 = NonNullable<ReturnType<RailwayAdapter['inspect']>['line2']>;
type Deps = {
  land: typeof import('../../proto/place/land.ts');
  shapes: typeof import('../../proto/place/part-geometry.ts');
  partMat: THREE.Material;
  glow: THREE.Material;
  youGot: (got: Got) => boolean;
};
/** The drum's light sits this high over its base (Place's tech.ts devices). */
const LIGHT_Y = 1.45;
const UNFURL_S = 0.6;
const LOCATOR = { r: 0.1, h: 50 };

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
  // Place's device drum, the sea switch's family; dark under its cap so it doesn't read as a second switch.
  device.add(
    mesh(
      shapes.merged([
        ['c', 0, 0.35, 0, 0.72, 0.7, 0.72, '#4a4842'],
        ['c', 0, 0.78, 0, 0.56, 0.16, 0.56, '#5d5a52'],
        ['c', 0, 0.9, 0, 0.5, 0.06, 0.5, '#6e5c3a'],
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
  // A short mast at the drum's east edge, and the vane at its top pointing west (-x), at the forge.
  const MAST = { x: 0.48, top: 2.35 };
  const mast = mesh(new THREE.BoxGeometry(0.08, MAST.top - 0.93, 0.08).translate(MAST.x, (MAST.top + 0.93) / 2, 0));
  const furled = mesh(
    shapes.merged([
      ['b', -0.25, 0, 0, 1.3, 0.16, 0.2, '#3d3c38'],
      ['b', 0.42, 0, 0, 0.12, 0.22, 0.24, '#33322e'],
    ]),
  );
  furled.position.set(MAST.x, MAST.top - 0.1, 0);
  // Woken: the cloth opens to the worn roll's teal and cream, its leading edge west.
  const vane = mesh(
    shapes.merged([
      ['b', -0.3, 0, 0, 1.4, 0.05, 0.9, '#39e6c6', 0, 0.06],
      ['b', -0.98, -0.02, 0, 0.08, 0.07, 0.92, '#efe4c8'],
      ['b', 0.36, -0.03, 0, 0.12, 0.09, 0.3, '#c79a3e'],
    ]),
  );
  vane.position.copy(furled.position);
  device.add(mast, furled, vane);
  const ring = mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 26), glow);
  ring.position.y = LIGHT_Y;
  ring.rotation.x = Math.PI / 2;
  const ring2 = mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 22), glow);
  ring2.position.y = LIGHT_Y;
  const core = mesh(new THREE.OctahedronGeometry(0.26), glow);
  core.position.y = LIGHT_Y;
  // The faint locator: as faint as the jump device's (call 12), additive and unlit, seen across Home once woken.
  const shaftMat = readableUnlit(
    new THREE.MeshBasicNodeMaterial({
      color: '#39e6c6',
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const shaft = mesh(new THREE.CylinderGeometry(LOCATOR.r, LOCATOR.r, LOCATOR.h, 6), shaftMat);
  shaft.castShadow = shaft.receiveShadow = false;
  shaft.position.y = LOCATOR.h / 2 + 1.4;
  device.add(ring, ring2, core, shaft);
  const woken = [vane, ring, ring2, core, shaft];
  // The loading frame warms the woken look, so Q5's completion edge never hitches on its first draw.
  warmDraw(() => {
    const was = woken.map((o) => o.visible);
    for (const o of woken) o.visible = true;
    return () => woken.forEach((o, k) => (o.visible = was[k]!));
  });
  const ringFrom = () => device.localToWorld(new THREE.Vector3(0, LIGHT_Y, 0));
  const target = at.clone().add(new THREE.Vector3(0, 2.2, 0));
  const prize = shapes.merged(GLIDE_REWARD.parts);
  geometries.push(prize);
  owner.cleanup(() => {
    for (const g of geometries) g.dispose();
    shaftMat.dispose();
  });

  /** -1: not yet seen this session (the first build snaps); otherwise the completed count last seen ready. */
  let seenCompleted = -1;
  let unfurlT = -1;
  let t = 0;
  const isWoken = (l: Line2) => l.completed >= 5;
  const available = (l: Line2) => isWoken(l) && !adapter.inspect().glide;
  function draw(l: Line2) {
    const taken = adapter.inspect().glide;
    const awake = isWoken(l) && !taken;
    for (const o of [ring, ring2, core, shaft]) o.visible = awake;
    mast.visible = !taken;
    const u = unfurlT < 0 ? 1 : Math.min(1, unfurlT / UNFURL_S);
    vane.visible = awake;
    furled.visible = !taken && (!awake || u < 0.15);
    vane.scale.set(0.3 + 0.7 * u, 1, 0.12 + 0.88 * u * u * (3 - 2 * u));
  }
  return {
    accepted(e: RailwayAccepted) {
      // Only the finder gets the card; everyone else's flourish is ability-arrival.ts (co-op abilities, option E).
      if (e.op !== 'rail.glide' || e.accepted <= 0 || e.pid !== adapter.inspect().pid) return;
      placeSound('pickupGlider', at.x, at.z);
      youGot({
        key: 'glide',
        name: GLIDE_REWARD.name,
        line: GLIDE_REWARD.line,
        model: new THREE.Mesh(prize, partMat),
        from: ringFrom(),
      });
    },
    /** A restore (load, rejoin, resync) snaps to state: no wake show. */
    restore(l: Line2) {
      seenCompleted = l.completed;
      unfurlT = -1;
      draw(l);
    },
    update(dt: number, l: Line2) {
      t += dt;
      // The live edge only: Q5's completion seen going from 4 to 5 in this session, while still sealed.
      if (seenCompleted === 4 && l.completed >= 5 && !adapter.inspect().glide) {
        unfurlT = 0;
        playMark('glider woken', { authority: 'local' });
      }
      if (adapter.inspect().ready) seenCompleted = l.completed;
      if (unfurlT >= 0) {
        unfurlT += dt;
        if (unfurlT >= UNFURL_S) unfurlT = -1;
      }
      const spin = unfurlT >= 0 ? 6 : 1;
      ring.rotation.z += dt * 0.7 * spin;
      ring2.rotation.y += dt * spin;
      core.rotation.y += dt * 1.2;
      core.position.y = LIGHT_Y + Math.sin(t * 2) * 0.06;
      draw(l);
    },
    targets(p: V3, l: Line2): Interactable[] {
      if (!available(l) || Math.hypot(p.x - at.x, p.z - at.z) > 3 || Math.abs(p.y - at.y) > 2.2) return [];
      return [{ id: 'railway-glide-device', verb: 'Take it', at: target, run: () => void adapter.claimGlide() }];
    },
    inspect: () => {
      const l = adapter.inspect().line2;
      return {
        glideDevice: {
          x: at.x,
          y: at.y,
          z: at.z,
          available: !!l && available(l),
          woken: !!l && isWoken(l) && !adapter.inspect().glide,
          taken: adapter.inspect().glide,
          locator: shaft.visible,
          unfurling: unfurlT >= 0,
        },
      };
    },
  };
}
