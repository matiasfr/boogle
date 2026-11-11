// ESLint-independent safety checks. Keep import matching identical to the original gitignore-based semantics.
import path from 'node:path';
import { parseSync } from 'oxc-parser';
import { parse } from 'acorn';
import query from 'esquery';
import type { Node } from 'esquery';
import ignore from 'ignore';
import { policy, ENTITY_MESSAGE, INPUT_MESSAGE, INPUT_SELECTORS, LEGACY_DOORS } from './policy.ts';
import type { ImportBan, ImportOptions, Restriction, Rule } from './policy.ts';

export type Diagnostic = { file: string; line: number; rule: string; message: string };
export const customRules = new Set([
  'no-restricted-syntax',
  'no-restricted-imports',
  '@typescript-eslint/no-restricted-imports',
  'boogle/use-an-entity',
  'boogle/input-through-actions',
  'boogle/inspect-legacy',
  'boogle/railway-read',
]);
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

export function lintSafety(code: string, file: string): Diagnostic[] {
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
  const parsed = parseSync(file, code);
  if (parsed.errors.length) {
    for (const e of parsed.errors) report({ start: e.labels[0]?.start ?? 0 }, 'boogle/parse', e.message);
    return diagnostics;
  }
  const ast = parsed.program as unknown as Node;
  const select = (selector: string) => query.match(ast, selectorOf(selector), { fallback: 'iteration' });
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
  for (const door of LEGACY_DOORS)
    if (rules[door.rule]) for (const node of select(door.selectors.join(', '))) report(node, door.rule, door.message);
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
