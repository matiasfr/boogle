import { Vector3 } from 'three';
import { townGreeting } from './greeting.ts';
import { cheerAround } from '../../place/folk.ts';
import { cheerSite } from './play.ts';
import { discPath, enters } from './disc-path.ts';
import { createBoathouse } from './boathouse.ts';
import { createBallTargets } from './ball-targets.ts';
import { BALL_R, PLAYER_R } from '../../constants.ts';
import { townChoice, TOWN_PLOTS, townBuilding } from '../../place/town-plan.ts';
import { toWorld } from '../../place/layout.ts';
import { H } from '../../place/terrain.ts';
import { placeSeedStall } from '../../adapters/mushroom-stall.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { standWhenClear } from '../railway/frame-occupied.ts';
import { me } from '../../player/state.ts';
import { remotes } from '../../netplay/net.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { ball } from '../ball/state.ts';
import { railwayWorldRead } from '../railway/state.ts';
import { Plot } from '../../sim/railway-components.ts';
import { PLOT_KIND } from '../../sim/railway-trade-layout.ts';
import { honkNotes } from '../../sim/social.ts';
import { honkSound, chordSound } from '../../features/honk.ts';
import { farGain } from '../../render/boing.ts';
import { splash } from '../../render/splash.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { createOwnedView } from '../../render/owned-view.ts';

defineKind('town-hangout', { update: 12 });
export function spawnHangout(k: number, plotDone: (k: number) => boolean) {
  const owner = createOwnedView();
  const yaw = townBuilding(TOWN_PLOTS.order[k]!).yaw;
  const layout = townChoice(k);
  function completedKind() {
    const w = railwayWorldRead()?.world();
    const id = w?.lookup(Plot, k);
    return plotDone(k) && id !== undefined ? (w?.get(Plot, id)?.kind ?? 0) : 0;
  }
  if (k === 3) {
    const activity = createBallTargets(owner, layout.stall, yaw);
    return spawn({
      kind: 'town-hangout',
      mesh: owner.root,
      dispose: owner.dispose,
      describe: activity.describe,
      targets: () => [],
      update: ({ now }) => activity.update(completedKind(), now),
    });
  }
  const cheer = cheerSite(cheerAround);
  const sweep = discPath(owner);
  const { stall } = layout;
  const sx = toWorld(stall.x);
  const seeds = placeSeedStall(owner, {
    prefab: 'mushrooms.stall',
    id: k === 0 ? 'town.seed-stall' : 'town.spare-seed-stall',
    pos: [sx, H(sx, stall.z), stall.z],
    rot: [yaw, 0, 0],
  });
  const pads = layout.pads.map((point, i) => {
    const x = toWorld(point.x),
      z = point.z,
      y = H(x, z);
    const record = instantiate(
      'town.horn-pad',
      {
        prefab: 'town.horn-pad',
        id: k === 0 ? `town.horn-pad.${i}` : `town.spare-horn-pad.${i}`,
        pos: [x, y, z],
        rot: [yaw, 0, 0],
      },
      { owner },
    );
    return {
      record,
      x,
      y,
      z,
      centre: new Vector3(x, y + 0.16, z),
      last: -Infinity,
      occupants: new Set<string>(),
      next: new Set<string>(),
    };
  });
  const porch = k === 2 ? createBoathouse(owner, new Vector3(sx, H(sx, stall.z), stall.z), yaw) : null;
  let shown = 0;
  const first = pads[0]!;
  const greet = townGreeting(
    owner,
    0,
    first,
    () => shown === PLOT_KIND.horns,
    () => {
      chordSound(honkNotes(0, sharedSeconds(), 0), farGain(first.x, first.z, 80 ** 2) * 0.08);
      splash(first.x + 1, first.z, 0.22, first.y + 2.2);
    },
  );
  return spawn({
    kind: 'town-hangout',
    mesh: owner.root,
    dispose: owner.dispose,
    describe: () => ({
      kind: shown,
      stall: seeds.root.visible,
      pads: pads.map((p) => ({ visible: p.record.root.visible, last: p.last })),
    }),
    targets: () => (shown === PLOT_KIND.disc ? (porch?.targets() ?? []) : seeds.targets()),
    update({ now, dt }) {
      greet(now);
      const kind = completedKind();
      porch?.update(kind === PLOT_KIND.disc, now, dt);
      if (kind !== shown) {
        if (kind === PLOT_KIND.seeds && !standWhenClear(seeds.solids, () => seeds.setEnabled(true))) return;
        if (kind !== PLOT_KIND.seeds) seeds.setEnabled(false);
        for (const pad of pads) {
          pad.record.setEnabled(kind === PLOT_KIND.horns);
          pad.last = -Infinity;
          pad.occupants.clear();
        }
        shown = kind;
      }
      const path = sweep(now);
      if (shown !== PLOT_KIND.horns) return;
      for (const [i, pad] of pads.entries()) {
        let onset = enters(path, pad.centre, 0.55);
        pad.next.clear();
        const visit = (key: string, p: { x: number; y: number; z: number }, radius: number) => {
          if (Math.hypot(p.x - pad.x, p.z - pad.z) <= 0.55 && Math.abs(p.y - radius - pad.y - 0.12) <= 0.4) {
            pad.next.add(key);
            if (!pad.occupants.has(key)) onset = true;
          }
        };
        if (me.entered && me.body) visit('self', me.body.position, PLAYER_R);
        for (const [peer, remote] of remotes)
          if (remote.entered && remote.avatar) visit('peer.' + peer, remote.avatar.position, PLAYER_R);
        if (!ball.held) visit('ball', ball.pose.p, BALL_R);
        const previous = pad.occupants;
        pad.occupants = pad.next;
        pad.next = previous;
        if (!onset || now - pad.last < 600) continue;
        pad.last = now;
        const seconds = sharedSeconds(),
          vol = farGain(pad.x, pad.z, 500) * 0.16;
        honkSound(honkNotes(i, seconds, 0)[0], vol);
        const chord = pads.every((p) => now - p.last <= 1000);
        if (chord) {
          cheer(now, pad.x, pad.z);
          chordSound(
            pads.map((_, j) => honkNotes(j, seconds, 0)[0]),
            vol,
          );
        }
        splash(pad.x + 1, pad.z, chord ? 0.45 : 0.12, pad.y + 2.2);
      }
    },
  });
}
