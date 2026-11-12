// Prototype dependencies for registry JSON. Advisory except for archived code or an unlisted literal flag.
// No status is inferred: only the owner's card can say answered, and archiving remains an owner decision.
import path from 'node:path';
import { parseSync, type Node } from 'oxc-parser';
import { lineOf, walk } from '../scan/parse.ts';
import type { Proto } from '../../protos/protos.ts';
import type { Source } from './scan.ts';

type Ref = { file: string; line: number; target: string; kind: 'value' | 'type' | 'dynamic' };
type Flag = { file: string; line: number; id: string };

// These cards deliberately have no dedicated protoOn loader. They are reported, never treated as missing code.
const EXEMPTIONS: Record<string, string> = {
  babble: 'Home link: voice is in the game.',
  build: 'Home link: construction is in the game.',
  uisfx: 'Home link: HUD audio is in the game.',
  hero: 'Home link: character is in the game.',
  layout: 'Layout tool: loaded by layout=, not protoOn.',
  onehand: 'Merged record: one held thing is in the game.',
  ride: 'Merged record: the wagon uses platform carry.',
  arrive: 'Merged record: returning-player arrival is in the game.',
  place: 'The current game: the default entry, no prototype loader.',
};

export function prototypeReport(files: Source[], cards: Proto[]) {
  const started = performance.now();
  const refs: Ref[] = [];
  const flags: Flag[] = [];
  const paths = new Set(files.map((f) => f.path));
  const resolve = (file: string, spec: string) =>
    spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)) : spec;
  for (const { path: file, text } of files) {
    // Cheap over-inclusive filter; the AST below decides whether a match really is an import, including types.
    const imports = [...text.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"\n]+)['"]/g)];
    const relevant = (target: string) =>
      target.startsWith('src/proto/') || /src\/debug\/(look-lab|haul-kit)\.ts$/.test(target);
    if (!text.includes('protoOn') && !imports.some((i) => relevant(resolve(file, i[1]!)))) continue;
    const sf = parseSync(file, text).program;
    const line = lineOf(text);
    const add = (n: Node, spec: Node | null, kind: Ref['kind']) => {
      if (spec?.type !== 'Literal' || typeof spec.value !== 'string') return;
      const target = resolve(file, spec.value);
      refs.push({ file, line: line(n), target, kind });
    };
    walk(sf, (n, parent) => {
      if (n.type === 'ImportDeclaration') {
        const onlyTypes =
          n.importKind === 'type' ||
          (n.specifiers.length > 0 &&
            n.specifiers.every((s) => s.type === 'ImportSpecifier' && s.importKind === 'type'));
        add(n, n.source, onlyTypes ? 'type' : 'value');
      } else if (n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration')
        add(n, n.source, n.exportKind === 'type' ? 'type' : 'value');
      else if (n.type === 'TSImportType') add(parent?.type === 'TSTypeQuery' ? parent : n, n.source, 'type');
      else if (n.type === 'ImportExpression') add(n, n.source, 'dynamic');
      else if (n.type === 'CallExpression') {
        if (n.callee.type === 'Identifier' && n.callee.name === 'protoOn') {
          const id = n.arguments[0];
          if (id?.type === 'Literal' && typeof id.value === 'string') flags.push({ file, line: line(n), id: id.value });
        }
      }
    });
  }
  const errors: string[] = [];
  const ids = new Set(cards.map((p) => p.id));
  for (const f of flags)
    if (!ids.has(f.id)) errors.push(`${f.file}:${f.line}: literal protoOn('${f.id}') has no prototype card`);
  const prototypes = cards.map((card) => {
    const own = (file: string) => file.startsWith(`src/proto/${card.id}/`) || file === `src/proto/${card.id}.ts`;
    const calls = flags.filter((f) => f.id === card.id);
    const loaderFiles = new Set(calls.filter((f) => f.file.startsWith('src/features/')).map((f) => f.file));
    const loaders = refs.filter((r) => loaderFiles.has(r.file) && r.kind === 'dynamic');
    const extraRoots = new Set(loaders.filter((r) => !r.target.startsWith('src/proto/')).map((r) => r.target));
    const implementation = [...paths].filter(
      (f) => own(f) || extraRoots.has(f) || f === `src/features/proto-${card.id}.ts`,
    );
    const dependents = refs.filter((r) => (own(r.target) || extraRoots.has(r.target)) && !own(r.file));
    const experiments = [
      ...new Set(dependents.map((r) => r.file.match(/^src\/proto\/([^/]+)\//)?.[1]).filter(Boolean)),
    ];
    if (card.archived && implementation.length)
      errors.push(`${card.id}: archived as ${card.archived}, but code remains: ${implementation.join(', ')}`);
    return {
      card: card.id,
      status: card.status,
      archived: card.archived ?? null,
      selector: card.url,
      merged: card.merged ?? null,
      exemption: EXEMPTIONS[card.id] ?? null,
      loaders,
      coreSeams: calls.filter((f) => !own(f.file) && !loaders.some((r) => r.file === f.file)),
      implementation,
      dependents,
      experimentDependents: experiments,
      ownerReview:
        card.status === 'answered' && !card.archived && experiments.length === 0
          ? 'No other experiment imports found. Owner review only; this does not authorize archiving.'
          : null,
    };
  });
  return {
    prototypes,
    errors,
    uncertainty:
      'Literal imports and protoOn calls only; computed loaders and browser-eval imports may need manual review.',
    elapsedMs: Number((performance.now() - started).toFixed(2)),
  };
}
