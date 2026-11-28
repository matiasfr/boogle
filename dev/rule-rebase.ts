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
  const branch = line('branch', '--show-current');
  if (branch === 'main' || line('status', '--porcelain', '--untracked-files=no'))
    throw new Error('expected a clean worktree outside the local main branch');
  const active = (dir: string) => existsSync(line('rev-parse', '--git-path', dir));
  if (active('rebase-merge') || active('rebase-apply')) throw new Error('rebase already active');
  const onto = line('rev-parse', '--verify', target + '^{commit}');
  const stamp = () =>
    execFileSync(
      process.execPath,
      [fileURLToPath(new URL('./review-stamp.ts', import.meta.url)), '.', '--base', onto, '--no-fetch', '--id'],
      {
        encoding: 'utf8',
      },
    ).trim();
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
        if (!line('diff', '--cached', '--name-only')) {
          process.exitCode = 3;
          throw new Error('EMPTY COMMIT at rebase: ' + line('log', '-1', '--format=%s', 'REBASE_HEAD'));
        }
        throw new Error(
          'rebase stopped without resolvable conflicts at ' + line('log', '-1', '--format=%s', 'REBASE_HEAD'),
        );
      }
      if (files.every((f) => f.startsWith('docs/'))) {
        for (const file of files) {
          const union = spawnSync(
            process.execPath,
            [fileURLToPath(new URL('./codex/docs-union.ts', import.meta.url)), file],
            { stdio: 'inherit' },
          );
          if (union.status !== 0) {
            process.exitCode = 4;
            if (union.status === 5)
              throw new Error(
                "Nothing shipped, rebase aborted: redo this commit's edit to that row on fresh origin/main",
              );
            throw new Error('MARKERS LEFT in ' + file + ' after the docs union');
          }
          git('add', '--', file);
        }
      } else {
        if (!ruleConflicts(files)) throw new Error('CODE CONFLICT: ' + files.join(', '));
        const refs = ['REBASE_HEAD^', 'HEAD', 'REBASE_HEAD'];
        for (const ref of refs) {
          const entries = line('ls-tree', ref, '--', ...candidates).split('\n');
          if (entries.length !== candidates.length || entries.some((e) => !e.startsWith('100644 blob ')))
            throw new Error('automatic pin resolution requires existing regular files on all three sides');
        }
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
    try {
      if (remaining(start, original) !== remaining(onto, 'HEAD'))
        throw new Error('the rebase changed a patch outside the verified pins and namespace');
      writeFileSync(
        line('rev-parse', '--git-path', 'rule-rebase-review'),
        JSON.stringify({ base: onto, head: line('rev-parse', 'HEAD'), stamp: reviewed }),
      );
    } catch (error) {
      git('reset', '--keep', original);
      throw error;
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
