// The production Needle Bell climb: Local static geometry and hook presentation, owned by the railway view.
// Authored numbers/shapes only; never import Place's campaign, moves or tech owners.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Shape } from '../../physics/engine.ts';
import { camera } from '../../render/scene.ts';
import { readableGlow, readableUnlit } from '../../render/readable-unlit.ts';
import { hookRings, type HookRing } from './hook-path.ts';
import { me, camForward } from '../../player/player.ts';
import { glyph } from '../../player/glyphs.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { RING_BRACE_PLATFORM, RING_HOOK } from '../../sim/railway-ring-layout.ts';
import { RING_S, line2World } from './line2-path.ts';
import { onRemotePresence, onPeerRemoved, type Remote } from '../../netplay/net.ts';

type RemoteView = { presence: (r: Remote, value: unknown) => void; removed: (peer: string) => void };
let activeRemote: RemoteView | null = null;
// Network hooks have module lifetime; rebuilds forward only to the mounted railway view.
onRemotePresence((r, pr) => activeRemote?.presence(r, pr.railwayHook));
onPeerRemoved((r) => activeRemote?.removed(r.peer));

export async function createRailwayHookView(owner: OwnedView) {
  const [tech, layout, land, shapes, flatMod, gear, sounds] = await Promise.all([
    import('../../place/tech-layout.ts'),
    import('../../place/layout.ts'),
    import('../../place/land.ts'),
    import('../../render/part-geometry.ts'),
    import('../../render/flat.ts'),
    import('../../render/gear-models.ts'),
    import('../../render/fanfare.ts'),
  ]);
  const ox = layout.ORIGIN.x;
  const rings = hookRings(tech.PADS, tech.ringAt, ox);
  const ringById = new Map(rings.map((r) => [r.id, r]));
  const geometries: THREE.BufferGeometry[] = [];
  const partMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
  const glow = readableGlow(
    new THREE.MeshStandardNodeMaterial({
      color: '#39e6c6',
      emissive: '#39e6c6',
      emissiveIntensity: 1.8,
      roughness: 0.3,
    }),
  );
  const ringMat = new THREE.MeshStandardNodeMaterial({ color: '#ffffff', roughness: 0.4 });
  const haloMat = readableUnlit(
    new THREE.MeshBasicNodeMaterial({ color: '#e8fffa', transparent: true, opacity: 0.95 }),
  );
  function add<T extends THREE.Mesh>(m: T) {
    geometries.push(m.geometry);
    owner.add(m);
    return m;
  }
  for (const { pad: p } of rings.slice(1)) {
    const thick = p.look === 'wood' ? 0.4 : 0.9;
    const parts: Parameters<typeof shapes.merged>[0] = [
      ['b', 0, -0.08, 0, p.hx * 2, thick - 0.16, p.hz * 2, '#917b5e'],
      ['b', 0, thick / 2 - 0.08, 0, p.hx * 2, 0.16, p.hz * 2, '#c6b28d'],
      ['b', 0, -thick / 2 + 0.06, 0, p.hx * 2 + 0.04, 0.12, p.hz * 2 + 0.04, '#6f604b'],
    ];
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        parts.push(['b', sx * (p.hx - 0.34), -0.02, sz * p.hz, 0.18, thick - 0.24, 0.045, '#c79a3e']);
    const slab = add(
      p.look === 'wood'
        ? new THREE.Mesh(new THREE.BoxGeometry(p.hx * 2, thick, p.hz * 2), flatMod.flat('#8a6238', 0.9))
        : new THREE.Mesh(shapes.merged(parts), partMat),
    );
    slab.position.set(p.x + ox, p.top - thick / 2, p.z);
    slab.castShadow = slab.receiveShadow = true;
    const tiles: Shape[] = [];
    const nx = Math.ceil(p.hx / 0.75),
      nz = Math.ceil(p.hz / 0.75),
      hx = p.hx / nx,
      hz = p.hz / nz;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        tiles.push({
          kind: 'box',
          hx,
          hy: thick / 2,
          hz,
          offset: { x: p.x + ox - p.hx + hx * (i * 2 + 1), y: p.top - thick / 2, z: p.z - p.hz + hz * (j * 2 + 1) },
        });
    land.addStatics(tiles, { x: 0, y: 0, z: 0 }, owner);
    if (p.look === 'float') {
      const under = add(new THREE.Mesh(new THREE.BoxGeometry(p.hx * 0.7, 0.1, p.hz * 0.7), glow));
      under.position.set(p.x + ox, p.top - thick - 0.04, p.z);
    }
  }
  const ringMesh = add(new THREE.InstancedMesh(new THREE.TorusGeometry(0.55, 0.09, 8, 22), ringMat, rings.length + 1));
  const climbRings = rings.length;
  const posts = add(
    new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1, 0.22), flatMod.flat('#917b5e', 0.9), climbRings),
  );
  const halo = add(new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 6, 28), haloMat));
  halo.visible = false;
  ringMesh.frustumCulled = posts.frustumCulled = false;
  posts.castShadow = true;
  const pose = new THREE.Object3D();
  rings.forEach((r, k) => {
    const height = r.at.y - 0.55 - r.pad.top;
    pose.position.set(r.at.x, (r.at.y - 0.55 + r.pad.top) / 2, r.at.z);
    pose.scale.set(1, height, 1);
    pose.updateMatrix();
    posts.setMatrixAt(k, pose.matrix);
    land.addStatic({ kind: 'box', hx: 0.11, hy: height / 2, hz: 0.11 }, pose.position, undefined, undefined, owner);
  });
  const dim = new THREE.Color('#c79a3e'),
    near = new THREE.Color('#39e6c6'),
    hot = new THREE.Color('#d6fff5'),
    color = new THREE.Color();
  // Allocate instanceColor before the first material compilation; later updates change its contents.
  for (let k = 0; k <= climbRings; k++) ringMesh.setColorAt(k, dim);
  ringMesh.count = rings.length;
  /** Ring Island's ring (ring-island-build1, R4b): on a sea pile 276 m out, its pad the railhead platform's gold square. It
   * joins the rings once the gap is footed (set === 14), and leaves them if the room is rewound. */
  const island: HookRing = (() => {
    const pad = {
      id: 'island',
      x: RING_HOOK.pad.x / 100,
      z: RING_HOOK.pad.z / 100,
      top: RING_HOOK.pad.y / 100,
      hx: 1.2,
      hz: 1.2,
      look: 'wood',
    } as const;
    return {
      id: 'island',
      pad: { ...pad },
      at: { x: RING_HOOK.x / 100, y: RING_HOOK.y / 100, z: RING_HOOK.z / 100 },
      land: { x: pad.x, y: pad.top + 0.45 + 0.2, z: pad.z },
    };
  })();
  function setIslandRing(on: boolean) {
    if (on === ringById.has('island')) return;
    if (on) {
      rings.push(island);
      ringById.set('island', island);
    } else {
      rings.splice(rings.indexOf(island), 1);
      ringById.delete('island');
    }
    ringMesh.count = rings.length;
  }
  const camAt = new THREE.Vector3();
  // Where the island's ring faces while it sleeps: out over the gap, to the folk's brace platform it brings you home from.
  const islandFaces = new THREE.Vector3();
  {
    const B = RING_BRACE_PLATFORM;
    const brace = line2World(RING_S + (B.u0 + B.u1) / 200, (B.lat0 + B.lat1) / 200, { x: 0, z: 0 });
    islandFaces.set(brace.x, B.y / 100 + 1, brace.z);
  }
  const cableMat = readableGlow(
    new THREE.MeshStandardNodeMaterial({ color: '#2b2a33', emissive: '#39e6c6', emissiveIntensity: 0.5 }),
  );
  const cableGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5).translate(0, 0.5, 0);
  geometries.push(cableGeo);
  type Cable = { m: THREE.Mesh; t: number; last: THREE.Vector3 };
  function makeCable(): Cable {
    const m = new THREE.Mesh(cableGeo, cableMat);
    m.visible = false;
    m.frustumCulled = false;
    owner.add(m);
    return { m, t: 0, last: new THREE.Vector3() };
  }
  const cable = makeCable(),
    hand = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);
  function drawCable(c: Cable, from: THREE.Vector3, to: THREE.Vector3 | null, dt: number) {
    c.t = to ? Math.min(1, c.t + dt / 0.07) : Math.max(0, c.t - dt / 0.11);
    c.m.visible = c.t > 0;
    if (!c.m.visible) return;
    if (to) c.last.copy(to);
    direction.subVectors(c.last, from);
    const len = direction.length();
    c.m.position.copy(from);
    c.m.quaternion.setFromUnitVectors(up, direction.divideScalar(len || 1));
    c.m.scale.set(1, len * c.t, 1);
  }
  function handAt(root: THREE.Object3D | null | undefined, out: THREE.Vector3) {
    const h = root?.getObjectByName('hand_r');
    if (h) h.getWorldPosition(out);
    else if (root) {
      root.getWorldPosition(out);
      out.y += 0.6;
    } else {
      const p = me.body?.interpolatedPosition;
      out.set(p?.x ?? 0, (p?.y ?? 0) + 0.6, p?.z ?? 0);
    }
  }
  const flick = new THREE.Vector3(),
    targetAt = new THREE.Vector3();
  let flickLeft = 0,
    blinkUntil = 0;
  function fire(ring: HookRing) {
    flickLeft = 0;
    targetAt.set(ring.at.x, ring.at.y, ring.at.z);
    placeSound('hookFire', me.body!.position.x, me.body!.position.z);
    if (me.avatar) gear.armToRing(me.avatar, targetAt, 0.9);
    handAt(me.avatar, hand);
    drawCable(cable, hand, targetAt, 1 / 60);
  }
  function end() {
    const p = me.body?.position;
    if (p) placeSound('hookLatch', p.x, p.z);
  }
  function deny() {
    sounds.pop(0, 0.25);
    handAt(me.avatar, hand);
    camForward(flick);
    flick.multiplyScalar(1.5).add(hand);
    flickLeft = 0.07;
    blinkUntil = performance.now() + 200;
    drawCable(cable, hand, flick, 1 / 60);
  }
  const chip = document.createElement('div');
  chip.className = 'place-key';
  (document.querySelector('.hud') ?? document.body).append(chip);
  const onScreen = new THREE.Vector3();
  let chipOn = false;
  const others = new Map<string, { remote: Remote; cable: Cable; ring: HookRing | null }>();
  const remoteView: RemoteView = {
    presence(remote, value) {
      const ring = typeof value === 'string' ? (ringById.get(value) ?? null) : null;
      let other = others.get(remote.peer);
      if (!other && ring) {
        other = { remote, cable: makeCable(), ring };
        others.set(remote.peer, other);
      }
      if (other) other.ring = ring;
    },
    removed(peer) {
      others.get(peer)?.cable.m.removeFromParent();
      others.delete(peer);
    },
  };
  activeRemote = remoteView;
  const theirHand = new THREE.Vector3(),
    theirTarget = new THREE.Vector3();
  function update(
    dt: number,
    now: number,
    owned = false,
    pick: HookRing | null = null,
    pull: HookRing | null = null,
    range: Set<HookRing> = new Set(),
    pulls = 0,
    /** A ring that cannot help from where you stand (the island's, from the deck it lands on): gold and small, as
     * before the hook, and turned to the far side it serves rather than to you. */
    asleep: HookRing | null = null,
  ) {
    camera.getWorldPosition(camAt);
    rings.forEach((r, k) => {
      const bright = r === pick || r === pull || (now < blinkUntil && range.has(r)),
        inRange = range.has(r);
      pose.position.set(r.at.x, r.at.y, r.at.z);
      if (r === asleep) pose.lookAt(islandFaces);
      else pose.lookAt(camAt);
      pose.scale.setScalar(bright ? 1.18 + Math.sin(now * 0.012) * 0.05 : inRange ? 1.05 : 0.92);
      pose.updateMatrix();
      ringMesh.setMatrixAt(k, pose.matrix);
      ringMesh.setColorAt(
        k,
        color.copy(bright ? hot : r === asleep ? dim : inRange || owned ? near : dim).multiplyScalar(bright ? 1.6 : inRange ? 1.2 : 0.75),
      );
    });
    ringMesh.instanceMatrix.needsUpdate = true;
    if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;
    const target = pull ?? pick;
    halo.visible = !!target;
    if (target) {
      halo.position.set(target.at.x, target.at.y, target.at.z);
      halo.lookAt(camAt);
      halo.scale.setScalar(1 + Math.sin(now * 0.01) * 0.06);
    }
    let cableTo: THREE.Vector3 | null = null;
    if (pull) {
      cableTo = targetAt.set(pull.at.x, pull.at.y, pull.at.z);
      if (me.avatar) gear.armToRing(me.avatar, cableTo, 0.9);
    } else if (flickLeft > 0) {
      cableTo = flick;
      flickLeft = Math.max(0, flickLeft - dt);
    }
    handAt(me.avatar, hand);
    drawCable(cable, hand, cableTo, dt);
    for (const other of others.values()) {
      const root = other.remote.avatar;
      if (!root || !other.remote.entered || !other.remote.visible) {
        other.cable.m.visible = false;
        other.cable.t = 0;
        continue;
      }
      const to = other.ring ? theirTarget.set(other.ring.at.x, other.ring.at.y, other.ring.at.z) : null;
      if (to) gear.armToRing(root, to, 0.9);
      handAt(root, theirHand);
      drawCable(other.cable, theirHand, to, dt);
    }
    chipOn = !!pick && !pull && pulls < 3 && !document.body.classList.contains('touch');
    chip.classList.toggle('on', chipOn);
    if (chipOn && pick) {
      const html = glyph('hook');
      if (chip.innerHTML !== html) chip.innerHTML = html;
      onScreen.set(pick.at.x, pick.at.y, pick.at.z).project(camera);
      chip.style.transform = `translate(calc(${((onScreen.x + 1) / 2) * innerWidth}px - 50%), calc(${((1 - onScreen.y) / 2) * innerHeight}px - 50%))`;
    }
  }
  owner.cleanup(() => {
    if (activeRemote === remoteView) activeRemote = null;
    for (const other of others.values()) other.cable.m.removeFromParent();
    others.clear();
    for (const g of geometries) g.dispose();
    for (const m of [partMat, glow, ringMat, haloMat, cableMat]) m.dispose();
    chip.remove();
  });
  return {
    rings,
    ringById,
    setIslandRing,
    update,
    fire,
    end,
    deny,
    remoteCables: () => [...others.values()].filter((o) => o.cable.m.visible).length,
    chip: () => chipOn,
  };
}
