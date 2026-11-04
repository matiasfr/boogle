// Shared ESTree traversal and UTF-16 source lines for the static readers.
import { visitorKeys, type Node } from 'oxc-parser';

export function walk(node: Node, fn: (node: Node, parent?: Node) => void, parent?: Node) {
  fn(node, parent);
  for (const key of visitorKeys[node.type] ?? []) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const n of child) if (n) walk(n as Node, fn, node);
    } else if (child) walk(child as Node, fn, node);
  }
}

export function lineOf(text: string): (node: { start: number }) => number {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\r' && text[i + 1] === '\n') i++;
    if ('\r\n\u2028\u2029'.includes(text[i]!)) starts.push(i + 1);
  }
  return ({ start }) => {
    let lo = 0;
    let hi = starts.length;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >>> 1;
      if (starts[mid]! <= start) lo = mid;
      else hi = mid;
    }
    return lo + 1;
  };
}
