import { BALL_R, PLAYER_R } from '../../constants.ts';
import { TOWN_CHOICE, townBuilding } from '../../place/town-plan.ts';
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
export function spawnHangout(firstHouseDone: () => boolean) {
  const owner = createOwnedView();
  const yaw = townBuilding('plot3').yaw;
  const { stall } = TOWN_CHOICE;
  const sx = toWorld(stall.x);
  const seeds = placeSeedStall(owner, {
    prefab: 'mushrooms.stall',
    id: 'town.seed-stall',
    pos: [sx, H(sx, stall.z), stall.z],
    rot: [yaw, 0, 0],
  });
  const pads = TOWN_CHOICE.pads.map((point, i) => {
    const x = toWorld(point.x),
      z = point.z,
      y = H(x, z);
    const record = instantiate(
      'town.horn-pad',
      {
        prefab: 'town.horn-pad',
        id: `town.horn-pad.${i}`,
        pos: [x, y, z],
        rot: [yaw, 0, 0],
      },
      { owner },
    );
    return { record, x, y, z, last: -Infinity, occupants: new Set<string>(), next: new Set<string>() };
  });
  let shown = 0;
  return spawn({
    kind: 'town-hangout',
    mesh: owner.root,
    dispose: owner.dispose,
    describe: () => ({
      kind: shown,
      stall: seeds.root.visible,
      pads: pads.map((p) => ({ visible: p.record.root.visible, last: p.last })),
    }),
    targets: seeds.targets,
    update({ now }) {
      const done = firstHouseDone();
      const w = railwayWorldRead()?.world(),
        id = w?.lookup(Plot, 0);
      const kind = done && id !== undefined ? (w?.get(Plot, id)?.kind ?? 0) : 0;
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
      if (shown !== PLOT_KIND.horns) return;
      for (const [i, pad] of pads.entries()) {
        let onset = false;
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
        if (chord)
          chordSound(
            pads.map((_, j) => honkNotes(j, seconds, 0)[0]),
            vol,
          );
        splash(pad.x + 1, pad.z, chord ? 0.45 : 0.12, pad.y + 2.2);
      }
    },
  });
}
