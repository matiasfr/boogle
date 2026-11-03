// One Markdown section reader for map, route validation and measured reading costs.
import fs from 'node:fs';
import path from 'node:path';

export function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
    .replace(/\s/g, '-');
}

export function readSection(root: string, reference: string): { text: string; start: number; end: number } {
  const [file, wanted] = reference.split('#');
  const text = fs.readFileSync(path.join(root, file!), 'utf8');
  if (!wanted) return { text, start: 1, end: text.split('\n').length };
  const lines = text.split('\n');
  const headings: { line: number; depth: number; title: string }[] = [];
  let fence = '';
  lines.forEach((line, i) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = '';
      return;
    }
    if (fence) return;
    const match = /^(#{1,6}) (.+?)(?: +#+)?$/.exec(line);
    if (match) headings.push({ line: i, depth: match[1]!.length, title: match[2]! });
  });
  const matches = headings.filter((h) => h.title === wanted || anchor(h.title) === wanted);
  if (matches.length !== 1) throw new Error(`${reference}: expected one heading, found ${matches.length}`);
  const heading = matches[0]!;
  const end = headings.find((h) => h.line > heading.line && h.depth <= heading.depth)?.line ?? lines.length;
  return { text: lines.slice(heading.line, end).join('\n'), start: heading.line + 1, end };
}
