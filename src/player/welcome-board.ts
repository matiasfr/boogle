// Browser-local sign text. A hall mounted after the welcome card still receives the latest rows.
let rows: readonly string[] = [];
const faces = new Set<(rows: readonly string[]) => void>();
export function publishWelcomeRows(next: readonly string[]) {
  if (rows.length === next.length && rows.every((r, k) => r === next[k])) return;
  rows = next;
  for (const face of faces) face(rows);
}
export function watchWelcomeRows(face: (rows: readonly string[]) => void) {
  faces.add(face);
  if (rows.length) face(rows);
  return () => {
    faces.delete(face);
  };
}
