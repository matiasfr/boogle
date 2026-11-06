// The view half every option shares: one InstancedMesh per kind, a slot per entity id, written from state. Options
// differ only in how they find what changed. Real three.js objects, never rendered (CPU cost of setMatrixAt only).
import { BoxGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3, Euler } from 'three';
import { FELL_WORK, ROCK_STROKES, type PileRow, type RockRow, type TreeRow } from './schema.ts';

const CAP = 8192;
const p = new Vector3(),
  q = new Quaternion(),
  s = new Vector3(),
  e = new Euler(),
  m = new Matrix4();
const ZERO = new Matrix4().makeScale(0, 0, 0);

export class KindView {
  readonly mesh = new InstancedMesh(new BoxGeometry(), new MeshBasicMaterial(), CAP);
  private slot = new Map<number, number>();
  private free: number[] = [];
  private used = 0;
  write(id: number, matrix: Matrix4): void {
    let k = this.slot.get(id);
    if (k === undefined) {
      k = this.free.pop() ?? this.used++;
      this.slot.set(id, k);
    }
    this.mesh.setMatrixAt(k, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  remove(id: number): void {
    const k = this.slot.get(id);
    if (k === undefined) return;
    this.slot.delete(id);
    this.free.push(k);
    this.mesh.setMatrixAt(k, ZERO);
  }
  clear(): void {
    this.slot.clear();
    this.free.length = 0;
    this.used = 0;
    this.mesh.instanceMatrix.array.fill(0);
  }
  get size(): number {
    return this.slot.size;
  }
}

export function treeMatrix(t: Readonly<TreeRow>): Matrix4 {
  e.set(t.fell ? Math.PI / 2 : (t.work / FELL_WORK) * 0.1, 0, 0);
  return m.compose(p.set(t.x, 0, t.z), q.setFromEuler(e), s.set(t.size * 0.4, t.size * 4, t.size * 0.4));
}
export function rockMatrix(r: Readonly<RockRow>): Matrix4 {
  const left = 1 - (r.strokes / ROCK_STROKES) * 0.5;
  return m.compose(p.set(r.x + r.shake * 0.01, 0, r.z), q.identity(), s.setScalar(r.r * left));
}
export function pileMatrix(pl: Readonly<PileRow>): Matrix4 {
  return m.compose(p.set(pl.i * 2 + 1, 0, pl.j * 2 + 1), q.identity(), s.set(1.5, Math.min(4, pl.n / 16), 1.5));
}
