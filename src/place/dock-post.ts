// West landing's station board, eight metres ahead along the landing's facing.
import { worksBoardRows } from '../entities/railway/works-board-state.ts';
import { worksFace } from '../entities/railway/works-board.ts';
import { frameHasRemote } from '../entities/railway/frame-occupied.ts';
import { instantiate, liftOrWait } from '../prefab/instantiate.ts';
import { me } from '../player/player.ts';
import type { OwnedView } from '../render/owned-view.ts';
import { H } from './terrain.ts';
import { addFoot } from './sites.ts';
import { DOCK_BOARD } from './shore-layout.ts';

export function createDockPost(owner: OwnedView) {
  const { x, z, yaw } = DOCK_BOARD;
  const y = H(x, z);
  const board = worksFace(owner, { x, y, z }, yaw, true);
  board.visible = false;
  const key = 'railway.dock-post-solid';
  const solid = instantiate(key, { id: 'dock:works-post', prefab: key, pos: [x, y, z], rot: [yaw, 0, 0] }, { owner });
  const clearance = liftOrWait(
    [
      {
        shapes: solid.solids,
        on() {
          solid.setEnabled(true);
          addFoot(x, z, yaw, 1.66, 0.04, owner);
          board.visible = true;
        },
      },
    ],
    me.body,
    { lift: true, visitor: frameHasRemote },
  );
  return { retry: () => clearance.retry(me.body), rows: () => worksBoardRows(board.position) };
}
