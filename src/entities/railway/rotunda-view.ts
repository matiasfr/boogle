// Home's finished rotunda (docs/plans/roundhouse-rotunda.md, steps 4–5): the generated level's pieces, each stood
// round the table from the site's row and shown by stage. Local scenery: a piece reads no fact; the Roundhouse view
// (./roundhouse-view.ts) says which stage to show and owns the working bay's slab, sockets and vehicles.
import type { OwnedView } from '../../render/owned-view.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import level from '../../../content/built/levels/rotunda-home.json' with { type: 'json' };
import { ROTUNDA_HOME } from '../../place/home-station.ts';
import { ORIGIN } from '../../place/layout.ts';
import * as THREE from 'three/webgpu';
import {
  bayOccupants,
  COPY_AT,
  COPY_BAYS,
  ROTUNDA_BLOCK,
  ROTUNDA_KIT,
  rotundaBays,
  rotundaPieces,
  rotundaPose,
  rotundaShows,
} from '../../place/rotunda.ts';
import { HEAD_OFFSET, PLAYER_R } from '../../constants.ts';
import { me } from '../../player/state.ts';
import { ENGINE_WHEELS } from './engine.ts';

type EngineKit = typeof import('./engine-kit.ts');
/** A copy in its bay (garage step 4): its line, and whether it wears the longer barrel and the Strong flatbed. */
export type BayCopy = { line: number; long: boolean; flatbed: boolean };
/** m: feet within this of a copy's solid top are lifted onto it as it switches on (the flatbed's deck is a hop up);
 * anyone deeper in it keeps it off until they are clear. */
const STEP_UP = 0.35;

/** `kit` draws the works copies' engines in their bays (garage step 4); without it the bays hold none. */
export function createRotundaView(owner: OwnedView, kit?: EngineKit) {
  const site = ROTUNDA_HOME;
  const placements = new Map(loadLevelArtifact(level, definitions).placements.map((p) => [p.id, p]));
  const batches = new Map<string, { target: ReturnType<typeof createPrefabBatch>; next: number }>();
  for (const placement of placements.values()) {
    const visual = definitions[placement.prefab]!.visual;
    if (!('builder' in visual) || !visual.batch || batches.has(placement.prefab)) continue;
    const count = [...placements.values()].filter((p) => p.prefab === placement.prefab).length;
    batches.set(placement.prefab, { target: createPrefabBatch(placement.prefab, count, owner), next: 0 });
  }
  const pieces = [
    ...rotundaPieces(site),
    { id: 'open-doors', part: 'door' as const, turn: 0 },
    ...bayOccupants(site, { serving: 1 }).waiting.flatMap((turn) => [
      { id: `waiting-${turn}`, part: 'waiting' as const, turn },
      { id: `open-${turn}`, part: 'open' as const, turn },
    ]),
    ...COPY_BAYS.flatMap(({ bay: turn }) => [
      { id: `copy-${turn}`, part: 'copy' as const, turn },
      { id: `flatbed-${turn}`, part: 'flatbed' as const, turn },
    ]),
  ].map((piece) => {
    const placement = placements.get(`rotunda-${site.id}.${piece.id}`);
    if (!placement) throw new Error(`rotunda: the level has no ${piece.id}; run npm run prefabs`);
    const pose = rotundaPose(site, piece.turn);
    const batch = batches.get(placement.prefab);
    const instance = instantiate(
      placement.prefab,
      { ...placement, pos: [pose.x + ORIGIN.x, pose.y, pose.z], rot: [pose.yaw, 0, 0] },
      { owner, ...(batch ? { batch: { target: batch.target, index: batch.next++ } } : {}) },
    );
    instance.root.updateMatrix();
    return {
      piece,
      instance,
      batch: batch?.target,
      index: batch ? batch.next - 1 : 0,
      rest: instance.root.matrix.clone(),
      enabled: false,
      /** A copy's solid held off while a player stands in it (garage step 4): it switches on once they are clear. */
      held: false,
      colliders: definitions[placement.prefab]!.colliders,
    };
  });
  // Garage step 4: each copy's engine, the same parts the table's copy wears (garage-view.ts), facing the table.
  const engines = new Map<number, { root: THREE.Group; short: THREE.Mesh[]; long: THREE.Mesh[] }>();
  const wheel = new THREE.CylinderGeometry(ENGINE_WHEELS.r, ENGINE_WHEELS.r, 0.12, 16).rotateZ(Math.PI / 2);
  const iron = new THREE.MeshStandardNodeMaterial({ color: '#2c2e34', roughness: 0.55, metalness: 0.5 });
  owner.cleanup(() => {
    wheel.dispose();
    iron.dispose();
  });
  if (kit)
    for (const { bay } of COPY_BAYS) {
      const pose = rotundaPose(site, bay);
      const root = new THREE.Group();
      root.position.set(pose.x + ORIGIN.x, pose.y + 0.24, pose.z);
      root.rotation.y = pose.yaw;
      const engine = new THREE.Group();
      engine.position.z = COPY_AT.engine;
      engine.rotation.y = Math.PI;
      root.add(engine);
      const short = [
        kit.enginePart('engine_body'),
        kit.enginePart('engine_boiler', false),
        kit.enginePart('engine_lashing', false),
      ];
      const long = [
        kit.enginePart('engine_body_long'),
        kit.enginePart('engine_boiler_long', false),
        kit.enginePart('engine_lashing_long', false),
      ];
      const rods = kit.enginePart('engine_rods');
      rods.position.y = ENGINE_WHEELS.throw;
      engine.add(...short, ...long, rods, kit.enginePart('engine_stool'), kit.engineDoor(1), kit.engineDoor(-1));
      for (const x of [-0.5, 0.5])
        for (const z of [-1, 1]) {
          const m = new THREE.Mesh(wheel, iron);
          m.position.set(x, ENGINE_WHEELS.r + 0.15, z * ENGINE_WHEELS.z);
          engine.add(m);
        }
      root.visible = false;
      owner.add(root);
      engines.set(bay, { root, short, long });
    }
  let copies = new Map<number, BayCopy>(),
    copiesKey = '',
    restand = false;
  let shown = -1;
  let serving = -1;
  let occupied = new Set<number>();
  let rising = false;
  const matrix = pieces[0]!.rest.clone();
  const point = owner.root.position.clone();
  function clearPlayer({ instance, colliders }: (typeof pieces)[number]) {
    const body = me.body;
    if (!body) return;
    // As at the halt reveal, test BOTH body spheres against the authored boxes in their own frame. Like the
    // bridge's clearance guard, do this before enabling collision, never let Rapier resolve a new solid through us.
    const root = instance.root;
    root.updateWorldMatrix(true, false);
    const overlaps = colliders.some((box) => {
      if (box.shape !== 'box') return false;
      return [0, HEAD_OFFSET].some((up) => {
        root.worldToLocal(point.set(body.position.x, body.position.y + up, body.position.z));
        const dx = Math.max(0, Math.abs(point.x - box.at[0]) - box.half[0]);
        const dy = Math.max(0, Math.abs(point.y - box.at[1]) - box.half[1]);
        const dz = Math.max(0, Math.abs(point.z - box.at[2]) - box.half[2]);
        return dx * dx + dy * dy + dz * dz < (PLAYER_R - 0.01) ** 2;
      });
    });
    if (!overlaps) return;
    // The flat apron on this road, in front of the door reveal and outside the pit/kerb. Transform its ground too:
    // an elevated owner must not put the player down on the untransformed site's floor.
    root.localToWorld(point.set(0, PLAYER_R + 0.025, ROTUNDA_KIT.doorR - ROTUNDA_BLOCK.reveal - PLAYER_R - 0.1));
    body.position.set(point.x, point.y, point.z);
    body.interpolatedPosition.set(point.x, point.y, point.z);
    body.velocity.set(0, 0, 0);
  }
  const shows = (stage: number, piece: (typeof pieces)[number]['piece']) => {
    if (stage >= 2 && piece.turn === -2 && piece.part === 'open') return true;
    if (stage >= 2 && piece.turn === -2 && piece.part === 'door') return false;
    if (piece.part === 'waiting') return occupied.has(piece.turn);
    if (piece.part === 'copy') return copies.has(piece.turn);
    if (piece.part === 'flatbed') return !!copies.get(piece.turn)?.flatbed;
    const filled = occupied.has(piece.turn) || copies.has(piece.turn);
    if (piece.part === 'open') return filled && rotundaBays(site, stage).includes(piece.turn);
    if (piece.part === 'door' && filled) return false;
    return rotundaShows(site, stage, piece);
  };
  /** Garage step 4's rule for a copy's solids switching on where a player may stand (both of a bay's as one set): feet
   * within STEP_UP of a solid's top are lifted onto it; anyone deeper keeps the set off until they are clear. Never a
   * sideways push. Returns whether the set may switch on now. */
  function copyClear(set: (typeof pieces)[number][]) {
    const body = me.body;
    if (!body) return true;
    let lift = -Infinity,
      inside = false;
    for (const { instance, colliders } of set) {
      const root = instance.root;
      root.updateWorldMatrix(true, false);
      for (const box of colliders) {
        if (box.shape !== 'box') continue;
        const hit = [0, HEAD_OFFSET].some((up) => {
          root.worldToLocal(point.set(body.position.x, body.position.y + up, body.position.z));
          const dx = Math.max(0, Math.abs(point.x - box.at[0]) - box.half[0]);
          const dy = Math.max(0, Math.abs(point.y - box.at[1]) - box.half[1]);
          const dz = Math.max(0, Math.abs(point.z - box.at[2]) - box.half[2]);
          return dx * dx + dy * dy + dz * dz < (PLAYER_R - 0.01) ** 2;
        });
        if (!hit) continue;
        root.worldToLocal(point.set(body.position.x, body.position.y, body.position.z));
        const top = box.at[1] + box.half[1];
        if (point.y - PLAYER_R >= top - STEP_UP) lift = Math.max(lift, top);
        else inside = true;
      }
    }
    if (inside) return false;
    if (lift > -Infinity) {
      const root = set[0]!.instance.root;
      root.localToWorld(point.set(0, lift, 0));
      const y = point.y + PLAYER_R + 0.02;
      body.position.y = y;
      body.interpolatedPosition.set(body.position.x, y, body.position.z);
      body.velocity.set(body.velocity.x, Math.max(0, body.velocity.y), body.velocity.z);
    }
    return true;
  }
  /** Each bay's copy pieces (its engine's solid and plate, the flatbed), grouped once. */
  const isCopy = (part: string) => part === 'copy' || part === 'flatbed';
  const copySets = COPY_BAYS.map(({ bay }) => pieces.filter((p) => p.piece.turn === bay && isCopy(p.piece.part)));
  /** Some copy piece stands with its solid still off: settleCopies runs each frame until none does. */
  let pending = false;
  /** Each bay's copy pieces that should stand now switch their solids on, or wait while someone is in them. */
  function settleCopies() {
    if (!pending) return;
    pending = false;
    for (const set of copySets) {
      const want = set.filter((p) => shows(shown, p.piece));
      if (want.every((p) => p.enabled)) continue;
      const clear = copyClear(want);
      for (const p of want) {
        p.held = !clear;
        if (clear && !p.enabled) {
          p.instance.setEnabled(true);
          p.enabled = true;
        }
      }
      pending ||= !clear;
    }
  }
  const view = {
    /** Stand the pieces of `stage` (solid with them) and clear the rest; a change snaps. */
    show(stage: number, count: number) {
      if (stage === shown && count === serving && !rising && !restand) return;
      rising = false;
      restand = false;
      shown = stage;
      serving = count;
      occupied = new Set(bayOccupants(site, { serving }).waiting);
      for (const entry of pieces) {
        const { piece, instance, rest, batch, index } = entry;
        // Reset even an unfinished rise; unchanged pieces keep their record colliders.
        instance.root.position.y = rest.elements[13]!;
        const on = shows(stage, piece);
        const copy = isCopy(piece.part);
        if (
          on &&
          !entry.enabled &&
          (piece.part === 'waiting' || piece.part === 'open' || (piece.part === 'door' && piece.turn !== 0))
        )
          clearPlayer(entry);
        // A copy's solids switch on through settleCopies, below; off at once (nothing stands on it any more).
        if (!copy || !on) {
          instance.setEnabled(on);
          entry.enabled = on;
        } else if (!entry.enabled) pending = true;
        instance.root.visible = on;
        if (batch) {
          batch.mesh.setMatrixAt(index, instance.root.visible ? rest : matrix.makeScale(0, 0, 0));
          batch.mesh.instanceMatrix.needsUpdate = true;
        }
      }
      for (const { target } of batches.values()) {
        target.mesh.computeBoundingBox();
        target.mesh.computeBoundingSphere();
      }
      for (const [bay, e] of engines) {
        const c = copies.get(bay);
        e.root.visible = !!c;
        for (const m of e.short) m.visible = !c?.long;
        for (const m of e.long) m.visible = !!c?.long;
      }
      settleCopies();
    },
    /** Garage step 4: the copies off the table, each wearing its line's row; a change re-stands the bays. A copy's
     * door opens with it and its solids wait for anyone standing in it (settleCopies). */
    copies(list: readonly BayCopy[]) {
      const key = `${serving}|${list.map((c) => `${c.line}${+c.long}${+c.flatbed}`).join()}`;
      if (key === copiesKey) return settleCopies();
      copiesKey = key;
      copies = new Map(
        bayOccupants(site, { serving, copies: list.map((c) => c.line) }).copies.map((c) => [
          c.bay,
          list.find((l) => l.line === c.line)!,
        ]),
      );
      restand = true;
      view.show(shown, serving);
    },
    /** A join removes its covered engine and closes its built bay immediately; no roll-out or phantom train. */
    occupy(count: number) {
      if (count !== serving) view.show(shown, count);
    },
    /** Only newly built shells, doors and end walls move. Existing ruins/solids stay until the new stage settles.
     * Prefab batch matrices are visual only: no moving collider lifts a player through the roof. */
    rise(stage: number, progress: number) {
      rising = true;
      const changed = new Set<ReturnType<typeof createPrefabBatch>>();
      for (const { piece, instance, batch, index, rest } of pieces) {
        if (
          piece.part === 'ruin' ||
          piece.part === 'waiting' ||
          isCopy(piece.part) ||
          !shows(stage, piece) ||
          shows(shown, piece)
        )
          continue;
        const offset = -8 * (1 - progress);
        instance.root.position.y = rest.elements[13]! + offset;
        instance.root.visible = true;
        if (batch) {
          matrix.copy(rest);
          matrix.elements[13]! += offset;
          batch.mesh.setMatrixAt(index, matrix);
          changed.add(batch);
        }
      }
      for (const batch of changed) {
        batch.mesh.instanceMatrix.needsUpdate = true;
        batch.mesh.computeBoundingBox();
        batch.mesh.computeBoundingSphere();
      }
    },
    inspect: () => ({
      stage: shown,
      serving,
      waiting: [...occupied],
      copies: [...copies].map(([bay, c]) => ({ bay, ...c })),
      heldSolids: pieces.filter((p) => p.held).map((p) => p.piece.id),
      standing: pieces.filter((p) => p.instance.root.visible).map((p) => p.piece.id),
    }),
  };
  return view;
}
