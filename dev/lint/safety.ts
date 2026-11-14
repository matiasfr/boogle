// ESLint-independent safety checks. Keep import matching identical to the original gitignore-based semantics.
import path from 'node:path';
import { parseSync } from 'oxc-parser';
import { parse } from 'acorn';
import query from 'esquery';
import type { Node } from 'esquery';
import ignore from 'ignore';
import globals from 'globals';
import { analyze } from '@typescript-eslint/scope-manager';
import prefabDebt from './prefab-debt.json' with { type: 'json' };
import registrationDebt from './prefab-registrations.json' with { type: 'json' };
import { registrationKinds, registrationSites } from './prefab-registrations.ts';
import { policy, ENTITY_MESSAGE, INPUT_MESSAGE, INPUT_SELECTORS, RETIRED_RAILWAY_NAMES } from './policy.ts';
import type { ImportBan, ImportOptions, Restriction, Rule } from './policy.ts';
import {
  isCapability,
  createModuleResolver,
  moduleEdges,
  runtimeExports,
  PREFAB_DOORS,
  pureHelperEdge,
} from './prefab-boundaries.ts';
import { capabilitySpecifiers } from './prefab-specifiers.ts';
import type { PrefabDebt, ModuleResolver } from './prefab-boundaries.ts';
export type { PrefabBudget, PrefabDebt } from './prefab-boundaries.ts';
import { acquiredConstruction, loadLegacyGraph, unanalysedProjectCode } from './prefab-constructors.ts';
import type { LegacyGraph } from './prefab-constructors.ts';
const legacyGraphs = new WeakMap<PrefabDebt, LegacyGraph>();

export type Diagnostic = { file: string; line: number; rule: string; message: string };
export const customRules = new Set([
  'no-restricted-syntax',
  'no-restricted-imports',
  '@typescript-eslint/no-restricted-imports',
  'boogle/use-an-entity',
  'boogle/input-through-actions',
  'boogle/retired-railway-names',
  'boogle/colliders-from-records',
  'boogle/seats-from-records',
  'boogle/signs-from-records',
  'boogle/interactions-from-records',
  'boogle/records-are-data',
  'boogle/prefab-public-surface',
]);
const prefabRules = [
  {
    kind: 'colliders',
    rule: 'boogle/colliders-from-records',
    names: [
      'addStatic',
      'addStatics',
      'staticBody',
      'createBody',
      'slab',
      'plank',
      'buildLand',
      'staticSpheresBody',
      'drawWorksBoxes',
      'drawGreyBoxes',
    ],
  },
  {
    kind: 'seats',
    rule: 'boogle/seats-from-records',
    names: ['registerSeat'],
  },
] as const;
const defaultResolver = createModuleResolver(process.cwd());
const contentImports = new Set([
  'src/prefab/types.ts',
  'src/prefab/authoring.ts',
  'src/prefab/greybox-constants.ts',
  'src/prefab/names.ts',
  'src/constants.ts',
  'src/math-pure.ts',
  // Explicit pure layout helpers; a view beside one is never implicitly allowed.
  'src/place/layout.ts',
  'src/entities/railway/line2-path.ts',
  'src/entities/route-greybox/massing.ts',
  'src/entities/route-greybox/leg2-layout.ts',
  'src/content/levels/leg2.ts',
]);
const browserGlobals = new Set(Object.keys(globals.browser).filter((name) => !(name in globals.es2022)));
const prefabDoor = 'Declare src/content/prefabs/ and levels/ data; use src/prefab/instantiate.ts (npm run prefab:new).';
export const matches = (file: string, patterns: string[]) => patterns.some((p) => path.matchesGlob(file, p));
export const ignorePatterns = ['**/.git/**', '**/node_modules/**', ...policy[0]!.ignores!.map((p) => p + '**')];
export const ignored = (file: string) => matches(file, ignorePatterns);
function rulesFor(file: string): Record<string, Rule> {
  const rules: Record<string, Rule> = {};
  for (const block of policy)
    if ((!block.files || matches(file, block.files)) && !matches(file, block.ignores ?? []))
      Object.assign(rules, block.rules);
  return rules;
}

const selectors = new Map<string, ReturnType<typeof ignore>>();
const parsedSelectors = new Map<string, ReturnType<typeof query.parse>>();
function selectorOf(selector: string) {
  let parsed = parsedSelectors.get(selector);
  if (!parsed) {
    parsed = query.parse(selector);
    parsedSelectors.set(selector, parsed);
  }
  return parsed;
}
function importMatches(source: string, ban: ImportBan): boolean {
  if (ban.name) return source === ban.name;
  if (ban.regex) return new RegExp(ban.regex, 'iu').test(source);
  const key = JSON.stringify(ban.group);
  let matcher = selectors.get(key);
  if (!matcher) {
    matcher = ignore({ allowRelativePaths: true }).add(ban.group!);
    selectors.set(key, matcher);
  }
  return matcher.ignores(source);
}

export function lintSafety(
  code: string,
  file: string,
  debt: PrefabDebt = prefabDebt,
  resolve: ModuleResolver = defaultResolver,
  legacyGraph?: LegacyGraph,
): Diagnostic[] {
  if (ignored(file)) return [];
  const rules = rulesFor(file);
  if (file.endsWith('.ts') && !Object.keys(rules).some((r) => customRules.has(r)) && !code.includes('boogle-'))
    return [];
  const diagnostics: (Diagnostic & { start: number })[] = [];
  const lineAt = (offset: number) => code.slice(0, offset).split('\n').length;
  const report = (node: { start: number }, rule: string, message: string) =>
    diagnostics.push({ file, line: lineAt(node.start), rule, message, start: node.start });
  // Named language guard: Acorn's ecmaVersion also covers strict-module duplicate parameters and octal syntax.
  // TS's old parser accepted latest TS syntax; preserve that by applying this only to JavaScript.
  if (/\.[cm]?js$/.test(file)) {
    try {
      parse(code, {
        ecmaVersion: file.endsWith('.cjs') ? 'latest' : matches(file, ['dev/**/*.mjs']) ? 2024 : 2022,
        sourceType: file.endsWith('.cjs') ? 'commonjs' : 'module',
      });
    } catch (error) {
      const e = error as SyntaxError & { pos: number };
      report({ start: e.pos }, 'boogle/js-language', e.message);
      return diagnostics;
    }
  }
  const parsed = parseSync(file, code, {
    range: file.startsWith('src/') || !!rules['boogle/records-are-data'] || /\b(require|module)\b/.test(code),
    preserveParens: false,
  });
  if (parsed.errors.length) {
    for (const e of parsed.errors) report({ start: e.labels[0]?.start ?? 0 }, 'boogle/parse', e.message);
    return diagnostics;
  }
  const ast = parsed.program as unknown as Node;
  const select = (selector: string) => query.match(ast, selectorOf(selector), { fallback: 'iteration' });
  const edges = file.startsWith('src/') ? moduleEdges(parsed.program) : [];
  const targets = edges.map((edge) => (edge.source === undefined ? null : resolve(file, edge.source)));
  const calls = file.startsWith('src/') ? select('CallExpression') : [];
  for (const kind of ['signs', 'interactions'] as const) {
    const config = registrationKinds[kind];
    if (!file.startsWith('src/') || (config.doors as readonly string[]).includes(file)) continue;
    const sites = registrationSites(parsed.program, file, resolve, kind);
    const providers = registrationDebt[kind] as Record<
      string,
      { count: number; exports: string[]; consumers: string[] }
    >;
    const budget = providers[file];
    for (const [i, edge] of edges.entries()) {
      if (edge.erased || !targets[i]) continue;
      const provider = providers[targets[i]!];
      if (provider && !provider.consumers.includes(file))
        report(edge.node, config.rule, `New legacy registration consumer. ${prefabDoor}`);
      if (
        kind === 'signs' &&
        targets[i] === 'src/prefab/builders/greybox-label.ts' &&
        file !== 'src/prefab/instantiate.ts'
      )
        report(edge.node, config.rule, `Sign builders are reached through instantiate. ${prefabDoor}`);
    }
    if (budget) {
      if (sites.length !== budget.count)
        report(
          { start: 0 },
          config.rule,
          `Registration debt is ${sites.length}, budget ${budget.count}; lower removed debt, never grow it. ${prefabDoor}`,
        );
      const actual = runtimeExports(parsed.program);
      if (JSON.stringify(actual) !== JSON.stringify(budget.exports))
        report(
          { start: 0 },
          config.rule,
          `Registration public surfaces may only shrink; update removed exports. ${prefabDoor}`,
        );
    } else for (const site of sites) report(site, config.rule, prefabDoor);
  }
  for (const { kind, rule, names } of prefabRules) {
    const door = PREFAB_DOORS[kind].includes(file);
    if (!rules[rule] && !door) continue;
    const banned = new Set<string>(names);
    for (const [i, edge] of edges.entries())
      if (
        rules[rule] &&
        !edge.erased &&
        (targets[i] === null || (isCapability(kind, targets[i]!) && !pureHelperEdge(edge, targets[i]!)))
      )
        report(edge.node, rule, prefabDoor);
    if (file.startsWith('src/'))
      for (const node of capabilitySpecifiers(parsed.program, file, resolve, kind))
        report(node, rule, `New capability import bindings must use the prefab door. ${prefabDoor}`);
    // Retain the legacy call-count ratchet as a supplement. Module access is the structural boundary.
    for (const node of rules[rule] ? calls : []) {
      const c = node.callee!;
      const name = c.type === 'Identifier' ? c.name : (c.property?.name ?? c.property?.value);
      if (name && banned.has(name)) report(node, rule, prefabDoor);
    }
  }
  const surface = debt.doors?.[file] ?? debt.colliders[file]?.exports ?? debt.seats[file]?.exports;
  if (surface) {
    const actual = runtimeExports(parsed.program);
    for (const name of actual)
      if (name === '*' || !surface.includes(name))
        report(
          { start: 0 },
          'boogle/prefab-public-surface',
          `Unapproved runtime export ${name}: door/debt public surfaces may only shrink. ${prefabDoor}`,
        );
    for (const name of surface)
      if (!actual.includes(name))
        report(
          { start: 0 },
          'boogle/prefab-public-surface',
          `Remove stale public export ${name} from prefab debt. ${prefabDoor}`,
        );
    for (const [i, edge] of edges.entries())
      if (
        !edge.erased &&
        edge.reexport &&
        targets[i] &&
        (isCapability('colliders', targets[i]!) || isCapability('seats', targets[i]!)) &&
        !pureHelperEdge(edge, targets[i]!)
      )
        report(
          edge.node,
          'boogle/prefab-public-surface',
          `Do not re-export capability modules from a door or debt file. ${prefabDoor}`,
        );
  }
  // A require value cannot be passed around as an untracked loader. Imports with unknown targets fail closed.
  let scopes: ReturnType<typeof analyze> | undefined;
  const scopeOf = () =>
    (scopes ??= analyze(parsed.program as unknown as Parameters<typeof analyze>[0], { sourceType: 'module', lib: [] }));
  const ambient = file.startsWith('src/') ? select('[declare=true]') : [];
  const runtimeLocal = (reference: ReturnType<typeof analyze>['scopes'][number]['references'][number]) =>
    reference.resolved?.defs.some((def) => {
      const n = def.node as unknown as Node;
      const p = def.parent as unknown as Node | undefined;
      return (
        ['Variable', 'FunctionName', 'ClassName', 'Parameter', 'CatchClause', 'ImportBinding'].includes(def.type) &&
        !n.type.startsWith('TS') &&
        n.importKind !== 'type' &&
        p?.importKind !== 'type' &&
        !ambient.some((a) => a.start <= n.start && a.end >= n.end)
      );
    });
  const directRequire = new Set(calls.filter((n) => n.callee?.name === 'require').map((n) => n.callee!.start));
  if (file.startsWith('src/') && select('Identifier[name=/^(require|module)$/]').length)
    for (const s of scopeOf().scopes)
      for (const ref of s.references) {
        const node = ref.identifier as unknown as Node;
        if (
          (node.name === 'module' || (node.name === 'require' && !directRequire.has(node.start))) &&
          !runtimeLocal(ref)
        )
          for (const { rule } of prefabRules)
            if (rules[rule])
              report(node, rule, `Do not alias a module loader or use CommonJS module globals. ${prefabDoor}`);
      }
  if (rules['boogle/records-are-data']) {
    const rule = 'boogle/records-are-data';
    const message = `Content is portable data: import only prefab types/names, constants, math-pure or listed pure layout helpers. ${prefabDoor}`;
    for (const [i, edge] of edges.entries())
      if (!targets[i] || !contentImports.has(targets[i]!)) report(edge.node, rule, message);
    for (const s of scopeOf().scopes)
      for (const reference of s.references) {
        const node = reference.identifier as unknown as Node;
        if (!browserGlobals.has(node.name!) && node.name !== 'globalThis') continue;
        if (!runtimeLocal(reference))
          report(node, rule, `Content cannot use browser/DOM globals or ambient runtime shadows. ${prefabDoor}`);
      }
  }
  for (const { kind, rule } of prefabRules) {
    const budget = debt[kind][file];
    const count = debt.doorCounts?.[file]?.[kind] ?? budget?.count;
    if (count === undefined) continue;
    const actual = diagnostics.filter((d) => d.rule === rule).length;
    if (actual <= count) {
      for (let i = diagnostics.length - 1; i >= 0; i--) if (diagnostics[i]!.rule === rule) diagnostics.splice(i, 1);
      if (actual < count)
        report(
          { start: 0 },
          rule,
          `Prefab debt has ${actual} violations, budget ${count}: lower the count to ${actual} (remove a zero entry outside named doors). ${prefabDoor}`,
        );
    }
  }
  // Edge errors are never provider count waivers: even a debt file cannot acquire a new legacy API.
  if (debt.legacy && edges.length) {
    let graph = legacyGraph ?? legacyGraphs.get(debt);
    if (!graph) {
      graph = loadLegacyGraph(process.cwd(), debt);
      legacyGraphs.set(debt, graph);
    }
    for (const edge of edges) {
      const target = edge.source ? resolve(file, edge.source) : null;
      if (!edge.erased && target && unanalysedProjectCode(graph, target))
        for (const kind of ['colliders', 'seats'])
          report(
            edge.node,
            `boogle/${kind}-from-records`,
            `Unanalysed project module ${target} cannot forward construction capabilities. ${prefabDoor}`,
          );
      for (const key of acquiredConstruction(graph, file, edge, resolve)) {
        const recorded = debt.legacy[key];
        if (
          recorded !== undefined &&
          graph.constructors[key]!.importers.length + (graph.constructors[key]!.importers.includes(file) ? 0 : 1) <=
            recorded
        )
          continue;
        for (const kind of graph.constructors[key]!.kinds)
          report(
            edge.node,
            `boogle/${kind}-from-records`,
            `New legacy construction importer ${file} → ${key}; importer counts may only shrink. ${prefabDoor}`,
          );
      }
    }
  }
  // CommonJS was the legacy config's default latest/sloppy scope. The two non-native recommended rules still
  // apply there even though the strict-module parser subsumes them for .js/.mjs.
  if (file.endsWith('.cjs')) {
    for (const node of select('Literal'))
      if (/^0[0-7]+$/.test(node.raw ?? '')) report(node, 'no-octal', 'Use an explicit 0o octal literal.');
    for (const node of select('FunctionDeclaration, FunctionExpression')) {
      const names = new Set<string>();
      for (const param of node.params ?? []) {
        if (param.type !== 'Identifier' || !param.name) continue;
        if (names.has(param.name)) report(param, 'no-dupe-args', 'Duplicate parameter name.');
        names.add(param.name);
      }
    }
  }
  const syntax = rules['no-restricted-syntax'];
  if (Array.isArray(syntax)) {
    const restrictions = syntax.slice(1) as Restriction[];
    // One walk for all selectors; the selector ASTs (and esquery's compiled matchers) are reused across files.
    for (const node of select(restrictions.map((r) => r.selector).join(', ')))
      for (const restriction of restrictions)
        if (query.matches(node, selectorOf(restriction.selector)))
          report(node, 'no-restricted-syntax', restriction.message);
  }
  for (const rule of ['no-restricted-imports', '@typescript-eslint/no-restricted-imports']) {
    const setting = rules[rule];
    if (!Array.isArray(setting)) continue;
    const options = setting[1] as ImportOptions;
    // Dynamic imports and side-effect imports of *named* bans are intentionally allowed.
    const imports =
      'ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration' +
      (rule.startsWith('@typescript-eslint/') ? ', TSImportEqualsDeclaration' : '');
    for (const node of select(imports)) {
      const source = node.source?.value ?? node.moduleReference?.expression?.value;
      if (!source) continue;
      const specifiers = node.specifiers ?? [];
      const names =
        node.type === 'ExportAllDeclaration' || node.type === 'TSImportEqualsDeclaration'
          ? ['*']
          : specifiers.map((s) =>
              s.type === 'ImportDefaultSpecifier'
                ? 'default'
                : s.type === 'ImportNamespaceSpecifier'
                  ? '*'
                  : ((s.imported ?? s.local)?.name ?? (s.imported ?? s.local)?.value ?? ''),
            );
      const typeOnly =
        node.importKind === 'type' ||
        node.exportKind === 'type' ||
        (specifiers.length > 0 && specifiers.every((s) => s.importKind === 'type' || s.exportKind === 'type'));
      for (const ban of [...(options.paths ?? []), ...(options.patterns ?? [])]) {
        if (!importMatches(source, ban) || (ban.allowTypeImports && typeOnly)) continue;
        if (ban.importNames && !names.some((n) => n === '*' || ban.importNames!.includes(n))) continue;
        report(node, rule, ban.message);
      }
    }
  }
  if (rules['boogle/input-through-actions'])
    for (const node of select(INPUT_SELECTORS.join(', '))) report(node, 'boogle/input-through-actions', INPUT_MESSAGE);
  if (rules[RETIRED_RAILWAY_NAMES.rule])
    for (const node of select(RETIRED_RAILWAY_NAMES.selectors.join(', ')))
      report(node, RETIRED_RAILWAY_NAMES.rule, RETIRED_RAILWAY_NAMES.message);
  if (rules['boogle/use-an-entity'])
    for (const node of select('CallExpression')) {
      const c = node.callee!;
      if (
        (c.type === 'Identifier' && (c.name === 'onFrame' || c.name === 'addBody')) ||
        (c.type === 'MemberExpression' && c.object?.name === 'scene' && c.property?.name === 'add' && !c.computed)
      )
        report(node, 'boogle/use-an-entity', ENTITY_MESSAGE);
    }

  // Custom checks have their own namespace; Oxlint owns oxlint-disable comments and their unused reporting.
  const directives = parsed.comments.flatMap((c) => {
    const match = /^\s*boogle-(disable-next-line|disable-line|disable|enable)\s+(.+?)(?:\s+--[\s\S]*)?$/.exec(c.value);
    if (!match) return [];
    return match[2]!.split(',').map((rule) => ({
      kind: match[1],
      rule: rule.trim(),
      line: lineAt(c.start),
      end: lineAt(c.end),
      start: c.start,
      used: false,
    }));
  });
  const visible: Diagnostic[] = diagnostics.filter((d) => {
    // These doors have an explicit file debt list; a comment is not another exemption mechanism.
    if (
      [
        'boogle/colliders-from-records',
        'boogle/seats-from-records',
        'boogle/signs-from-records',
        'boogle/interactions-from-records',
        'boogle/records-are-data',
        'boogle/prefab-public-surface',
      ].includes(d.rule)
    )
      return true;
    let active: (typeof directives)[number] | undefined;
    for (const directive of directives) {
      if (directive.rule !== d.rule) continue;
      if (directive.kind === 'disable-line' && directive.line !== directive.end) continue;
      if (directive.kind === 'disable-next-line' && directive.end + 1 === d.line) active = directive;
      if (directive.kind === 'disable-line' && directive.line <= d.line && directive.end >= d.line) active = directive;
      if (directive.kind === 'disable' && directive.start <= d.start) active = directive;
      if (directive.kind === 'enable' && directive.start <= d.start) active = undefined;
    }
    if (active) active.used = true;
    return !active;
  });
  for (const d of directives)
    if (d.kind === 'disable-line' && d.line !== d.end)
      visible.push({
        file,
        line: d.line,
        rule: 'boogle/invalid-disable',
        message: 'disable-line must fit on one line.',
      });
    else if (d.kind !== 'enable' && !d.used)
      visible.push({ file, line: d.line, rule: 'boogle/unused-disable', message: `Unused boogle disable: ${d.rule}` });
  return visible;
}
