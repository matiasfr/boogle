// Home keeps a trophy (co-op abilities, option E; docs/brainstorms/coop-abilities.md): once the room has found the
// double jump, a greybox plinth at the village's finders' bay holds a copy of the find. The first time each player
// passes it, it plays for them where they stand: the prize glints and spins up, and folk nearby hop. Arrive with a
// friend within the same few metres and it's bigger: the bell, confetti and a wider crowd. Never required, never a
// card. Local: who has seen it is this browser's (ability-arrival.ts), partner positions are the presence it has.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { AbilitySeen } from './ability-arrival.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { INTERP_MS, PLAYER_R, reducedMotion } from '../../constants.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { confettiBurst, rewardDust, rewardSparkles } from '../../render/reward-particles.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { rail } from '../../sim/railway-rows.ts';

const TEAL = new THREE.Color('#39e6c6');
/** Within this of the plinth (m, on the ground), you're passing it; a friend within it too makes the show bigger. */
const NEAR = 4.5;
const SHOW_S = 3.2;

export async function createTrophyPlinth(
  adapter: RailwayAdapter,
  owner: OwnedView,
  seen: AbilitySeen,
  busy: () => boolean,
) {
  const [layout, land, home, shapes, flat, folk] = await Promise.all([
    import('../../place/layout.ts'),
    import('../../place/land.ts'),
    import('../../place/home-station.ts'),
    import('../../render/part-geometry.ts'),
    import('../../render/flat.ts'),
    import('../../place/folk.ts'),
  ]);
  // Out on the finders' bay's centreline, past its missed boxes, on the street's edge where people pass.
  const spot = home.bayPoint(0, home.PLINTH_OUT),
    x = layout.toWorld(spot.x),
    z = spot.z;
  const ground = land.H(x, z);
  const root = new THREE.Group();
  root.visible = false;
  owner.root.add(root);
  const geometries: THREE.BufferGeometry[] = [];
  const block = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.3), flat.flat('#b9b2a2'));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 1.5), flat.flat('#cfc8b6'));
  geometries.push(block.geometry, cap.geometry);
  block.position.set(x, ground + 0.5, z);
  cap.position.set(x, ground + 1.08, z);
  for (const m of [block, cap]) m.castShadow = m.receiveShadow = true;
  // The jump prize, as the device holds it up (tools.ts).
  const prizeGeometry = shapes.merged([
    ['t', -0.3, 0, 0, 0.32, 0.32, 0.32, '#39e6c6'],
    ['t', 0.3, 0, 0, 0.32, 0.32, 0.32, '#39e6c6'],
  ]);
  geometries.push(prizeGeometry);
  const prizeMaterial = readableUnlit(new THREE.MeshBasicNodeMaterial({ vertexColors: true }));
  const prize = new THREE.Mesh(prizeGeometry, prizeMaterial);
  const prizeY = ground + 1.62;
  prize.position.set(x, prizeY, z);
  // The plinth lights for its show: a teal band glowing round the cap.
  const glowGeometry = new THREE.RingGeometry(0.55, 0.95, 40).rotateX(-Math.PI / 2);
  geometries.push(glowGeometry);
  const glowMaterial = readableUnlit(
    new THREE.MeshBasicNodeMaterial({
      color: TEAL,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.set(x, ground + 1.17, z);
  glow.visible = false;
  root.add(block, cap, prize, glow);
  let body: ReturnType<typeof land.addStatic> | null = null;

  const stats = { shows: 0, together: 0, partners: 0 };
  let show = 0,
    big = false;
  const TOGETHER_S = 2; // a friend this close behind still counts as arriving together
  const partnersNear = (now: number) => {
    let n = 0;
    for (const r of remotes.values()) {
      if (!r.visible || !r.entered) continue;
      const s = r.snaps.sample(now - INTERP_MS);
      if (!s || s.over > 1500) continue;
      const px = s.a.p[0]! + (s.b.p[0]! - s.a.p[0]!) * s.u,
        pz = s.a.p[2]! + (s.b.p[2]! - s.a.p[2]!) * s.u;
      if (Math.hypot(px - x, pz - z) <= NEAR + 1.5) n++;
    }
    return n;
  };
  /** The small show, for whoever passes it first. */
  function play() {
    seen.add('plinth:jump');
    stats.shows++;
    show = SHOW_S;
    big = false;
    placeSound('pickupJump', x, z);
    folk.cheerAround(x, z, 12, 3.5);
    if (reducedMotion) return;
    rewardSparkles(x, prizeY, z, 22, 2.2, { color: TEAL });
    rewardDust(x, ground + 1.1, z, 10, 2.4, 0.4);
  }
  /** A friend arriving with you (in the radius now, or within the show's first moments) makes it bigger. */
  function bigger(partners: number) {
    big = true;
    stats.together++;
    stats.partners = partners;
    placeSound('boxCommon', x, z); // the village bell
    folk.cheerAround(x, z, 22, 6);
    if (reducedMotion) return;
    rewardSparkles(x, prizeY, z, 40, 3.2, { color: TEAL });
    rewardDust(x, ground + 1.1, z, 16, 3.6, 0.4);
    confettiBurst(x, prizeY + 0.4, z);
  }

  const api = {
    at: { x, y: ground, z },
    inspect: () => ({ x, y: ground, z, visible: root.visible, showing: show > 0, ...stats }),
    update(dt: number, now: number) {
      const on = adapter.read.ready() && rail(adapter.read.world()).jump;
      root.visible = on;
      if (on && !body)
        body = land.addStatic(
          { kind: 'box', hx: 0.75, hy: 0.58, hz: 0.75 },
          { x, y: ground + 0.58, z },
          undefined,
          undefined,
          owner,
        );
      else if (!on && body) {
        owner.removeBody(body);
        body = null;
      }
      if (!on) return;
      const p = me.body?.interpolatedPosition;
      if (
        p &&
        !seen.has('plinth:jump') &&
        !busy() &&
        Math.hypot(p.x - x, p.z - z) <= NEAR &&
        Math.abs(p.y - PLAYER_R - ground) < 3
      )
        play();
      if (show > SHOW_S - TOGETHER_S && !big) {
        const partners = partnersNear(now);
        if (partners > 0) bigger(partners);
      }
      show = Math.max(0, show - dt);
      const u = show > 0 ? show / SHOW_S : 0;
      // At rest it turns slowly; its show spins it up, lifts it and sparkles as it goes.
      prize.rotation.y += dt * (0.5 + (reducedMotion ? 0 : 6 * u));
      prize.position.y = prizeY + (reducedMotion ? 0 : Math.sin(now * 0.002) * 0.05 + 0.35 * Math.sin(Math.PI * u));
      glow.visible = u > 0;
      glowMaterial.opacity = Math.min(1, u * 2) * (reducedMotion ? 0.6 : 0.75 + 0.25 * Math.sin(now * 0.02));
      if (!reducedMotion && show > 0 && Math.floor(show * 8) !== Math.floor((show + dt) * 8))
        rewardSparkles(x, prize.position.y, z, 3, 1.4, { color: TEAL, life: 0.5, size: 0.1 });
    },
    dispose() {
      root.removeFromParent();
      for (const g of geometries) g.dispose();
      prizeMaterial.dispose();
      glowMaterial.dispose();
    },
  };
  owner.cleanup(api.dispose);
  return api;
}
