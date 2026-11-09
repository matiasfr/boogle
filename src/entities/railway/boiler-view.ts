// Local boiler dress over the server's unique cargo row. No predicted pickup or restore effects.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body } from '../../physics/engine.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { bindBigDrop } from '../../player/cargo-drop.ts';
import { backSeam } from '../../player/haul-back.ts';
import { heldId } from '../../player/inventory.ts';
import { thump, clank } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { LINE2_BOILER, LINE2_OLD_TRAIN } from '../../sim/railway-line2-layout.ts';
import { createForgeCall } from './forge-call.ts';

type Deps = {
  land: typeof import('../../proto/place/land.ts');
  props: typeof import('../../proto/place/prop-kit.ts');
  carry: typeof import('../../proto/place/carry-models.ts');
  sounds: typeof import('../../proto/minis/common.ts');
  pieces: typeof import('../../proto/place/pieces.ts');
};

/** `chimney`: the top of the forge's chimney, where the call's plume rises (line2-view.ts owns the forge). */
export function createRailwayBoiler(
  adapter: RailwayAdapter,
  owner: OwnedView,
  { land, props, carry, pieces }: Deps,
  chimney: { x: number; y: number; z: number },
) {
  const pedestal = props.makeProp('pedestal');
  const loose = carry.makeBoiler(); // boilerShape's safe factory, without chop.ts's campaign owner
  const worn = carry.makeCarryModels();
  const bx = LINE2_BOILER.x / 100,
    by = LINE2_BOILER.y / 100,
    bz = LINE2_BOILER.z / 100;
  const saddle = new THREE.Vector3(
    // The camp track is straight east: B's loco is +3.7 m, its receiver another +0.5 m.
    LINE2_OLD_TRAIN.x / 100 + 4.2,
    land.H(LINE2_OLD_TRAIN.x / 100, LINE2_OLD_TRAIN.z / 100) + 1.8,
    LINE2_OLD_TRAIN.z / 100,
  );
  pedestal.position.set(bx, by + 0.3, bz);
  owner.add(pedestal, loose, worn.root);
  // The forge's call while the boiler waits; Split-rock's breaker uses the same one (forge-call.ts). Its plume rises
  // from the forge's chimney, not the boiler: a boiler steaming on its pedestal reads as an engine already running
  // (owner, 9 November). The boiler first steams once it's fitted to the old train. The call starts 2 m above `at`.
  const call = createForgeCall({ x: chimney.x, y: chimney.y - 2, z: chimney.z }, owner);
  let body: Body | null = null;
  let mote = 0,
    side = 1;
  const gold = new THREE.Color('#ffdc7a');
  const priorCarry = backSeam.carry;
  const carryReadout =
    priorCarry &&
    (() => {
      const load = priorCarry();
      const s = adapter.inspect(),
        b = s.line2?.boiler;
      return b?.state === 'held' && b.holder === s.pid ? { ...load, big: 'boiler' as const } : load;
    });
  // Keep the existing readout's counts/landing semantics; only supply the unique held object.
  if (carryReadout) backSeam.carry = carryReadout;
  function drop() {
    const s = adapter.inspect(),
      b = s.line2?.boiler;
    if (!b || b.state !== 'held' || b.holder !== s.pid || !me.body) return false;
    const p = me.body.interpolatedPosition;
    const x = p.x - Math.sin(me.yaw) * 2.7,
      z = p.z - Math.cos(me.yaw) * 2.7;
    adapter.dropBoiler(Math.round(x * 100), Math.round(land.H(x, z) * 100), Math.round(z * 100), b.revision);
    return true; // consume the input even if this request is temporarily refused
  }
  owner.cleanup(bindBigDrop(drop));
  owner.cleanup(() => {
    if (backSeam.carry === carryReadout) backSeam.carry = priorCarry;
    document.body.classList.remove('place-has-load');
    worn.root.removeFromParent();
    for (const root of [pedestal, loose, worn.root])
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
        }
      });
  });
  function update(dt: number) {
    const s = adapter.inspect(),
      b = s.line2?.boiler;
    const cast = !!b && b.state !== 'none';
    pedestal.visible = cast;
    if (cast && !body)
      body = land.addStatic(
        { kind: 'cylinder', rTop: 1.15, rBottom: 1.3, h: 0.6, segments: 8 },
        pedestal.position,
        undefined,
        undefined,
        owner,
      );
    else if (!cast && body) {
      owner.removeBody(body);
      body = null;
    }
    loose.visible = b?.state === 'pedestal' || b?.state === 'ground';
    if (b) loose.position.set(b.x / 100, b.y / 100 + (b.state === 'pedestal' ? 1.15 : 0.55), b.z / 100);
    const avatar =
      b?.state === 'held'
        ? b.holder === s.pid
          ? me.avatar
          : ([...remotes.values()].find((r) => r.pid === b.holder && r.entered)?.avatar ?? null)
        : null;
    const frame = avatar?.userData.loadFit?.frame ?? avatar?.userData.inner;
    worn.root.visible = !!frame;
    if (frame && worn.root.parent !== frame) frame.add(worn.root);
    worn.setCargo('boiler', frame ? 1 : 0, !!s.line2?.pack);
    document.body.classList.toggle(
      'place-has-load',
      (b?.state === 'held' && b.holder === s.pid) ||
        (s.beam?.state === 'held' && s.beam.holder === s.pid) ||
        s.carry + s.railsCarry + s.stoneCarry > 0,
    );
    call.update(dt, b?.state === 'pedestal');
    mote -= dt;
    if (b?.state === 'pedestal' && mote <= 0) {
      mote = 0.8;
      side *= -1;
      emit({
        x: bx + side * 0.42,
        y: by + 1.55,
        z: bz + side * 0.5,
        vx: side * 0.025,
        vy: 0.14,
        vz: 0,
        life: 1.1,
        size: 0.055,
        color: gold,
        intensity: readableIntensity() * 1.4,
        alpha: 0.75,
        grow: [0.6, 1],
        shrink: 0.5,
        fade: 0.7,
      });
    }
  }
  return {
    update,
    restore() {
      // Rebuild silently; the continuous pedestal invitation resumes on a later frame.
      mote = 0.8;
      call.restore(adapter.inspect().line2?.boiler.state === 'pedestal');
      update(0);
    },
    drop,
    accepted(e: RailwayAccepted) {
      if (e.op === 'rail.boilerTake') {
        thump(bx, bz);
        pieces.dustRing(bx, by + 0.6, bz, 8, 1.5, 0.25);
      }
      if (e.op === 'rail.boilerFit') clank(saddle.x, saddle.z);
    },
    corrected() {
      /* Server cargo is not predicted. */
    },
    targets(): Interactable[] {
      const s = adapter.inspect(),
        b = s.line2?.boiler,
        p = me.body?.position;
      if (!s.ready || !b || !p) return [];
      if ((b.state === 'pedestal' || b.state === 'ground') && Math.hypot(p.x - b.x / 100, p.z - b.z / 100) <= 3.6) {
        const at = new THREE.Vector3(b.x / 100, b.y / 100 + 2, b.z / 100);
        // It takes rail.boilerTake's empty back (no load, footing or beam) and, like the beam, empty hands.
        // Say so rather than offer nothing: a back still loaded from station 5 is common here (the forge rack 4.5 m
        // off offers no rails before trains, but logs or rails carried from elsewhere still block the take).
        const free = !s.carry && !s.railsCarry && !s.stoneCarry && !s.foot && s.beam?.holder !== s.pid && !heldId();
        // `r`, the pedestal's radius: measured to its edge, so a log pile dropped against it doesn't win the prompt.
        const target = { id: 'railway-boiler', verb: 'Shoulder the boiler', at, r: 1.3 };
        return [
          free
            ? { ...target, run: () => void adapter.shoulderBoiler(b.revision) }
            : { ...target, blocked: 'Empty your back first' },
        ];
      }
      if (
        b.state === 'held' &&
        b.holder === s.pid &&
        Math.hypot(p.x - LINE2_OLD_TRAIN.x / 100, p.z - LINE2_OLD_TRAIN.z / 100) <= 7
      )
        return [
          {
            id: 'railway-boiler-fit',
            verb: 'Fit the boiler',
            at: saddle,
            run: () => void adapter.fitBoiler(b.revision),
          },
        ];
      return [];
    },
    inspect: () => {
      const s = adapter.inspect(),
        b = s.line2.boiler;
      return {
        boiler: {
          ...b,
          x: b.x / 100,
          y: b.y / 100,
          z: b.z / 100,
          mine: b.state === 'held' && b.holder === s.pid,
          pedestal: pedestal.visible,
          worn: worn.root.visible,
          saddle: { x: saddle.x, y: saddle.y, z: saddle.z },
        },
      };
    },
  };
}
