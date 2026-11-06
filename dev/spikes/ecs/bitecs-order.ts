// Checks the previous report's untested inference: with bitECS 0.4.0, two worlds holding the same logical state but
// reached by different histories (a long-running peer and a late joiner) iterate in different orders and write
// different snapshot bytes.
import { addComponent, addEntity, createWorld, query, removeEntity } from 'bitecs';
import { createSnapshotSerializer } from 'bitecs/serialization';

export function bitecsOrder() {
  const make = () => {
    const Sid = { id: [] as number[] };
    const Tree = { work: [] as number[] };
    return { world: createWorld(), Sid, Tree };
  };
  const spawn = (w: ReturnType<typeof make>, id: number) => {
    const e = addEntity(w.world);
    addComponent(w.world, e, w.Sid);
    addComponent(w.world, e, w.Tree);
    w.Sid.id[e] = id;
    w.Tree.work[e] = id % 15;
  };
  // Running peer: 100 spawns, every third despawned, 50 more spawns.
  const a = make();
  for (let id = 1; id <= 100; id++) spawn(a, id);
  for (const e of [...query(a.world, [a.Tree])]) if (a.Sid.id[e]! % 3 === 0) removeEntity(a.world, e);
  for (let id = 101; id <= 150; id++) spawn(a, id);
  // Late joiner: the survivors, spawned in id order.
  const b = make();
  for (let id = 1; id <= 150; id++) if (id > 100 || id % 3) spawn(b, id);
  const order = (w: ReturnType<typeof make>) => [...query(w.world, [w.Tree])].map((e) => w.Sid.id[e]!);
  const bytes = (w: ReturnType<typeof make>) => new Uint8Array(createSnapshotSerializer(w.world, [w.Sid, w.Tree])());
  const oa = order(a),
    ob = order(b),
    ba = bytes(a),
    bb = bytes(b);
  return {
    sameSet: [...oa].sort((x, y) => x - y).join() === [...ob].sort((x, y) => x - y).join(),
    sameOrder: oa.join() === ob.join(),
    sameBytes: ba.length === bb.length && ba.every((v, k) => v === bb[k]),
    runningOrderHead: oa.slice(0, 8).join(' '),
  };
}
