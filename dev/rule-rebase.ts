import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allocate, host, namespace, pins, ruleConflicts, verifyPin, version } from './rule-pins.ts';

// Called from the trusted checkout by ship-branch; run the recorders in the worktree being rebased.
function rebase(wt: string, target: string) {
  process.chdir(wt);
  const git = (...args: string[]) => execFileSync('git', args, { maxBuffer: 64 << 20 });
  const line = (...args: string[]) =>
    git(...args)
      .toString()
      .trim();
  const branch = line('symbolic-ref', '--short', 'HEAD');
  if (branch === 'main' || line('status', '--porcelain')) throw new Error('expected a clean job branch');
  const active = (dir: string) => existsSync(line('rev-parse', '--git-path', dir));
  if (active('rebase-merge') || active('rebase-apply')) throw new Error('rebase already active');
  const onto = line('rev-parse', '--verify', target + '^{commit}');
  const script = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const stamp = () =>
    execFileSync(process.execPath, [script('./review-stamp.ts'), '.', '--base', onto, '--no-fetch', '--id'], {
      encoding: 'utf8',
    }).trim();
  const original = line('rev-parse', 'HEAD');
  const start = line('merge-base', original, onto);
  const candidates = [namespace, ...pins.keys()];
  const reviewed =
    line('diff', '--name-only', start, onto, '--', ...candidates) &&
    line('diff', '--name-only', start, original, '--', ...candidates) &&
    stamp();
  const handled = new Set<string>();
  const run = (...args: string[]) =>
    spawnSync('git', ['-c', 'rerere.enabled=false', '-c', 'merge.conflictStyle=diff3', 'rebase', ...args], {
      stdio: 'inherit',
      env: { ...process.env, GIT_EDITOR: 'true' },
    }).status;
  let status = run('--merge', '--no-autostash', '--no-update-refs', onto);
  try {
    while (status !== 0) {
      if (!active('rebase-merge')) throw new Error('git rebase failed');
      const files = git('diff', '--name-only', '--diff-filter=U', '-z').toString().split('\0').filter(Boolean);
      if (!files.length) {
        if (!line('diff', '--cached', '--name-only')) process.exitCode = 3;
        throw new Error(
          'rebase stopped without resolvable conflicts at ' + line('log', '-1', '--format=%s', 'REBASE_HEAD'),
        );
      }
      if (files.every((f) => f.startsWith('docs/'))) {
        for (const file of files) {
          if (spawnSync(process.execPath, [script('./codex/docs-union.ts'), file], { stdio: 'inherit' }).status !== 0) {
            process.exitCode = 4;
            throw new Error('docs union could not resolve ' + file);
          }
          git('add', '--', file);
        }
      } else {
        if (!ruleConflicts(files)) throw new Error('CODE CONFLICT: ' + files.join(', '));
        const refs = ['REBASE_HEAD^', 'HEAD', 'REBASE_HEAD'];
        const inputs = (f: string) => refs.map((ref) => git('show', ref + ':' + f));
        const [base, main, job] = inputs(namespace).map((b) => b.toString()) as [string, string, string];
        const source = allocate(base, main, job);
        const versions = [base, main, job, source].map(version);
        if (source !== main || files.includes(namespace)) {
          writeFileSync(namespace, source);
          git('add', '--', namespace);
          handled.add(namespace);
        }
        for (const [file, [flag, test]] of pins) {
          const blobs = inputs(file);
          const incoming = !blobs[0]!.equals(blobs[1]!);
          const changed = !blobs[0]!.equals(blobs[2]!);
          const recordsVersion =
            file === host ||
            (changed && ['test/fixtures/railway-golden.json', 'test/fixtures/rail-schema.json'].includes(file));
          const stale =
            files.includes(file) || (incoming && changed) || (recordsVersion && versions[3] !== versions[1]);
          if (!stale) continue;
          git('restore', '--source=HEAD', '--staged', '--worktree', '--', file);
          if (file === 'test/fixtures/railway-golden.json') {
            // Shard zero asserts the complete stage list before later shards have recorded their rows.
            const incomingGolden = JSON.parse(blobs[1]!.toString());
            incomingGolden.stages = { ...JSON.parse(blobs[2]!.toString()).stages, ...incomingGolden.stages };
            writeFileSync(file, JSON.stringify(incomingGolden));
          }
          const env = { ...process.env };
          for (const [recorder] of pins.values()) delete env[recorder];
          env[flag] = '1';
          execFileSync(
            process.execPath,
            ['--import', './test/helpers/rail-no-audit.ts', '--test', '--test-concurrency=1', test],
            { env, timeout: 900_000, stdio: 'inherit' },
          );
          verifyPin(file, [...blobs, readFileSync(file)], versions);
          git('add', '--', file);
          handled.add(file);
        }
      }
      status = run('--continue');
    }
  } catch (error) {
    if (active('rebase-merge')) git('rebase', '--abort');
    throw error;
  }
  if (reviewed && handled.size) {
    // Carry the stamp only when all other patches survived the rebase intact.
    const remaining = (from: string, to: string) => {
      const patch = git(
        'diff',
        '--binary',
        '-U0',
        from,
        to,
        '--',
        '.',
        ':(exclude)docs/**',
        ...[...handled].map((f) => ':(exclude)' + f),
      );
      return execFileSync('git', ['patch-id', '--stable'], { input: patch, encoding: 'utf8' });
    };
    if (remaining(start, original) === remaining(onto, 'HEAD')) {
      writeFileSync(
        line('rev-parse', '--git-path', 'rule-rebase-review'),
        JSON.stringify({ base: onto, head: line('rev-parse', 'HEAD'), stamp: reviewed }),
      );
    }
  }
}

try {
  if (!process.argv[2]) throw new Error('usage: rule-rebase <worktree> [local-base-ref]');
  rebase(resolve(process.argv[2]), process.argv[3] ?? 'origin/main');
} catch (error) {
  console.error('rule-rebase:', error instanceof Error ? error.message : error);
  process.exitCode ??= 2;
}
