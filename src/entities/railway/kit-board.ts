// The kit's number, in three places (docs/plans/greybox-route.md, leg 1 step 4b; the step 4 design review's answer
// j: "why a kit train passes the rack"): each kit car carries a board with the number of the section its kit is
// for (`S` for the steel works' kit), and each frame's sign and rack plate carry the same number at the same size
// (paintPlate's badge). A train whose board does not match the rack's plate runs past it. Local views of accepted
// state: the number is worked out from the rows each frame, never kept. Greybox, placeholder marks (not The
// Boogler's); the kit's flight from the car to the rack is train-view.ts's, counted here so the rack's view
// (route-greybox/leg-view.ts) draws a unit only once it has landed.
import type * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { signBoard, type SignBoard } from '../../render/sign-board.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import { LINE_SLOTS } from '../../sim/railway-trains.ts';
import { TRAIN_PHASE, trainAlong } from '../../sim/railway-train.ts';
import { RAIL_LEGS } from '../../sim/railway-route.ts';
import { trainStops } from '../../sim/railway-queries-trains.ts';
import { legKitStop, legRow, openLeg } from '../../sim/railway-queries-route.ts';
import { aperture, rail, train, type ReadWorld } from '../../sim/railway-rows.ts';

export const PLATE_LOOK = { ground: '#fff3d6', ink: '#2a1c10' };
/** The steel works' kit's mark, on its car's board and its yard's plate. */
export const STEEL_MARK = 'S';
/** A plate's badge: this much of the face's height wide, tall, and its mark's size. A kit car's board is one badge,
 * at the plates' metres (KIT_BOARD), so the number is the same size on the car, the rack and the frame's sign. */
const BADGE = { w: 0.5, h: 0.72, mark: 0.56 };
const PLATE_H = 0.8;
const KIT_BOARD = { w: BADGE.w * PLATE_H + 0.1, h: BADGE.h * PLATE_H + 0.06, mark: BADGE.mark * PLATE_H };

/** A sign's lines, largest first where `size` says so (fractions of the face's height), with the kit's mark in a
 * dark square at the left when `badge` is given. */
export function paintPlate(
  sign: Pick<SignBoard, 'g' | 'cw' | 'ch' | 'painted'>,
  lines: readonly { t: string; size: number }[],
  badge = '',
) {
  const { g, cw, ch } = sign;
  g.clearRect(0, 0, cw, ch);
  g.fillStyle = PLATE_LOOK.ground;
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = PLATE_LOOK.ink;
  g.lineWidth = ch * 0.03;
  g.strokeRect(ch * 0.03, ch * 0.03, cw - ch * 0.06, ch - ch * 0.06);
  g.fillStyle = PLATE_LOOK.ink;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  const left = badge ? ch * 0.62 : 0;
  if (badge) {
    g.fillRect(ch * 0.1, ch * 0.14, ch * BADGE.w, ch * BADGE.h);
    g.fillStyle = PLATE_LOOK.ground;
    g.font = `900 ${ch * BADGE.mark}px Figtree, system-ui, sans-serif`;
    g.fillText(badge, ch * 0.35, ch * 0.53);
    g.fillStyle = PLATE_LOOK.ink;
  }
  const total = lines.reduce((n, l) => n + l.size * 1.25, 0);
  let y = (ch * (1 - total)) / 2;
  for (const l of lines) {
    g.font = `900 ${ch * l.size}px Figtree, system-ui, sans-serif`;
    y += ch * l.size * 0.625;
    g.fillText(l.t, left + (cw - left) / 2, y, (cw - left) * 0.88);
    y += ch * l.size * 0.625;
  }
  sign.painted();
}

/** Each line 2 train's kit mark by RAIL_TRAINS slot, from the rows alone (a reload and a late joiner read the same):
 * none before the rivet, in the shed or with no logs or rails aboard; `S` for the steel works' kit (cargo that is not
 * a leg's: `Train.legKit` unset); else the number of the section its leg kit is for. The open leg's sections are
 * filled in order: first by what is fed, on the rack and lifted onto backs, then by each carrier in the order it
 * will reach the rack (a train outbound is ahead of one homeward). A carrier's number is the first section its
 * logs or rails still fill, so the train whose number is the rack's plate's is the one that will unload there.
 * Kit no section lacks (it goes home at the Village) carries no mark. */
export function kitMarks(w: ReadWorld, tick: number): Map<number, string> {
  const out = new Map<number, string>();
  if (aperture(w).joined < 0) return out;
  const k = openLeg(w, LINE2),
    carriers: { slot: number; logs: number; rails: number; eta: number }[] = [];
  const rackS = k < 0 ? 0 : (trainStops(w, LINE2)[legKitStop(w, k)] ?? 0);
  for (const slot of LINE_SLOTS[LINE2]!) {
    const t = train(w, slot);
    if (t.phase === TRAIN_PHASE.SHED || t.logs + t.rails <= 0) continue;
    if (!t.legKit) {
      out.set(slot, STEEL_MARK);
      continue;
    }
    const along = trainAlong(t, LINE2, tick);
    carriers.push({ slot, logs: t.logs, rails: t.rails, eta: t.track ? along + rackS : Math.max(0, rackS - along) });
  }
  if (k < 0 || !carriers.length) return out;
  const row = legRow(w, k),
    stock = rail(w),
    lack = RAIL_LEGS[k]!.sections.map((s, j) =>
      j < row.laid ? { logs: 0, rails: 0 } : { logs: s.logs, rails: s.rails },
    );
  /** Takes `n` units of `key` off the sections' lack from section `from` on. */
  const fill = (key: 'logs' | 'rails', n: number, from: number) => {
    for (let j = from; j < lack.length && n > 0; j++) {
      const d = Math.min(n, lack[j]![key]);
      lack[j]![key] -= d;
      n -= d;
    }
  };
  fill('logs', row.logs + stock.depot + row.heldLogs, row.laid);
  fill('rails', row.rails + stock.depotRails + row.heldRails, row.laid);
  carriers.sort((a, b) => a.eta - b.eta || a.slot - b.slot);
  for (const c of carriers) {
    const j = lack.findIndex((l) => (c.logs > 0 && l.logs > 0) || (c.rails > 0 && l.rails > 0));
    if (j < 0) continue;
    out.set(c.slot, String(j + 1));
    fill('logs', c.logs, j);
    fill('rails', c.rails, j);
  }
  return out;
}

/** A kit car's board: one badge on a post at the car's rear end, over the load, its two faces to the platforms
 * either side. `parent` is the car's frame (origin on the rails, z along the car), `top` its deck. Hidden until
 * `set` gives it a mark. */
export function createKitBoard(owner: OwnedView, parent: THREE.Object3D, top: number, hz: number) {
  const px = 128;
  const sign = signBoard(owner, { w: KIT_BOARD.w, h: KIT_BOARD.h, px, foot: 1.5, posts: 'one', wood: '#5d6063' });
  sign.mesh.name = 'railway:kit-board';
  sign.mesh.position.set(0, top, -hz + 0.12);
  sign.mesh.rotation.y = Math.PI / 2;
  sign.mesh.visible = false;
  parent.add(sign.mesh);
  owner.cleanup(() => sign.mesh.removeFromParent());
  let shown = '';
  return {
    /** The mark it shows ('' for none). */
    mark: () => shown,
    set(mark: string) {
      if (mark === shown) return;
      shown = mark;
      sign.mesh.visible = !!mark;
      if (!mark) return;
      const { g, cw, ch } = sign;
      g.fillStyle = PLATE_LOOK.ink;
      g.fillRect(0, 0, cw, ch);
      g.fillStyle = PLATE_LOOK.ground;
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      g.font = `900 ${(ch * KIT_BOARD.mark) / KIT_BOARD.h}px Figtree, system-ui, sans-serif`;
      g.fillText(mark, cw / 2, ch * 0.54);
      sign.painted();
    },
  };
}

/** The leg kit in the air between a car and its rack (train-view.ts counts it up as a train unloads and down as
 * each crate lands; the rack's view draws its accepted count less this). Local presentation, cleared on a restore. */
export const legKitFlight = { logs: 0, rails: 0 };
